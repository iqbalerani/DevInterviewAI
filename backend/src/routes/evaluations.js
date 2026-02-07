import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { SessionEvaluation, QuestionEvaluation } from '../models/Evaluation.js';
import { Transcript } from '../models/Transcript.js';
import { Session } from '../models/Session.js';

const router = express.Router();

// Evaluate interview session
router.post('/:sessionId/evaluate', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const force = req.query.force === 'true';

    // Check if evaluation already exists
    if (!force) {
      const existing = await SessionEvaluation.findOne({ sessionId });
      if (existing) {
        const questionEvaluations = await QuestionEvaluation.find({ sessionId }).sort({ timestamp: 1 });
        return res.json({ success: true, evaluation: { ...existing.toObject(), questionEvaluations } });
      }
    }

    // If force, delete existing evaluations
    if (force) {
      await SessionEvaluation.deleteMany({ sessionId });
      await QuestionEvaluation.deleteMany({ sessionId });
    }

    // Get session and transcripts
    const session = await Session.findOne({ id: sessionId });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    // Ownership check
    if (req.user.role !== 'admin' && session.userId && session.userId !== req.user.userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const transcripts = await Transcript.find({ sessionId }).sort({ timestamp: 1 });

    const questions = session.questions || [];

    // Build numbered question list
    const questionList = questions.map((q, i) =>
      `${i + 1}. [ID: ${q.id}] (${q.type}, ${q.difficulty}) "${q.text}"${q.expectedTopics?.length ? ` — Expected topics: ${q.expectedTopics.join(', ')}` : ''}`
    ).join('\n');

    // Build transcript text with speaker labels
    const transcriptText = transcripts.slice(0, 150).map(t =>
      `[${t.speaker === 'user' ? 'USER' : 'AI'}]: ${t.text}`
    ).join('\n');

    // Build submitted code section
    const codingQuestions = questions.filter(q => q.submittedCode && q.submittedCode.trim());
    const submittedCodeText = codingQuestions.length > 0
      ? codingQuestions.map(q =>
          `### Question: "${q.text}"\nLanguage: ${q.codeLanguage || 'python'}\n\`\`\`${q.codeLanguage || 'python'}\n${q.submittedCode}\n\`\`\``
        ).join('\n\n')
      : '';

    // Call Gemini for evaluation
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `You are an expert technical interviewer evaluator. Analyze this interview session thoroughly.

## Scoring Rubric
- 0-30: Needs Improvement — Major gaps, incorrect answers, unclear communication
- 31-60: Developing — Some correct concepts but significant gaps
- 61-80: Proficient — Solid understanding with minor gaps
- 81-100: Excellent — Deep understanding, clear articulation, strong examples

## Session Context
Job Description: ${session.jobDescription || 'Software Engineering Role'}
Difficulty Level: ${questions[0]?.difficulty || 'mid'}

## Questions Asked
${questionList || 'No structured questions available'}

## Interview Transcript (chronological)
${transcriptText || 'No transcript data available'}

${submittedCodeText ? `## Submitted Code\nEvaluate for correctness, efficiency, code style, and edge case handling.\n\n${submittedCodeText}\n` : ''}
## Instructions
If submitted code is available, heavily weight the coding score on actual code quality and correctness.
1. Score each of the 4 categories (0-100) using the rubric above
2. For EACH question listed above, evaluate how well the candidate answered it — provide a score (0-100), detailed feedback (2-3 sentences), and list the topics the candidate covered
3. Write a 2-3 sentence overall summary of the candidate's performance
4. List 3-5 key strengths demonstrated during the interview
5. List 3-5 areas for improvement with specific suggestions
6. Recommend 3-5 specific learning topics based on identified gaps`;

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
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            questionEvaluations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  questionId: { type: Type.STRING },
                  questionText: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                  feedback: { type: Type.STRING },
                  topicsCovered: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ['questionId', 'questionText', 'score', 'feedback', 'topicsCovered']
              }
            },
            recommendedTopics: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });

    const result = JSON.parse(response.text);

    // Compute overall score
    const overallScore = Math.round(
      (result.technical + result.coding + result.communication + result.problemSolving) / 4
    );

    // Save session evaluation with all fields populated
    const evaluation = await SessionEvaluation.create({
      sessionId,
      overallScore,
      scores: {
        technical: result.technical,
        coding: result.coding,
        communication: result.communication,
        problemSolving: result.problemSolving
      },
      summary: result.summary,
      strengths: result.strengths,
      weaknesses: result.weaknesses,
      improvements: result.weaknesses,
      learningPath: result.recommendedTopics,
      skillGaps: result.weaknesses
    });

    // Bulk-upsert QuestionEvaluation documents
    let questionEvaluations = [];
    if (result.questionEvaluations && result.questionEvaluations.length > 0) {
      const bulkOps = result.questionEvaluations.map((qe, index) => ({
        updateOne: {
          filter: { sessionId, questionId: qe.questionId },
          update: {
            $set: {
              sessionId,
              questionId: qe.questionId,
              score: qe.score,
              feedback: qe.feedback,
              strengths: qe.topicsCovered,
              improvements: [],
              timestamp: Date.now() + index
            }
          },
          upsert: true
        }
      }));
      await QuestionEvaluation.bulkWrite(bulkOps);
      questionEvaluations = result.questionEvaluations;
    }

    res.json({
      success: true,
      evaluation: {
        ...evaluation.toObject(),
        questionEvaluations
      }
    });
  } catch (error) {
    console.error('Error evaluating session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get evaluation for a session (with ownership check)
router.get('/:sessionId', async (req, res) => {
  try {
    // Verify session ownership
    const session = await Session.findOne({ id: req.params.sessionId });
    if (session && req.user.role !== 'admin' && session.userId && session.userId !== req.user.userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const evaluation = await SessionEvaluation.findOne({ sessionId: req.params.sessionId });

    if (!evaluation) {
      return res.status(404).json({ success: false, error: 'Evaluation not found' });
    }

    // Join QuestionEvaluations
    const questionEvalDocs = await QuestionEvaluation.find({ sessionId: req.params.sessionId }).sort({ timestamp: 1 });

    // Map QuestionEvaluation docs to the frontend-expected shape
    const questionEvaluations = questionEvalDocs.map(qe => ({
      questionId: qe.questionId,
      questionText: '', // Will be matched client-side from session.questions
      score: qe.score,
      feedback: qe.feedback,
      topicsCovered: qe.strengths || []
    }));

    res.json({
      success: true,
      evaluation: {
        ...evaluation.toObject(),
        questionEvaluations
      }
    });
  } catch (error) {
    console.error('Error fetching evaluation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
