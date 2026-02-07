
import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import InterviewSetup from './pages/InterviewSetup';
import InterviewRoom from './pages/InterviewRoom';
import Results from './pages/Results';
import Analyzer from './pages/Analyzer';
import Certificates from './pages/Certificates';
import Flashcards from './pages/Flashcards';
import Quiz from './pages/Quiz';
import Settings from './pages/Settings';
import { useAuthStore } from './store/authStore';

const App: React.FC = () => {
  const location = useLocation();
  const { isLoading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const isInterviewRoom = location.pathname.includes('/interview/room');
  const isAuthPage = ['/', '/login', '/signup'].includes(location.pathname);
  const showLayout = !isInterviewRoom && !isAuthPage;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-blue-500/30">
      {showLayout && <Sidebar />}

      <main className="flex-1 flex flex-col min-w-0">
        {showLayout && <Header />}

        <div className={`flex-1 overflow-y-auto ${showLayout ? 'bg-slate-950' : ''}`}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/interview/setup" element={<ProtectedRoute><InterviewSetup /></ProtectedRoute>} />
            <Route path="/interview/room/:sessionId" element={<ProtectedRoute><InterviewRoom /></ProtectedRoute>} />
            <Route path="/interview/results/:sessionId" element={<ProtectedRoute><Results /></ProtectedRoute>} />
            <Route path="/analyzer" element={<ProtectedRoute><Analyzer /></ProtectedRoute>} />
            <Route path="/flashcards" element={<ProtectedRoute><Flashcards /></ProtectedRoute>} />
            <Route path="/quiz" element={<ProtectedRoute><Quiz /></ProtectedRoute>} />
            <Route path="/certificates" element={<ProtectedRoute><Certificates /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default App;
