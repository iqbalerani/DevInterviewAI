import React from 'react';
import { Bell } from 'lucide-react';
import { UserSettings } from '../../types';
import ToggleSwitch from './ToggleSwitch';

interface NotificationsSectionProps {
  settings: UserSettings;
  onUpdate: (updates: Partial<UserSettings>) => void;
}

const NotificationsSection: React.FC<NotificationsSectionProps> = ({ settings, onUpdate }) => {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 space-y-2">
      <div className="flex items-center gap-3 mb-4">
        <Bell className="w-5 h-5 text-blue-400" />
        <h3 className="text-xl font-bold text-slate-100">Notifications</h3>
      </div>

      <ToggleSwitch
        label="Email Notifications"
        description="Receive updates about your interview results"
        enabled={settings.emailNotifications}
        onChange={(val) => onUpdate({ emailNotifications: val })}
      />
      <ToggleSwitch
        label="Interview Reminders"
        description="Get reminders for scheduled practice sessions"
        enabled={settings.interviewReminders}
        onChange={(val) => onUpdate({ interviewReminders: val })}
      />
      <ToggleSwitch
        label="Weekly Progress"
        description="Receive a weekly summary of your progress"
        enabled={settings.weeklyProgress}
        onChange={(val) => onUpdate({ weeklyProgress: val })}
      />
      <ToggleSwitch
        label="Achievement Alerts"
        description="Get notified when you earn new badges"
        enabled={settings.achievementAlerts}
        onChange={(val) => onUpdate({ achievementAlerts: val })}
      />
    </div>
  );
};

export default NotificationsSection;
