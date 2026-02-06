import { GoogleGenAI, Type } from '@google/genai';
import { QuestionEvaluation } from '../models/Evaluation.js';

export class EvaluationAgent {
  constructor() {
    this.ai = null;
  }

  getAI() {
    if (!this.ai) {
      this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return this.ai;
  }

  async evaluateResponse(sessionId, question, userTranscript) {
    try {
      const expectedTopics = question.expectedTopics ? question.expectedTopics.join(', ') : 'N/A';

      const prompt = `
Evaluate this interview response:

Question: "${question.text}"
Type: ${question.type}
Difficulty: ${question.difficulty}
Expected Topics: ${expectedTopics}

Candidate Response: "${userTranscript}"

Provide a detailed evaluation with:
1. Score (0-100): Based on accuracy, completeness, and clarity
2. Key strengths (2-3 points): What the candidate did well
3. Areas for improvement (2-3 points): What needs work
4. Brief feedback (1-2 sentences): Constructive summary
      `;

      const response = await this.getAI().models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
              feedback: { type: Type.STRING }
            },
            required: ['score', 'strengths', 'improvements', 'feedback']
          }
        }
      });

      const result = JSON.parse(response.text);

      // Save to database
      const evaluation = await QuestionEvaluation.findOneAndUpdate(
        { sessionId, questionId: question.id },
        {
          sessionId,
          questionId: question.id,
          score: result.score,
          strengths: result.strengths,
          improvements: result.improvements,
          feedback: result.feedback,
          userTranscript,
          timestamp: Date.now()
        },
        { upsert: true, new: true }
      );

      console.log(`✅ Evaluation complete for question ${question.id}: ${result.score}/100`);

      return evaluation;

    } catch (error) {
      console.error('Evaluation error:', error);

      // Fallback evaluation
      const fallbackEvaluation = await QuestionEvaluation.findOneAndUpdate(
        { sessionId, questionId: question.id },
        {
          sessionId,
          questionId: question.id,
          score: 50,
          strengths: ['Response provided'],
          improvements: ['Evaluation failed - manual review recommended'],
          feedback: 'Automatic evaluation unavailable',
          userTranscript,
          timestamp: Date.now()
        },
        { upsert: true, new: true }
      );

      return fallbackEvaluation;
    }
  }
}

export const evaluationAgent = new EvaluationAgent();
