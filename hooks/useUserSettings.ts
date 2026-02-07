import { useState, useEffect } from 'react';
import { UserSettings } from '../types';
import { useAuthStore } from '../store/authStore';

function getStorageKey(userId: string) {
  return `devproof-user-settings-${userId}`;
}

const DEFAULT_SETTINGS: UserSettings = {
  fullName: 'John Developer',
  email: '',
  role: 'Software Developer',
  bio: '',
  avatarColor: 'bg-blue-600',

  defaultDifficulty: 'mid',
  sessionDuration: 120,
  preferredLanguage: 'Python',

  emailNotifications: true,
  interviewReminders: true,
  weeklyProgress: false,
  achievementAlerts: true,

  theme: 'dark',
  accentColor: 'blue',
};

let listeners: Array<() => void> = [];

function emitChange() {
  listeners.forEach((fn) => fn());
}

function load(userId: string): UserSettings {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS;
}

export function useUserSettings() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? 'anonymous';
  const [settings, setSettings] = useState<UserSettings>(() => load(userId));

  useEffect(() => {
    setSettings(load(userId));
  }, [userId]);

  useEffect(() => {
    const handler = () => setSettings(load(userId));
    listeners.push(handler);
    return () => {
      listeners = listeners.filter((l) => l !== handler);
    };
  }, [userId]);

  const updateSettings = (updates: Partial<UserSettings>) => {
    const next = { ...load(userId), ...updates };
    localStorage.setItem(getStorageKey(userId), JSON.stringify(next));
    emitChange();
  };

  const resetSettings = () => {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(DEFAULT_SETTINGS));
    emitChange();
  };

  return { settings, updateSettings, resetSettings };
}
