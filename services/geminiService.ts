
import { GoogleGenAI, Type } from "@google/genai";
import { Question } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const geminiService = {
  /**
   * Parses resume and job description to create a personalized interview plan.
   */
  async generateInterviewPlan(resume: string, jd: string): Promise<Question[]> {
    const prompt = `
      You are an expert technical recruiter. Based on the provided resume and job description, create a balanced technical interview plan.
      Include:
      - 2 behavioral questions
      - 2 technical conceptual questions
      - 2 coding challenges (appropriate for the detected seniority level)

      Resume: ${resume}
      JD: ${jd}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              text: { type: Type.STRING },
              type: { type: Type.STRING, description: "behavioral, technical, or coding" },
              difficulty: { type: Type.STRING, description: "junior, mid, or senior" },
              expectedTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
              testCases: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT, 
                  properties: { 
                    input: { type: Type.STRING }, 
                    expectedOutput: { type: Type.STRING } 
                  } 
                } 
              }
            },
            required: ["id", "text", "type", "difficulty"]
          }
        }
      }
    });

    try {
      return JSON.parse(response.text);
    } catch (e) {
      console.error("Failed to parse plan:", e);
      return [];
    }
  },

  /**
   * Performs deep analysis of a resume to identify skill gaps and strengths.
   */
  async analyzeResume(resume: string) {
    const prompt = `Analyze this developer resume. Identify key strengths, critical skill gaps for a modern tech stack, and suggest 3 focus areas for improvement.
    
    Resume: ${resume}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            seniorityEstimate: { type: Type.STRING }
          }
        }
      }
    });

    return JSON.parse(response.text);
  },

  /**
   * Evaluates the candidate's performance after the interview.
   */
  async evaluateInterview(session: any) {
    const prompt = `
      Evaluate the following interview session transcripts and code.
      Return detailed scores (0-100) and feedback for:
      - Technical Knowledge
      - Coding Ability
      - Communication
      - Problem Solving

      Session Data: ${JSON.stringify(session)}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            technical: { type: Type.NUMBER },
            coding: { type: Type.NUMBER },
            communication: { type: Type.NUMBER },
            problemSolving: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });

    return JSON.parse(response.text);
  },

  /**
   * Generates a skill radar chart or certificate image.
   */
  async generateSkillChart(scores: any): Promise<string> {
    const prompt = `A professional skill radar chart showing levels: Technical (${scores.technical}), Coding (${scores.coding}), Communication (${scores.communication}), Problem Solving (${scores.problemSolving}). High contrast, dark theme, neon blue and purple colors.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return "";
  }
};
