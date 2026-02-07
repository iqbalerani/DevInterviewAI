const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';
const TOKEN_KEY = 'devproof-auth-token';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export const interviewService = {
  async createSession(resumeData: any, jobDescription: string, questions: any[]) {
    const response = await fetch(`${API_BASE_URL}/api/sessions/create`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ resumeData, jobDescription, questions })
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.session;
  },

  async getSession(sessionId: string) {
    const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.session;
  },

  async updateSession(sessionId: string, updates: any) {
    const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates)
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.session;
  },

  async getTranscripts(sessionId: string) {
    const response = await fetch(`${API_BASE_URL}/api/transcripts/${sessionId}`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.transcripts;
  },

  async evaluateSession(sessionId: string, force?: boolean) {
    const url = force
      ? `${API_BASE_URL}/api/evaluations/${sessionId}/evaluate?force=true`
      : `${API_BASE_URL}/api/evaluations/${sessionId}/evaluate`;
    const response = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders()
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.evaluation;
  },

  async getEvaluation(sessionId: string) {
    const response = await fetch(`${API_BASE_URL}/api/evaluations/${sessionId}`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.evaluation;
  },

  async calculateMatchScore(resume: string, jd: string) {
    const response = await fetch(`${API_BASE_URL}/api/resume/match-score`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ resume, jd })
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },

  async generateInterviewPlan(resume: string, jd: string, difficulty: string) {
    const response = await fetch(`${API_BASE_URL}/api/resume/generate-plan`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ resume, jd, difficulty })
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.questions;
  },

  async getCertificates() {
    const response = await fetch(`${API_BASE_URL}/api/evaluations`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.certificates;
  },

  async getDashboardStats() {
    const response = await fetch(`${API_BASE_URL}/api/dashboard/stats`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },

  async analyzeResume(resume: string) {
    const response = await fetch(`${API_BASE_URL}/api/resume/analyze`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ resume })
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },

  async uploadResume(fileName: string, fileType: string, fileData: string) {
    const response = await fetch(`${API_BASE_URL}/api/user/resume`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ fileName, fileType, fileData })
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.resume;
  },

  async getSavedResume() {
    const response = await fetch(`${API_BASE_URL}/api/user/resume`, {
      headers: getAuthHeaders()
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.resume;
  },

  async getSavedResumeText() {
    const response = await fetch(`${API_BASE_URL}/api/user/resume/text`, {
      headers: getAuthHeaders()
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return { extractedText: data.extractedText, fileName: data.fileName };
  },

  async deleteSavedResume() {
    const response = await fetch(`${API_BASE_URL}/api/user/resume`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return true;
  }
};
