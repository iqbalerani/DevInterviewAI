
import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import InterviewSetup from './pages/InterviewSetup';
import InterviewRoom from './pages/InterviewRoom';
import Results from './pages/Results';
import Analyzer from './pages/Analyzer';
import Certificates from './pages/Certificates';

const App: React.FC = () => {
  const location = useLocation();
  const isInterviewRoom = location.pathname.includes('/interview/room');

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-blue-500/30">
      {!isInterviewRoom && <Sidebar />}
      
      <main className="flex-1 flex flex-col min-w-0">
        {!isInterviewRoom && <Header />}
        
        <div className={`flex-1 overflow-y-auto ${!isInterviewRoom ? 'bg-slate-950' : ''}`}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/interview/setup" element={<InterviewSetup />} />
            <Route path="/interview/room/:sessionId" element={<InterviewRoom />} />
            <Route path="/interview/results/:sessionId" element={<Results />} />
            <Route path="/analyzer" element={<Analyzer />} />
            <Route path="/certificates" element={<Certificates />} />
            <Route path="/settings" element={<div className="p-8"><h2 className="text-2xl font-bold">Account Settings coming soon...</h2></div>} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default App;
