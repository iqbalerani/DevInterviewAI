const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export const interviewService = {
  /**
   * Create a new interview session
   */
  async createSession(resumeData: any, jobDescription: string, questions: any[]) {
    const response = await fetch(`${API_BASE_URL}/api/sessions/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeData, jobDescription, questions })
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.session;
  },

  /**
   * Get session by ID
   */
  async getSession(sessionId: string) {
    const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.session;
  },

  /**
   * Update session
   */
  async updateSession(sessionId: string, updates: any) {
    const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.session;
  },

  /**
   * Get all transcripts for a session
   */
  async getTranscripts(sessionId: string) {
    const response = await fetch(`${API_BASE_URL}/api/transcripts/${sessionId}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.transcripts;
  },

  /**
   * Evaluate interview session
   */
  async evaluateSession(sessionId: string, force?: boolean) {
    const url = force
      ? `${API_BASE_URL}/api/evaluations/${sessionId}/evaluate?force=true`
      : `${API_BASE_URL}/api/evaluations/${sessionId}/evaluate`;
    const response = await fetch(url, {
      method: 'POST'
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.evaluation;
  },

  /**
   * Get evaluation for a session
   */
  async getEvaluation(sessionId: string) {
    const response = await fetch(`${API_BASE_URL}/api/evaluations/${sessionId}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.evaluation;
  },

  /**
   * Calculate resume-JD match score
   */
  async calculateMatchScore(resume: string, jd: string) {
    const response = await fetch(`${API_BASE_URL}/api/resume/match-score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume, jd })
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },

  /**
   * Generate interview plan from resume and JD
   */
  async generateInterviewPlan(resume: string, jd: string, difficulty: string) {
    const response = await fetch(`${API_BASE_URL}/api/resume/generate-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume, jd, difficulty })
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.questions;
  },

  /**
   * Get aggregated dashboard stats
   */
  async getDashboardStats() {
    const response = await fetch(`${API_BASE_URL}/api/dashboard/stats`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },

  /**
   * Analyze resume for skill gaps
   */
  async analyzeResume(resume: string) {
    const response = await fetch(`${API_BASE_URL}/api/resume/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume })
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }
};
