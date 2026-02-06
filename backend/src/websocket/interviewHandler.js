import { WebSocketServer } from 'ws';
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
                ws.send(JSON.stringify({
                  type: 'error',
                  error: 'Session not found'
                }));
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

                  ws.send(JSON.stringify({
                    type: 'connected',
                    sessionId
                  }));
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
                    ws.send(JSON.stringify({
                      type: 'audio',
                      data: audioData
                    }));
                  }
                },
                onTranscript: (transcript) => {
                  ws.send(JSON.stringify({
                    type: 'transcript',
                    transcript
                  }));
                },
                onPartialTranscript: (partialTranscript) => {
                  try {
                    ws.send(JSON.stringify({
                      type: 'partial_transcript',
                      transcript: partialTranscript
                    }));
                  } catch (error) {
                    // Non-critical — don't crash if WS is closing
                  }
                },
                onInterrupted: () => {
                  ws.send(JSON.stringify({
                    type: 'interrupted'
                  }));
                },
                onClose: (event) => {
                  ws.send(JSON.stringify({
                    type: 'disconnected',
                    code: event.code,
                    reason: event.reason
                  }));
                },
                onError: (error) => {
                  ws.send(JSON.stringify({
                    type: 'error',
                    error: error.message
                  }));
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
              ws.send(JSON.stringify({
                type: 'error',
                error: 'Failed to connect session: ' + error.message
              }));
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
                      ws.send(JSON.stringify({
                        type: 'question_changed',
                        questionIndex: session.currentQuestionIndex + 1,
                        question: result.nextQuestion
                      }));
                    }
                  } else {
                    console.log('🎉 Last question complete, finishing interview');
                    orchestrator.handleEvent({ type: 'COMPLETE' });
                    ws.send(JSON.stringify({
                      type: 'interview_complete',
                      sessionId
                    }));
                  }
                } catch (error) {
                  console.error('❌ Auto-transition error:', error);
                }
              }, 10000);
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

              if (result && result.success) {
                ws.send(JSON.stringify({
                  type: 'question_changed',
                  questionIndex: result.questionIndex,
                  question: result.question
                }));
              } else if (result && result.complete) {
                ws.send(JSON.stringify({
                  type: 'interview_complete'
                }));
              } else {
                throw new Error('Failed to transition question');
              }
            } catch (error) {
              console.error('❌ Next question error:', error);
              ws.send(JSON.stringify({
                type: 'error',
                error: 'Failed to move to next question: ' + error.message
              }));
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
              ws.send(JSON.stringify({ type: 'disconnected' }));
            }
            break;
          }

          default:
            console.log('Unknown message type:', message.type);
        }
      } catch (parseError) {
        console.error('❌ WebSocket message parse error:', parseError);
        // Don't crash - send error to client
        try {
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Invalid message format: ' + parseError.message
          }));
        } catch (sendError) {
          console.error('❌ Failed to send error message:', sendError);
        }
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
