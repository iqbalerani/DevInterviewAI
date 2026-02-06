import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { SessionEvaluation } from '../models/Evaluation.js';
import { Transcript } from '../models/Transcript.js';
import { Session } from '../models/Session.js';

const router = express.Router();

// Evaluate interview session
router.post('/:sessionId/evaluate', async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Check if evaluation already exists
    let evaluation = await SessionEvaluation.findOne({ sessionId });
    if (evaluation) {
      return res.json({ success: true, evaluation });
    }

    // Get session and transcripts
    const session = await Session.findOne({ id: sessionId });
    const transcripts = await Transcript.find({ sessionId }).sort({ timestamp: 1 });

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    // Call Gemini for evaluation
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `
      Evaluate the candidate's performance based on the following session data.

      Questions: ${JSON.stringify(session.questions)}
      Transcripts: ${JSON.stringify(transcripts.slice(0, 100))} // Limit to prevent token overflow

      Provide scores (0-100) for technical knowledge, coding ability, communication, and problem-solving.
      Also provide a summary, strengths, and areas for improvement.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
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

    const result = JSON.parse(response.text);

    // Save evaluation
    evaluation = await SessionEvaluation.create({
      sessionId,
      scores: {
        technical: result.technical,
        coding: result.coding,
        communication: result.communication,
        problemSolving: result.problemSolving
      },
      summary: result.summary,
      strengths: result.strengths,
      weaknesses: result.weaknesses
    });

    res.json({ success: true, evaluation });
  } catch (error) {
    console.error('Error evaluating session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get evaluation for a session
router.get('/:sessionId', async (req, res) => {
  try {
    const evaluation = await SessionEvaluation.findOne({ sessionId: req.params.sessionId });

    if (!evaluation) {
      return res.status(404).json({ success: false, error: 'Evaluation not found' });
    }

    res.json({ success: true, evaluation });
  } catch (error) {
    console.error('Error fetching evaluation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
