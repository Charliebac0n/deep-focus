import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@deep_settings';

export interface Settings {
  userName: string;
  focusDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  autoStartBreaks: boolean;
  autoStartSessions: boolean;
  longBreakInterval: number;
  autoCheckTasks: boolean;
  moveCompletedToBottom: boolean;
  alarmSound: string;
  alarmVolume: number;
  focusSound: string;
  focusVolume: number;
  colorTheme: string;
  darkMode: boolean;
  hourFormat: string;
  sessionEndNotification: boolean;
  breakEndNotification: boolean;
  reminder: string;
}

export const DEFAULTS: Settings = {
  userName: '',
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  autoStartBreaks: false,
  autoStartSessions: false,
  longBreakInterval: 4,
  autoCheckTasks: false,
  moveCompletedToBottom: true,
  alarmSound: 'Bell',
  alarmVolume: 50,
  focusSound: 'None',
  focusVolume: 50,
  colorTheme: '#6d8fad',
  darkMode: true,
  hourFormat: '12-hour',
  sessionEndNotification: true,
  breakEndNotification: true,
  reminder: 'None',
};

interface SettingsContextType {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  saveSettings: () => Promise<void>;
  settingsVisible: boolean;
  setSettingsVisible: (v: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULTS,
  updateSetting: () => {},
  saveSettings: async () => {},
  settingsVisible: false,
  setSettingsVisible: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [settingsVisible, setSettingsVisible] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try { setSettings({ ...DEFAULTS, ...JSON.parse(raw) }); } catch {}
      }
    });
  }, []);

  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const saveSettings = useCallback(async () => {
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch {}
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, saveSettings, settingsVisible, setSettingsVisible }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
