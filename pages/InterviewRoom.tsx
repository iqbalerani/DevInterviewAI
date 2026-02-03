
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, Send, HelpCircle, Power, ChevronRight, Play } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useAppStore } from '../store';
import { useLiveAPI } from '../hooks/useLiveAPI';
import { InterviewPhase } from '../types';

const InterviewRoom: React.FC = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { session, isAISpeaking, setPhase, updateSession, incrementHints, hintsUsed } = useAppStore();
  
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [code, setCode] = useState('// Your code here...');
  const [output, setOutput] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const currentQuestion = session?.questions[session.currentQuestionIndex];
  
  const systemInstruction = `
    You are a professional technical interviewer at a top-tier tech company. 
    Conduct an interview based on these questions: ${JSON.stringify(session?.questions)}.
    Be friendly but challenging. Guide the candidate through Intro, Behavioral, Technical, and Coding phases.
    Current Question: ${currentQuestion?.text}
    Phase: ${session?.phase}
    Follow the natural flow of conversation. Ask follow-up questions if their response is vague.
  `;

  const { isConnected, connect, disconnect } = useLiveAPI(systemInstruction);

  useEffect(() => {
    if (!session) {
      navigate('/interview/setup');
      return;
    }
    
    // Auto-start video
    if (navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch(console.error);
    }

    return () => {
      disconnect();
    };
  }, [session, navigate, disconnect]);

  const handleRunCode = () => {
    setOutput(`[Executing...]\n\nOutput: \nHello from DevProof! This is a mock execution result.\n\nCode analysis complete: No syntax errors found.`);
  };

  const handleNextPhase = () => {
    if (!session) return;
    const nextIdx = session.currentQuestionIndex + 1;
    if (nextIdx >= session.questions.length) {
      navigate(`/interview/results/${sessionId}`);
    } else {
      updateSession({ currentQuestionIndex: nextIdx });
      const nextQType = session.questions[nextIdx].type;
      if (nextQType === 'coding') setPhase(InterviewPhase.CODING);
      else if (nextQType === 'behavioral') setPhase(InterviewPhase.BEHAVIORAL);
      else setPhase(InterviewPhase.TECHNICAL);
    }
  };

  if (!session || !currentQuestion) return null;

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Header */}
      <div className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            {session.phase} phase
          </div>
          <h2 className="font-bold text-slate-300">
            Question {session.currentQuestionIndex + 1} of {session.questions.length}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => incrementHints()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-yellow-500" />
            Hint ({hintsUsed}/3)
          </button>
          <button 
            onClick={() => navigate(`/interview/results/${sessionId}`)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-500 rounded-lg text-sm transition-colors"
          >
            <Power className="w-4 h-4" />
            End Session
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Video & Audio */}
        <div className="w-1/3 border-r border-slate-800 flex flex-col p-6 space-y-6">
          <div className="relative aspect-video bg-slate-900 rounded-3xl overflow-hidden border-2 border-slate-800 shadow-2xl">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute bottom-4 left-4 flex gap-2">
              <button onClick={() => setIsMicOn(!isMicOn)} className={`p-2 rounded-full ${isMicOn ? 'bg-slate-700/80' : 'bg-red-500'}`}>
                {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>
              <button onClick={() => setIsVideoOn(!isVideoOn)} className={`p-2 rounded-full ${isVideoOn ? 'bg-slate-700/80' : 'bg-red-500'}`}>
                {isVideoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              </button>
            </div>
            {!isConnected && (
              <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-8 text-center">
                <p className="text-slate-400 mb-4">Ready to begin your session?</p>
                <button 
                  onClick={connect}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all transform hover:scale-105"
                >
                  Join Audio Room
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 bg-slate-900/50 rounded-3xl p-6 border border-slate-800 overflow-y-auto space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Live Transcript</h3>
            {session.transcripts.length === 0 ? (
              <p className="text-slate-600 italic text-sm">Waiting for conversation to start...</p>
            ) : (
              session.transcripts.slice(-10).map((t, i) => (
                <div key={i} className={`flex gap-3 ${t.speaker === 'ai' ? 'text-blue-400' : 'text-slate-200'}`}>
                  <span className="font-black uppercase text-[10px] mt-1 opacity-50">{t.speaker}</span>
                  <p className="text-sm leading-relaxed">{t.text}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel: Task area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {session.phase === InterviewPhase.CODING ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="h-1/2 flex flex-col p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold">Coding Challenge</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">Python 3</span>
                  </div>
                </div>
                <div className="prose prose-invert max-w-none text-slate-300">
                  <p>{currentQuestion.text}</p>
                </div>
                <div className="flex-1 border-2 border-slate-800 rounded-2xl overflow-hidden mt-4">
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
                      padding: { top: 16 }
                    }}
                  />
                </div>
              </div>
              <div className="h-1/2 border-t border-slate-800 flex flex-col p-6 bg-slate-900/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Execution Output</h3>
                  <button 
                    onClick={handleRunCode}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-bold transition-all"
                  >
                    <Play className="w-4 h-4" />
                    Run Code
                  </button>
                </div>
                <pre className="flex-1 bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-sm text-slate-400 overflow-auto">
                  {output || 'Output will appear here...'}
                </pre>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-12">
              <div className="max-w-2xl w-full space-y-8 animate-in zoom-in-95 duration-500">
                <div className="text-center">
                  <div className="w-20 h-20 bg-blue-600/20 text-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <Mic className="w-10 h-10" />
                  </div>
                  <h3 className="text-3xl font-black mb-4">Phase: {session.phase.toUpperCase()}</h3>
                  <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl text-xl leading-relaxed text-slate-300 shadow-2xl">
                    {currentQuestion.text}
                  </div>
                </div>
                
                <div className="flex justify-center gap-4">
                  {isAISpeaking ? (
                    <div className="flex items-center gap-3 bg-blue-600/10 px-6 py-3 rounded-full border border-blue-500/30">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-6 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-6 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-6 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-sm font-bold text-blue-400">Interviewer Speaking...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 bg-green-600/10 px-6 py-3 rounded-full border border-green-500/30">
                      <Mic className="w-5 h-5 text-green-500" />
                      <span className="text-sm font-bold text-green-400">Listening for your answer...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer / Controls */}
      <div className="h-20 bg-slate-900 border-t border-slate-800 px-8 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-slate-400">Interview Session Live</span>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div className="text-sm text-slate-500">
            Current Phase: <span className="text-slate-200 font-bold capitalize">{session.phase}</span>
          </div>
        </div>

        <button 
          onClick={handleNextPhase}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
        >
          {session.currentQuestionIndex === session.questions.length - 1 ? 'Finish Interview' : 'Next Phase'}
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default InterviewRoom;
