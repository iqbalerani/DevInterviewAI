import { WebSocketServer } from 'ws';
import { GoogleGenAI, Type } from '@google/genai';
import { geminiLiveService } from '../services/geminiLiveService.js';
import { Session } from '../models/Session.js';
import { InterviewOrchestrator } from '../state/interviewOrchestrator.js';

export function setupWebSocketServer(server) {
  const wss = new WebSocketServer({ server, path: '/ws/interview' });

  wss.on('connection', async (ws, req) => {
    console.log('🔌 New WebSocket connection');

    let sessionId = null;
    let liveSession = null;
    let orchestrator = null;
    let hasAIStartedSpeaking = false; // Track if AI has begun speaking
    let autoAdvanceTimer = null; // Tracks the auto-advance timeout

    const safeSend = (data) => {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify(data));
      }
    };

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        // If orchestrator exists, let it handle guards
        if (orchestrator && message.type !== 'connect') {
          // Orchestrator enforces locks - may drop messages
          orchestrator.handleEvent(message);
        }

        switch (message.type) {
          case 'connect': {
            try {
              sessionId = message.sessionId;
              console.log(`📞 Connecting session: ${sessionId}`);

              // Initialize orchestrator
              orchestrator = new InterviewOrchestrator(sessionId, ws);
              orchestrator.handleEvent({ type: 'CONNECT' });

              // Fetch session data
              const session = await Session.findOne({ id: sessionId });
              if (!session) {
                safeSend({
                  type: 'error',
                  error: 'Session not found'
                });
                return;
              }

              // Build system instruction
              const currentQuestion = session.questions[session.currentQuestionIndex];
            const systemInstruction = `
You are a professional technical interviewer conducting a ${session.phase} interview.

CURRENT QUESTION: "${currentQuestion?.text}"

CRITICAL INSTRUCTIONS:
1. You MUST begin the interview IMMEDIATELY by greeting the candidate warmly and asking the current question above
2. Do NOT wait for the user to speak first - YOU speak first
3. Start with a brief greeting (e.g., "Hello! Let's begin.") then ask the question
4. After the candidate answers, provide BRIEF acknowledgment (max 5 words: "Got it" or "Interesting")
5. Keep ALL non-question responses under 10 words
6. Be professional, encouraging, and conversational

BEGIN the interview NOW by greeting and asking the question.
            `;

            // Connect to Gemini Live API
            console.log(`🚀 [InterviewHandler] Initiating Gemini Live API connection for session ${sessionId}...`);
            liveSession = await geminiLiveService.connectSession(
              sessionId,
              systemInstruction,
              {
                onOpen: () => {
                  orchestrator.handleEvent({ type: 'CONNECTED' });

                  // TRIGGER AI TO ASK FIRST QUESTION
                  setTimeout(() => {
                    try {
                      if (liveSession) {
                        console.log(`🎤 Sending trigger to AI for session ${sessionId}`);
                        // Use sendRealtimeInput (the correct method for Live API)
                        liveSession.sendRealtimeInput({
                          text: 'SYSTEM PROMPT: You must now greet the candidate and ask the first interview question. Begin speaking immediately.'
                        });
                        console.log(`✅ Trigger sent successfully for session ${sessionId}`);
                      }
                    } catch (error) {
                      console.error('❌ Error triggering initial AI response:', error);
                      // Don't crash - AI may still speak from system instruction
                    }
                  }, 1000); // Delay to ensure connection is stable

                  safeSend({
                    type: 'connected',
                    sessionId
                  });
                },
                onAudioData: (audioData) => {
                  // Fire AI_SPEAKING_STARTED on first audio chunk
                  if (!hasAIStartedSpeaking) {
                    console.log(`🎤 AI started speaking for session ${sessionId}`);
                    orchestrator.handleEvent({ type: 'AI_SPEAKING_STARTED' });
                    hasAIStartedSpeaking = true;
                  }

                  // Guard: Only send if orchestrator allows AI output
                  if (orchestrator && orchestrator.shouldAllowAIOutput()) {
                    safeSend({
                      type: 'audio',
                      data: audioData
                    });
                  }
                },
                onTranscript: (transcript) => {
                  safeSend({
                    type: 'transcript',
                    transcript
                  });
                },
                onPartialTranscript: (partialTranscript) => {
                  safeSend({
                    type: 'partial_transcript',
                    transcript: partialTranscript
                  });
                },
                onInterrupted: () => {
                  safeSend({
                    type: 'interrupted'
                  });
                },
                onClose: (event) => {
                  safeSend({
                    type: 'disconnected',
                    code: event.code,
                    reason: event.reason
                  });
                },
                onError: (error) => {
                  safeSend({
                    type: 'error',
                    error: error.message
                  });
                }
              }
            );

              console.log(`✅ [InterviewHandler] Gemini connectSession completed for ${sessionId}`);
              console.log(`✅ [InterviewHandler] LiveSession object type: ${typeof liveSession}`);

              // Update session status
              await Session.findOneAndUpdate(
                { id: sessionId },
                { status: 'active', startTime: new Date() }
              );

              console.log(`✅ [InterviewHandler] Session ${sessionId} marked as active in database`);

            } catch (error) {
              console.error(`❌ [InterviewHandler] Connection error for session ${sessionId}:`, error);
              console.error(`❌ [InterviewHandler] Error name: ${error.name}`);
              console.error(`❌ [InterviewHandler] Error message: ${error.message}`);
              console.error(`❌ [InterviewHandler] Error stack:`, error.stack);
              safeSend({
                type: 'error',
                error: 'Failed to connect session: ' + error.message
              });
            }
            break;
          }

          case 'audio': {
            try {
              // Forward audio data to Gemini Live API (orchestrator already checked)
              if (!liveSession || !orchestrator) {
                break;
              }

              const shouldAccept = orchestrator.shouldAcceptUserAudio();

              if (sessionId && message.data && shouldAccept) {
                const buffer = Buffer.from(message.data, 'base64');
                geminiLiveService.sendAudioData(sessionId, buffer);
              }
            } catch (error) {
              console.error('❌ User audio processing error:', error);
              // Don't crash - just log and continue
            }
            break;
          }

          case 'user_speech_started': {
            // Cancel any pending auto-advance -- user is speaking again
            if (autoAdvanceTimer) {
              clearTimeout(autoAdvanceTimer);
              autoAdvanceTimer = null;
              console.log('⏹️  Auto-advance timer cancelled: user started speaking');
            }
            orchestrator.handleEvent({ type: 'USER_SPEECH_STARTED' });
            break;
          }

          case 'user_speech_ended': {
            orchestrator.handleEvent({ type: 'USER_SPEECH_ENDED' });
            // Auto-advance timer is set in ai_speaking_ended (after AI finishes responding)
            break;
          }

          case 'ai_speaking_started': {
            orchestrator.handleEvent({ type: 'AI_SPEAKING_STARTED' });
            break;
          }

          case 'ai_speaking_ended': {
            hasAIStartedSpeaking = false; // Reset so next AI response triggers AI_SPEAKING_STARTED
            orchestrator.handleEvent({ type: 'AI_SPEAKING_ENDED' });

            // Only start auto-advance timer if the user has already answered this question
            if (orchestrator.hasUserResponded()) {
              const session = await Session.findOne({ id: sessionId });
              if (!session) break;

              const currentQuestion = session.questions[session.currentQuestionIndex];
              if (currentQuestion?.type === 'coding') {
                console.log('⏸️  Coding phase - no auto-advance');
                break;
              }

              // Clear any existing timer before setting a new one
              if (autoAdvanceTimer) {
                clearTimeout(autoAdvanceTimer);
              }

              console.log('⏱️  AI finished after user response. Starting 10s auto-advance timer.');
              autoAdvanceTimer = setTimeout(async () => {
                autoAdvanceTimer = null;

                try {
                  // Verify state is READY before advancing
                  const currentState = orchestrator.getCurrentState();
                  if (currentState !== 'ready') {
                    console.log(`⏹️  Auto-advance skipped: state is ${currentState}, not ready`);
                    return;
                  }

                  const session = await Session.findOne({ id: sessionId });
                  if (!session) return;

                  if (session.currentQuestionIndex < session.questions.length - 1) {
                    console.log('⏭️  Auto-advancing to next question');
                    const result = await orchestrator.transitionQuestion();

                    if (result && !result.complete) {
                      safeSend({
                        type: 'question_changed',
                        questionIndex: session.currentQuestionIndex + 1,
                        question: result.nextQuestion
                      });
                    }
                  } else {
                    console.log('🎉 Last question complete, finishing interview');
                    orchestrator.handleEvent({ type: 'COMPLETE' });
                    safeSend({
                      type: 'interview_complete',
                      sessionId
                    });
                  }
                } catch (error) {
                  console.error('❌ Auto-transition error:', error);
                }
              }, 10000);
            }
            break;
          }

          case 'question_time_expired': {
            try {
              console.log(`⏰ Question time expired for session ${sessionId}`);

              if (!orchestrator) break;

              // Cancel any pending auto-advance timer
              if (autoAdvanceTimer) {
                clearTimeout(autoAdvanceTimer);
                autoAdvanceTimer = null;
              }

              const session = await Session.findOne({ id: sessionId });
              if (!session) break;

              if (session.currentQuestionIndex >= session.questions.length - 1) {
                // Last question — complete interview
                console.log('⏰ Last question time expired, finishing interview');
                orchestrator.handleEvent({ type: 'COMPLETE' });
                safeSend({ type: 'interview_complete', sessionId });
              } else {
                const result = await orchestrator.transitionQuestion();
                if (result && result.complete) {
                  safeSend({ type: 'interview_complete', sessionId });
                } else if (result && result.success) {
                  safeSend({
                    type: 'question_changed',
                    questionIndex: result.questionIndex,
                    question: result.nextQuestion
                  });
                }
              }
            } catch (error) {
              console.error('⏰ Question time expired transition error:', error);
            }
            break;
          }

          case 'run_code': {
            try {
              console.log(`🧪 Running code analysis for session ${sessionId}`);
              safeSend({ type: 'code_running' });

              const session = await Session.findOne({ id: sessionId });
              if (!session) {
                safeSend({ type: 'code_result', testResults: [], summary: 'Session not found', score: 0 });
                break;
              }

              const currentQ = session.questions[session.currentQuestionIndex];
              const testCasesText = currentQ?.testCases?.length
                ? currentQ.testCases.map((tc, i) => `Test ${i + 1}: Input: ${tc.input} → Expected: ${tc.expectedOutput}`).join('\n')
                : 'No specific test cases provided. Evaluate correctness based on the problem description.';

              const codeAnalysisAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
              const analysisResponse = await codeAnalysisAi.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: `You are a code evaluator. Analyze this code submission against the given problem and test cases.

## Problem
${currentQ?.text || 'Unknown problem'}

## Test Cases
${testCasesText}

## Submitted Code (${message.language || 'python'})
\`\`\`${message.language || 'python'}
${message.code}
\`\`\`

Trace through the code logic for each test case. Determine if it would produce the expected output. Be accurate in your analysis.`,
                config: {
                  responseMimeType: 'application/json',
                  responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                      testResults: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            testCase: { type: Type.STRING },
                            passed: { type: Type.BOOLEAN },
                            actualOutput: { type: Type.STRING },
                            explanation: { type: Type.STRING }
                          },
                          required: ['testCase', 'passed', 'actualOutput', 'explanation']
                        }
                      },
                      summary: { type: Type.STRING },
                      score: { type: Type.NUMBER }
                    },
                    required: ['testResults', 'summary', 'score']
                  }
                }
              });

              const analysisResult = JSON.parse(analysisResponse.text);

              // Save code to session
              await Session.findOneAndUpdate(
                { id: sessionId, 'questions.id': currentQ.id },
                { $set: { 'questions.$.submittedCode': message.code, 'questions.$.codeLanguage': message.language || 'python' } }
              );

              safeSend({
                type: 'code_result',
                testResults: analysisResult.testResults,
                summary: analysisResult.summary,
                score: analysisResult.score
              });
            } catch (error) {
              console.error('❌ Code analysis error:', error);
              safeSend({ type: 'code_result', testResults: [], summary: 'Analysis failed: ' + error.message, score: 0 });
            }
            break;
          }

          case 'submit_code': {
            try {
              console.log(`💾 Submitting code for session ${sessionId}`);
              const session = await Session.findOne({ id: sessionId });
              if (session) {
                const currentQ = session.questions[session.currentQuestionIndex];
                if (currentQ) {
                  await Session.findOneAndUpdate(
                    { id: sessionId, 'questions.id': currentQ.id },
                    { $set: { 'questions.$.submittedCode': message.code, 'questions.$.codeLanguage': message.language || 'python' } }
                  );
                }
              }
              safeSend({ type: 'code_submitted' });
            } catch (error) {
              console.error('❌ Code submit error:', error);
              safeSend({ type: 'code_submitted' }); // Always respond to not block disconnect
            }
            break;
          }

          case 'next_question': {
            try {
              console.log(`📊 Manual next question requested for session ${sessionId}`);

              if (!orchestrator) {
                throw new Error('Orchestrator not initialized');
              }

              const result = await orchestrator.transitionQuestion();

              if (result && result.complete) {
                safeSend({
                  type: 'interview_complete',
                  sessionId
                });
              } else if (result && result.success) {
                safeSend({
                  type: 'question_changed',
                  questionIndex: result.questionIndex,
                  question: result.nextQuestion
                });
              } else {
                throw new Error('Failed to transition question');
              }
            } catch (error) {
              console.error('❌ Next question error:', error);
              safeSend({
                type: 'error',
                error: 'Failed to move to next question: ' + error.message
              });
            }
            break;
          }

          case 'user_interrupted': {
            // User interrupted (barge-in)
            if (autoAdvanceTimer) {
              clearTimeout(autoAdvanceTimer);
              autoAdvanceTimer = null;
            }
            orchestrator.handleEvent({ type: 'USER_SPEECH_STARTED' });
            break;
          }

          case 'disconnect': {
            if (autoAdvanceTimer) {
              clearTimeout(autoAdvanceTimer);
              autoAdvanceTimer = null;
            }
            if (sessionId) {
              geminiLiveService.disconnectSession(sessionId);
              if (orchestrator) {
                orchestrator.stop();
              }
              await Session.findOneAndUpdate(
                { id: sessionId },
                { status: 'completed', endTime: new Date() }
              );
              safeSend({ type: 'disconnected' });
            }
            break;
          }

          default:
            console.log('Unknown message type:', message.type);
        }
      } catch (parseError) {
        console.error('❌ WebSocket message parse error:', parseError);
        // Don't crash - send error to client
        safeSend({
          type: 'error',
          error: 'Invalid message format: ' + parseError.message
        });
      }
    });

    ws.on('close', () => {
      console.log('🔌 WebSocket closed for session:', sessionId);
      if (autoAdvanceTimer) {
        clearTimeout(autoAdvanceTimer);
        autoAdvanceTimer = null;
      }
      try {
        if (orchestrator) {
          orchestrator.handleEvent({ type: 'DISCONNECT' });
        }
        if (sessionId) {
          geminiLiveService.disconnectSession(sessionId);
        }
      } catch (error) {
        console.error('❌ Cleanup error:', error);
      }
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error for session:', sessionId, error);
      // Don't crash - just log
    });
  });

  console.log('✅ WebSocket server initialized at /ws/interview');
}
