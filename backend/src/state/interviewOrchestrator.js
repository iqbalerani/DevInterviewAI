import { createMachine, createActor, assign } from 'xstate';
import { geminiLiveService } from '../services/geminiLiveService.js';
import { evaluationQueue } from '../queues/evaluationQueue.js';
import { Session } from '../models/Session.js';

/**
 * Interview State Machine States
 */
export const InterviewStates = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  READY: 'ready',
  AI_SPEAKING: 'ai_speaking',
  USER_SPEAKING: 'user_speaking',
  PROCESSING: 'processing',
  TRANSITIONING: 'transitioning',
  EVALUATING: 'evaluating',
  COMPLETED: 'completed',
  ERROR: 'error'
};

/**
 * Interview State Machine Definition
 */
const createInterviewMachine = (sessionId) => createMachine({
  id: 'interview',
  initial: InterviewStates.IDLE,
  context: {
    sessionId,
    currentQuestionIndex: 0,
    currentQuestionId: null,
    hasUserResponse: false,
    memory: {
      candidateProfile: null,
      runningAssessment: null
    }
  },
  states: {
    [InterviewStates.IDLE]: {
      on: {
        CONNECT: InterviewStates.CONNECTING
      }
    },

    [InterviewStates.CONNECTING]: {
      on: {
        CONNECTED: {
          target: InterviewStates.READY,
          actions: 'resetUserResponse'
        },
        ERROR: InterviewStates.ERROR
      }
    },

    [InterviewStates.READY]: {
      on: {
        USER_SPEECH_STARTED: InterviewStates.USER_SPEAKING,
        AI_SPEAKING_STARTED: InterviewStates.AI_SPEAKING,
        NEXT_QUESTION: {
          target: InterviewStates.TRANSITIONING,
          guard: 'hasUserResponse'
        },
        INTERVIEW_COMPLETE: InterviewStates.COMPLETED
      }
    },

    [InterviewStates.AI_SPEAKING]: {
      entry: 'lockUserInput',
      exit: 'unlockUserInput',
      on: {
        // Barge-in disabled: AI always completes full response
        AI_SPEAKING_ENDED: InterviewStates.READY
      }
    },

    [InterviewStates.USER_SPEAKING]: {
      entry: ['lockAIOutput', 'setUserResponseFlag'],
      on: {
        USER_SPEECH_ENDED: InterviewStates.PROCESSING
      }
    },

    [InterviewStates.PROCESSING]: {
      on: {
        AI_SPEAKING_STARTED: InterviewStates.AI_SPEAKING
      },
      after: {
        5000: InterviewStates.READY // Fallback timeout
      }
    },

    [InterviewStates.TRANSITIONING]: {
      entry: 'startQuestionTransition',
      on: {
        EVALUATION_STARTED: InterviewStates.EVALUATING,
        TRANSITION_FAILED: InterviewStates.ERROR
      }
    },

    [InterviewStates.EVALUATING]: {
      on: {
        QUESTION_CHANGED: {
          target: InterviewStates.READY,
          actions: 'resetUserResponse'
        }
      }
    },

    [InterviewStates.COMPLETED]: {
      type: 'final'
    },

    [InterviewStates.ERROR]: {
      on: {
        RETRY: InterviewStates.CONNECTING,
        DISCONNECT: InterviewStates.IDLE
      }
    }
  }
}, {
  guards: {
    hasUserResponse: ({ context }) => context.hasUserResponse
  },
  actions: {
    bargeIn: ({ context }) => {
      geminiLiveService.interruptSession(context.sessionId);
    },
    lockUserInput: () => {
      // Enforced in WebSocket message handler
    },
    unlockUserInput: () => {
      // Enforced in WebSocket message handler
    },
    lockAIOutput: () => {
      // Enforced in WebSocket message handler
    },
    setUserResponseFlag: assign({ hasUserResponse: true }),
    resetUserResponse: assign({ hasUserResponse: false }),
    startQuestionTransition: () => {
      // This will be handled by the orchestrator's transitionQuestion method
    }
  }
});

/**
 * Interview Orchestrator
 * Manages interview state and enforces locks
 */
export class InterviewOrchestrator {
  constructor(sessionId, websocket) {
    this.sessionId = sessionId;
    this.ws = websocket;
    this.lastBroadcastState = null;
    this.service = createActor(createInterviewMachine(sessionId));

    // Subscribe to state changes
    this.service.subscribe((snapshot) => {
      this.handleStateTransition(snapshot);
    });

    this.service.start();
  }

