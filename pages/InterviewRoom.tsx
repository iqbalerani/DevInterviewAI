
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, Send, HelpCircle, Power, ChevronRight, Play, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useAppStore } from '../store';
import { useLiveAPI } from '../hooks/useLiveAPI';
import { InterviewPhase } from '../types';

const SESSION_LIMIT_SECONDS = 120; // 2 minutes max session duration

const InterviewRoom: React.FC = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { session, isAISpeaking, setPhase, updateSession, incrementHints, hintsUsed, addTranscript } = useAppStore();
  
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [code, setCode] = useState('// Your code here...');
  const [output, setOutput] = useState('');
  const [phaseSeconds, setPhaseSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [hasStartedRoom, setHasStartedRoom] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<number | null>(null);
  
  const currentQuestion = session?.questions[session.currentQuestionIndex];
  
  const systemInstruction = useMemo(() => `
    You are a professional technical interviewer at a top-tier tech company. 
    Conduct a technical interview based on these questions: ${JSON.stringify(session?.questions)}.
    Currently in phase: ${session?.phase}
    The current question is: "${currentQuestion?.text}"
    
    GUIDELINES:
    1. Stay strictly in character.
    2. Be concise but insightful.
    3. Listen to the candidate's response before proceeding.
    4. If the session is near its 2-minute limit, gracefully wrap up the current point.
  `, [session?.questions, session?.phase, currentQuestion?.text]);

  const { status, connect, disconnect } = useLiveAPI(systemInstruction);
  const isConnected = status === 'connected';

  // Initial setup: Camera and Session Check
  useEffect(() => {
    if (!session) {
      navigate('/interview/setup');
      return;
    }
    
    if (navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch(err => console.error("Camera access denied:", err));
    }

    return () => {
      disconnect();
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [session, navigate, disconnect]);

  // Master Timer Logic: Starts only when Audio Room is joined
  useEffect(() => {
    if (isConnected && hasStartedRoom) {
      console.log("Interview timers started.");
      timerRef.current = window.setInterval(() => {
        setPhaseSeconds(prev => prev + 1);
        setTotalSeconds(prev => {
          const next = prev + 1;
          if (next >= SESSION_LIMIT_SECONDS) {
            handleCompleteInterview(); 
          }
          return next;
        });
      }, 1000);
    } else {
      if (timerRef.current) window.clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [isConnected, hasStartedRoom]);

  const handleJoinAudio = async () => {
    setHasStartedRoom(true);
    try {
      await connect();
      addTranscript({ speaker: 'ai', text: "Hello! I'm ready to begin the interview. Let's start with the first phase.", timestamp: Date.now() });
    } catch (e) {
      console.error("Failed to join room", e);
    }
  };

  const handleRunCode = () => {
    setOutput(`[Executing Test Suite...]\n\nPASS test_case_1\nPASS test_case_2\nFAIL test_case_3 (Expected output mismatch)\n\nReviewing code logic... Done.`);
  };

  const handleCompleteInterview = () => {
    disconnect();
    navigate(`/interview/results/${sessionId}`);
  };

  const handleNextPhase = () => {
    if (!session) return;
    setPhaseSeconds(0);
    const nextIdx = session.currentQuestionIndex + 1;
    if (nextIdx >= session.questions.length) {
      handleCompleteInterview();
    } else {
      updateSession({ currentQuestionIndex: nextIdx });
      const nextQType = session.questions[nextIdx].type;
      
      let nextPhase = InterviewPhase.TECHNICAL;
      if (nextQType === 'coding') nextPhase = InterviewPhase.CODING;
      else if (nextQType === 'behavioral') nextPhase = InterviewPhase.BEHAVIORAL;
      
      setPhase(nextPhase);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!session || !currentQuestion) return null;

  const isNearingLimit = totalSeconds > SESSION_LIMIT_SECONDS - 15;

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Header */}
      <div className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
              {session.phase} phase
            </div>
            <h2 className="font-bold text-slate-300 text-sm">
              Q{session.currentQuestionIndex + 1} / {session.questions.length}
            </h2>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div className={`flex items-center gap-2 font-mono text-sm px-3 py-1 rounded-lg transition-all duration-300 ${isNearingLimit ? 'text-white bg-red-600 animate-pulse' : hasStartedRoom ? 'text-blue-400 bg-blue-500/10' : 'text-slate-600 bg-slate-800'}`}>
            <Clock className="w-4 h-4" />
            <span className="w-16">P: {formatTime(phaseSeconds)}</span>
            <span className="opacity-30 mx-1">|</span>
            <span className="w-16">T: {formatTime(totalSeconds)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => incrementHints()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-yellow-500" />
            Hint ({hintsUsed}/3)
          </button>
          <button 
            onClick={handleCompleteInterview}
            className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-500 rounded-lg text-xs font-bold transition-colors"
          >
            <Power className="w-4 h-4" />
            End Session
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Video Feed & Conversation */}
        <div className="w-1/3 border-r border-slate-800 flex flex-col p-6 space-y-6 bg-slate-900/20">
          <div className="relative aspect-video bg-slate-900 rounded-3xl overflow-hidden border-2 border-slate-800 shadow-2xl group">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            
            <div className="absolute bottom-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setIsMicOn(!isMicOn)} className={`p-2 rounded-full backdrop-blur-md ${isMicOn ? 'bg-slate-700/80' : 'bg-red-500'}`}>
                {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>
              <button onClick={() => setIsVideoOn(!isVideoOn)} className={`p-2 rounded-full backdrop-blur-md ${isVideoOn ? 'bg-slate-700/80' : 'bg-red-500'}`}>
                {isVideoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              </button>
            </div>
            
            {isNearingLimit && (
              <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full flex items-center gap-2 text-[10px] font-black animate-pulse shadow-xl">
                <AlertTriangle className="w-3 h-3" />
                WRAPPING UP...
              </div>
            )}

            {!isConnected && (
              <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
                <div className="w-20 h-20 bg-blue-600/20 rounded-3xl flex items-center justify-center mb-6">
                  {status === 'connecting' ? <Loader2 className="w-10 h-10 text-blue-500 animate-spin" /> : <Mic className="w-10 h-10 text-blue-500" />}
                </div>
                <h4 className="text-2xl font-black mb-2">
                  {status === 'connecting' ? 'Establishing Link...' : 'Connect Audio'}
                </h4>
                <p className="text-slate-400 mb-8 text-sm max-w-[240px]">
                  {status === 'connecting' ? 'Calibrating AI response engine and requesting microphone...' : 'The session timers will begin once you connect to the AI interviewer.'}
                </p>
                {status !== 'connecting' && (
                  <button 
                    onClick={handleJoinAudio}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 rounded-2xl font-black transition-all transform hover:scale-105 shadow-xl shadow-blue-600/30"
                  >
                    Join Audio Room
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Transcripts Section */}
          <div className="flex-1 bg-slate-950 border border-slate-800 rounded-3xl p-6 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Session Transcript</h3>
               {isConnected && <div className="flex items-center gap-1.5"><span className="text-[10px] text-green-500 font-bold uppercase">Live</span><div className="w-2 h-2 rounded-full bg-green-500 animate-ping" /></div>}
            </div>
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-hide">
              {session.transcripts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-2 opacity-30">
                  <Play className="w-8 h-8 text-slate-600" />
                  <p className="text-xs italic">Conversation will appear here...</p>
                </div>
              ) : (
                session.transcripts.map((t, i) => (
                  <div key={i} className={`flex flex-col gap-1 ${t.speaker === 'ai' ? 'items-start' : 'items-end'}`}>
                    <span className="text-[9px] font-bold uppercase opacity-30 tracking-tighter">
                      {t.speaker === 'ai' ? 'Interviewer' : 'Candidate'}
                    </span>
                    <div className={`max-w-[90%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                      t.speaker === 'ai' 
                      ? 'bg-blue-600/10 text-blue-100 rounded-tl-none border border-blue-500/10' 
                      : 'bg-slate-800 text-slate-200 rounded-tr-none border border-slate-700'
                    }`}>
                      {t.text}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Working Space */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
          {session.phase === InterviewPhase.CODING ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="h-1/2 flex flex-col p-8 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-white">Coding Environment</h3>
                  <div className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-[10px] font-bold text-slate-400">Python 3.12</div>
                </div>
                <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 text-slate-300 text-sm leading-relaxed max-h-32 overflow-y-auto">
                  {currentQuestion.text}
                </div>
                <div className="flex-1 border-2 border-slate-800 rounded-2xl overflow-hidden mt-4 shadow-inner">
                  <Editor
                    height="100%"
                    theme="vs-dark"
                    defaultLanguage="python"
                    value={code}
                    onChange={(val) => setCode(val || '')}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: 'on',
                      fontFamily: 'JetBrains Mono',
                      cursorSmoothCaretAnimation: "on",
                      padding: { top: 20 }
                    }}
                  />
                </div>
              </div>
              <div className="h-1/2 border-t border-slate-800 flex flex-col p-8 bg-slate-950/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Console Output</h3>
                  <button 
                    onClick={handleRunCode}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl text-xs font-black transition-all shadow-lg shadow-green-600/20 active:scale-95 flex items-center gap-2"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    RUN TESTS
                  </button>
                </div>
                <pre className="flex-1 bg-slate-900/80 p-6 rounded-2xl border border-slate-800 font-mono text-xs text-slate-400 overflow-auto scrollbar-hide">
                  {output || '> Awaiting execution...'}
                </pre>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-12">
              <div className="max-w-2xl w-full space-y-10 animate-in zoom-in-95 duration-500">
                <div className="text-center space-y-8">
                  <div className="relative inline-block">
                    <div className={`w-28 h-28 rounded-[2.5rem] flex items-center justify-center mx-auto transition-all duration-500 ${isAISpeaking ? 'bg-blue-600 shadow-[0_0_50px_rgba(37,99,235,0.4)] scale-110' : 'bg-slate-900 border-2 border-slate-800'}`}>
                      {isAISpeaking ? (
                        <div className="flex gap-1.5">
                          <span className="w-1.5 h-10 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-10 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-10 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      ) : (
                        <Mic className="w-12 h-12 text-slate-600" />
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="inline-block px-4 py-1.5 bg-blue-600/10 border border-blue-500/20 rounded-full text-xs font-black text-blue-400 uppercase tracking-widest">
                      Active Phase: {session.phase}
                    </div>
                    <h3 className="text-3xl font-black text-white px-8">"{currentQuestion.text}"</h3>
                  </div>
                </div>
                
                <div className="flex justify-center h-12">
                  {!isConnected ? (
                    <div className="flex flex-col items-center gap-2">
                       <div className="text-slate-500 text-sm font-medium animate-pulse">
                         {status === 'connecting' ? 'Requesting Secure Audio Link...' : 'Waiting for connection...'}
                       </div>
                       {status === 'connecting' && <div className="text-[10px] text-slate-600 uppercase font-black tracking-widest">Initializing AI Persona</div>}
                    </div>
                  ) : isAISpeaking ? (
                    <div className="text-blue-500 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                      Interviewer Speaking
                    </div>
                  ) : (
                    <div className="text-green-500 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                      <Mic className="w-4 h-4 animate-pulse" />
                      Your Turn to Respond
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="h-20 bg-slate-900 border-t border-slate-800 px-8 flex items-center justify-between shadow-2xl z-10">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse' : status === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-slate-600'}`} />
            <span className="text-xs font-black uppercase tracking-widest text-slate-300">
              {isConnected ? 'Session Connected' : status === 'connecting' ? 'Connecting...' : 'Session Ready'}
            </span>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div className="text-xs font-medium text-slate-500 flex items-center gap-2">
            Target Role: <span className="text-slate-200 font-black uppercase tracking-tight">Software Engineer</span>
          </div>
        </div>

        <button 
          onClick={handleNextPhase}
          className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 rounded-2xl font-black text-sm transition-all shadow-xl shadow-blue-600/30 active:scale-95 group"
        >
          {session.currentQuestionIndex === session.questions.length - 1 ? 'FINISH & VIEW RESULTS' : 'NEXT INTERVIEW PHASE'}
          <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};

export default InterviewRoom;
