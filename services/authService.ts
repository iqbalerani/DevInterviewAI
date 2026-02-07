const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export const authService = {
  async signup(fullName: string, email: string, password: string) {
    const res = await fetch(`${API_BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, password })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return { token: data.token as string, user: data.user };
  },

  async login(email: string, password: string) {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return { token: data.token as string, user: data.user };
  }
};