  /**
   * Handle state transitions and notify client
   */
  handleStateTransition(state) {
    const currentState = state.value;

    // Deduplicate: only broadcast on actual state transitions
    if (currentState === this.lastBroadcastState) return;
    this.lastBroadcastState = currentState;

    const context = state.context;

    console.log(`🎭 State transition: ${currentState}`, {
      sessionId: this.sessionId,
      hasUserResponse: context.hasUserResponse
    });

    // Send state update to client
    this.ws.send(JSON.stringify({
      type: 'state_changed',
      state: currentState,
      context: {
        currentQuestionIndex: context.currentQuestionIndex,
        hasUserResponse: context.hasUserResponse
      }
    }));
  }

  /**
   * Handle incoming events from WebSocket
   */
  handleEvent(event) {
    const currentState = this.service.getSnapshot().value;

    // Guard: Block user audio if not in appropriate state
    if (event.type === 'audio' && !this.shouldAcceptUserAudio()) {
      return; // DROP audio packet
    }

    // Guard: Block AI output if not in appropriate state
    if (event.type === 'ai_audio' && !this.shouldAllowAIOutput()) {
      return; // DROP AI audio
    }

    // Send event to state machine
    this.service.send(event);
  }

  /**
   * Check if user audio should be accepted
   */
  shouldAcceptUserAudio() {
    const state = this.service.getSnapshot().value;
    return state === InterviewStates.USER_SPEAKING ||
           state === InterviewStates.READY;
  }

  /**
   * Check if AI output should be allowed
   */
  shouldAllowAIOutput() {
    const state = this.service.getSnapshot().value;
    return state === InterviewStates.AI_SPEAKING ||
           state === InterviewStates.PROCESSING ||
           state === InterviewStates.READY;
  }

  /**
   * Transition to next question
   */
  async transitionQuestion() {
    try {
      const session = await Session.findOne({ id: this.sessionId });
      if (!session) {
        throw new Error('Session not found');
      }

      const currentQuestionIndex = session.currentQuestionIndex;
      const currentQuestion = session.questions[currentQuestionIndex];

      // Trigger background evaluation
      console.log(`📊 Starting evaluation for question ${currentQuestion.id}`);
      await evaluationQueue.add('evaluate', {
        sessionId: this.sessionId,
        questionId: currentQuestion.id
      });

      this.service.send({ type: 'EVALUATION_STARTED' });

      // Update to next question
      const nextQuestionIndex = currentQuestionIndex + 1;

      if (nextQuestionIndex >= session.questions.length) {
        // Interview complete
        this.service.send({ type: 'INTERVIEW_COMPLETE' });
        return { complete: true };
      }

      const nextQuestion = session.questions[nextQuestionIndex];

      // Update backend session
      await Session.findOneAndUpdate(
        { id: this.sessionId },
        {
          currentQuestionIndex: nextQuestionIndex,
          phase: this.getPhaseFromQuestionType(nextQuestion.type)
        }
      );

      // Update context in Live API (NO RECONNECT)
      const memory = this.service.getSnapshot().context.memory;
      await geminiLiveService.sendContextUpdate(
        this.sessionId,
        nextQuestion,
        memory.candidateProfile,
        memory.runningAssessment
      );

      // Update orchestrator context
      this.service.send({
        type: 'QUESTION_CHANGED',
        questionIndex: nextQuestionIndex,
        questionId: nextQuestion.id
      });

      // Notify client
      this.ws.send(JSON.stringify({
        type: 'question_changed',
        questionIndex: nextQuestionIndex,
        question: nextQuestion
      }));

      return { complete: false, nextQuestion };

    } catch (error) {
      console.error('Transition error:', error);
      this.service.send({ type: 'TRANSITION_FAILED', error: error.message });
      throw error;
    }
  }

  /**
   * Map question type to interview phase
   */
  getPhaseFromQuestionType(type) {
    const phaseMap = {
      'behavioral': 'behavioral',
      'technical': 'technical',
      'coding': 'coding'
    };
    return phaseMap[type] || 'technical';
  }

  /**
   * Check if user has responded to the current question
   */
  hasUserResponded() {
    return this.service.getSnapshot().context.hasUserResponse === true;
  }

  /**
   * Get current state
   */
  getCurrentState() {
    return this.service.getSnapshot().value;
  }

  /**
   * Stop orchestrator
   */
  stop() {
    this.service.stop();
  }
}
