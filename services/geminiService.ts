
import { GoogleGenAI, Type } from "@google/genai";
import { Question } from "../types";

/**
 * Utility to extract JSON from model output even if it contains markdown or leading/trailing text.
 */
function extractJson(text: string): any {
  try {
    const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (!jsonMatch) throw new Error("No JSON structure found in response");
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error("JSON Extraction Error:", e, "Raw text:", text);
    throw e;
  }
}

export const geminiService = {
  /**
   * Calculates a match score and brief analysis between a resume and a JD.
   */
  async calculateMatchScore(resume: string, jd: string) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      Evaluate how well the following resume matches the provided job description for a Software Engineering role.
      Provide a match score (0-100) and three concise key findings (strengths or gaps).

      Resume: ${resume.substring(0, 3000)}
      Job Description: ${jd.substring(0, 3000)}
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              findings: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendation: { type: Type.STRING }
            },
            required: ["score", "findings", "recommendation"]
          }
        }
      });
      return extractJson(response.text);
    } catch (e) {
      console.error("Match Score Error:", e);
      return { score: 0, findings: ["Analysis failed"], recommendation: "Unable to parse resume match." };
    }
  },

  /**
   * Parses resume and job description to create a personalized interview plan.
   * Upgraded to gemini-3-pro-preview for complex reasoning and schema compliance.
   */
  async generateInterviewPlan(resume: string, jd: string): Promise<Question[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const safeResume = resume.substring(0, 2500);
    const safeJd = jd.substring(0, 2500);

    const prompt = `
      Create a tailored technical interview plan for this candidate.
      Generate exactly 5 questions:
      - 1 Behavioral (soft skills/experience)
      - 2 Technical Conceptual (architecture, language specifics, systems)
      - 2 Coding Challenges (algorithms or problem-solving)
      
      Resume: ${safeResume}
      JD: ${safeJd}
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: prompt,
        config: {
          systemInstruction: "You are an expert interviewer. Respond ONLY with a valid JSON array of question objects. Keep descriptions concise to avoid truncation.",
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
                expectedTopics: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["id", "text", "type", "difficulty"]
            }
          }
        }
      });

      return extractJson(response.text);
    } catch (e) {
      console.error("Plan Generation Error:", e);
      // Fallback plan if model fails or truncates
      return [
        { id: '1', text: 'Tell me about a difficult technical challenge you solved recently.', type: 'behavioral', difficulty: 'mid' },
        { id: '2', text: 'Explain the concept of Big O notation and why it matters.', type: 'technical', difficulty: 'mid' },
        { id: '3', text: 'What is the difference between a process and a thread in a modern OS?', type: 'technical', difficulty: 'mid' },
        { id: '4', text: 'Write a function to find the first non-repeating character in a string.', type: 'coding', difficulty: 'mid' },
        { id: '5', text: 'Implement a function to reverse a linked list.', type: 'coding', difficulty: 'mid' }
      ];
    }
  },

  /**
   * Performs deep analysis of a resume to identify skill gaps and strengths.
   */
  async analyzeResume(resume: string) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Analyze this developer resume. Identify key strengths, critical skill gaps for a modern tech stack, and suggest 3 focus areas for improvement.
    
    Resume: ${resume.substring(0, 4000)}`;

    try {
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
      return extractJson(response.text);
    } catch (e) {
      console.error("Resume Analysis Error:", e);
      return { strengths: [], gaps: [], suggestions: [], seniorityEstimate: "Unknown" };
    }
  },

  /**
   * Evaluates the candidate's performance after the interview.
   */
  async evaluateInterview(session: any) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      Evaluate the candidate's performance based on the following session transcripts and coding tasks.
      Session: ${JSON.stringify(session).substring(0, 8000)}
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
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
      return extractJson(response.text);
    } catch (e) {
      console.error("Evaluation Error:", e);
      return { 
        technical: 50, coding: 50, communication: 50, problemSolving: 50, 
        summary: "Analysis failed due to model limits.", strengths: [], weaknesses: [] 
      };
    }
  },

  /**
   * Generates a skill radar chart or certificate image.
   */
  async generateSkillChart(scores: any): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `A futuristic skill radar chart for a software engineer. Scores: Tech=${scores.technical}, Code=${scores.coding}, Comm=${scores.communication}, Logic=${scores.problemSolving}. Dark mode aesthetic, glowing cyan and magenta accents.`;
    
    try {
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
    } catch (e) {
      console.error("Image Generation Error:", e);
    }
    return "";
  }
};
