import React, { useState } from 'react';
import { User } from 'lucide-react';
import { UserSettings } from '../../types';

const AVATAR_COLORS = [
  'bg-blue-600',
  'bg-purple-600',
  'bg-green-600',
  'bg-orange-500',
  'bg-rose-600',
  'bg-cyan-600',
];

interface ProfileSectionProps {
  settings: UserSettings;
  onUpdate: (updates: Partial<UserSettings>) => void;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({ settings, onUpdate }) => {
  const [localName, setLocalName] = useState(settings.fullName);
  const [localEmail, setLocalEmail] = useState(settings.email);
  const [localRole, setLocalRole] = useState(settings.role);
  const [localBio, setLocalBio] = useState(settings.bio);
  const [saved, setSaved] = useState(false);

  const initials = settings.fullName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSave = () => {
    onUpdate({
      fullName: localName,
      email: localEmail,
      role: localRole,
      bio: localBio,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputClass =
    'bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all w-full';

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 space-y-6">
      <div className="flex items-center gap-3">
        <User className="w-5 h-5 text-blue-400" />
        <h3 className="text-xl font-bold text-slate-100">Profile</h3>
      </div>

      <div className="flex items-center gap-6">
        <div
          className={`w-20 h-20 rounded-full ${settings.avatarColor} flex items-center justify-center text-white text-2xl font-bold flex-shrink-0`}
        >
          {initials || 'JD'}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-300 mb-2">Avatar Color</p>
          <div className="flex gap-2">
            {AVATAR_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => onUpdate({ avatarColor: color })}
                className={`w-8 h-8 rounded-full ${color} transition-all ${
                  settings.avatarColor === color
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800'
                    : 'hover:scale-110'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
          <input
            type="text"
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            className={inputClass}
            placeholder="Your full name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
          <input
            type="email"
            value={localEmail}
            onChange={(e) => setLocalEmail(e.target.value)}
            className={inputClass}
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Role / Title</label>
        <input
          type="text"
          value={localRole}
          onChange={(e) => setLocalRole(e.target.value)}
          className={inputClass}
          placeholder="e.g. Frontend Developer"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Bio</label>
        <textarea
          rows={3}
          value={localBio}
          onChange={(e) => setLocalBio(e.target.value)}
          className={inputClass + ' resize-none'}
          placeholder="Tell us about yourself..."
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          Save Profile
        </button>
        {saved && <span className="text-sm text-green-400 animate-pulse">Saved!</span>}
      </div>
    </div>
  );
};

export default ProfileSection;
