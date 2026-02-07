import React, { useRef, useState, useEffect } from 'react';
import { User, Mic2, Bell, Palette, Shield, Settings as SettingsIcon, FileText } from 'lucide-react';
import { useUserSettings } from '../hooks/useUserSettings';
import ProfileSection from '../components/settings/ProfileSection';
import ResumeSection from '../components/settings/ResumeSection';
import InterviewPrefsSection from '../components/settings/InterviewPrefsSection';
import NotificationsSection from '../components/settings/NotificationsSection';
import AppearanceSection from '../components/settings/AppearanceSection';
import DataPrivacySection from '../components/settings/DataPrivacySection';

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'resume', label: 'Resume', icon: FileText },
  { id: 'interview', label: 'Interview', icon: Mic2 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'data', label: 'Data & Privacy', icon: Shield },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

const Settings: React.FC = () => {
  const { settings, updateSettings, resetSettings } = useUserSettings();
  const [activeSection, setActiveSection] = useState<SectionId>('profile');
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollToSection = (id: SectionId) => {
    setActiveSection(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.getAttribute('data-section') as SectionId);
          }
        }
      },
      { rootMargin: '-20% 0px -60% 0px' }
    );

    Object.values(sectionRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <SettingsIcon className="w-7 h-7 text-blue-400" />
          <h1 className="text-3xl font-bold text-slate-100">Settings</h1>
        </div>
        <p className="text-slate-400 ml-10">Manage your account and preferences</p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar nav - sticky on desktop, horizontal scroll on mobile */}
        <nav className="hidden md:flex flex-col w-48 flex-shrink-0 sticky top-24 self-start space-y-1">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => scrollToSection(s.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                  activeSection === s.id
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {s.label}
              </button>
            );
          })}
        </nav>

        {/* Mobile nav */}
        <div className="md:hidden flex gap-2 overflow-x-auto pb-2 -mx-8 px-8 mb-4 w-[calc(100%+4rem)]">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => scrollToSection(s.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeSection === s.id
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 bg-slate-800/30'
                }`}
              >
                <Icon className="w-4 h-4" />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Section content */}
        <div className="flex-1 space-y-8 min-w-0">
          <div
            ref={(el) => { sectionRefs.current.profile = el; }}
            data-section="profile"
          >
            <ProfileSection settings={settings} onUpdate={updateSettings} />
          </div>
          <div
            ref={(el) => { sectionRefs.current.resume = el; }}
            data-section="resume"
          >
            <ResumeSection />
          </div>
          <div
            ref={(el) => { sectionRefs.current.interview = el; }}
            data-section="interview"
          >
            <InterviewPrefsSection settings={settings} onUpdate={updateSettings} />
          </div>
          <div
            ref={(el) => { sectionRefs.current.notifications = el; }}
            data-section="notifications"
          >
            <NotificationsSection settings={settings} onUpdate={updateSettings} />
          </div>
          <div
            ref={(el) => { sectionRefs.current.appearance = el; }}
            data-section="appearance"
          >
            <AppearanceSection settings={settings} onUpdate={updateSettings} />
          </div>
          <div
            ref={(el) => { sectionRefs.current.data = el; }}
            data-section="data"
          >
            <DataPrivacySection onReset={resetSettings} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
