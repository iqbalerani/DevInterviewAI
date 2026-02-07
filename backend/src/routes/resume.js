import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';

const router = express.Router();

/**
 * Utility to extract JSON from model output
 */
function extractJson(text) {
  try {
    const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (!jsonMatch) throw new Error("No JSON structure found in response");
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error("JSON Extraction Error:", e, "Raw text:", text);
    throw e;
  }
}

/**
 * Calculate match score between resume and job description
 */
router.post('/match-score', async (req, res) => {
  try {
    const { resume, jd } = req.body;

    if (!resume || !jd) {
      return res.status(400).json({
        success: false,
        error: 'Resume and job description are required'
      });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `
      Evaluate how well the following resume matches the provided job description for a Software Engineering role.
      Provide a match score (0-100) and three concise key findings (strengths or gaps).

      Resume: ${resume.substring(0, 3000)}
      Job Description: ${jd.substring(0, 3000)}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            findings: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendation: { type: Type.STRING }
          },
          required: ['score', 'findings', 'recommendation']
        }
      }
    });

    const result = extractJson(response.text);
    res.json({ success: true, data: result });

  } catch (error) {
    console.error('Match Score Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: { score: 0, findings: ['Analysis failed'], recommendation: 'Unable to parse resume match.' }
    });
  }
});

/**
 * Generate personalized interview plan
 */
router.post('/generate-plan', async (req, res) => {
  try {
    const { resume, jd, difficulty } = req.body;

    if (!resume || !jd) {
      return res.status(400).json({
        success: false,
        error: 'Resume and job description are required'
      });
    }

    const selectedDifficulty = difficulty || 'mid';
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const safeResume = resume.substring(0, 2500);
    const safeJd = jd.substring(0, 2500);

    const prompt = `
      Create a tailored technical interview plan for this candidate.
      Generate exactly 5 questions:
      - 1 Behavioral (soft skills/experience)
      - 3 Technical Conceptual (architecture, language specifics, systems)
      - 1 Coding Challenge (algorithms or problem-solving)

      All questions MUST be at the "${selectedDifficulty}" seniority level.
      - junior: fundamental concepts, basic syntax, straightforward problems
      - mid: intermediate design patterns, moderate algorithms, system tradeoffs
      - senior: advanced architecture, complex algorithms, distributed systems, leadership scenarios

      For each coding question, include 3-5 test cases with input/expected output pairs covering normal and edge cases.

      Resume: ${safeResume}
      JD: ${safeJd}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: 'You are an expert interviewer. Respond ONLY with a valid JSON array of question objects. Keep descriptions concise to avoid truncation.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              text: { type: Type.STRING },
              type: { type: Type.STRING, description: 'behavioral, technical, or coding' },
              difficulty: { type: Type.STRING, description: `Must be "${selectedDifficulty}"` },
              expectedTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
              testCases: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    input: { type: Type.STRING },
                    expectedOutput: { type: Type.STRING }
                  },
                  required: ['input', 'expectedOutput']
                }
              }
            },
            required: ['id', 'text', 'type', 'difficulty']
          }
        }
      }
    });

    const questions = extractJson(response.text);

    // Fallback if generation fails
    if (!questions || questions.length < 5) {
      throw new Error(`Generated plan has ${questions?.length ?? 0} questions, expected 5`);
    }

    res.json({ success: true, questions });

  } catch (error) {
    console.error('Plan Generation Error:', error);

    // Return fallback questions using the requested difficulty
    const fallbackDifficulty = req.body.difficulty || 'mid';
    const fallbackQuestions = [
      { id: '1', text: 'Tell me about a difficult technical challenge you solved recently.', type: 'behavioral', difficulty: fallbackDifficulty },
      { id: '2', text: 'Explain the concept of Big O notation and why it matters.', type: 'technical', difficulty: fallbackDifficulty },
      { id: '3', text: 'What is the difference between a process and a thread in a modern OS?', type: 'technical', difficulty: fallbackDifficulty },
      { id: '4', text: 'Describe how you would design a caching layer for a high-traffic web application.', type: 'technical', difficulty: fallbackDifficulty },
      { id: '5', text: 'Write a function to find the first non-repeating character in a string.', type: 'coding', difficulty: fallbackDifficulty, testCases: [
        { input: '"aabcbd"', expectedOutput: '"c"' },
        { input: '"abcabc"', expectedOutput: 'null or None' },
        { input: '"a"', expectedOutput: '"a"' }
      ]}
    ];

    res.json({
      success: true,
      questions: fallbackQuestions,
      fallback: true,
      error: error.message
    });
  }
});

/**
 * Analyze resume for skill gaps and strengths
 */
router.post('/analyze', async (req, res) => {
  try {
    const { resume } = req.body;

    if (!resume) {
      return res.status(400).json({
        success: false,
        error: 'Resume is required'
      });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `Analyze this developer resume. Identify key strengths, critical skill gaps for a modern tech stack, and suggest 3 focus areas for improvement.

    Resume: ${resume.substring(0, 4000)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
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

    const result = extractJson(response.text);
    res.json({ success: true, data: result });

  } catch (error) {
    console.error('Resume Analysis Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: { strengths: [], gaps: [], suggestions: [], seniorityEstimate: 'Unknown' }
    });
  }
});

export default router;
