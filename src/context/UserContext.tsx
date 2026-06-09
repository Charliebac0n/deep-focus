import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseReady } from '../services/supabase';

const STORAGE_KEY = '@deep_user_v1';

export interface UserProfile {
  name: string;
  email: string;
  birthDate: string;   // 'YYYY-MM-DD'
  dailyGoal: number;
  onboardingComplete: boolean;
  joinedAt: string;
}

export interface OnboardingInput {
  name: string;
  email: string;
  password: string;
  birthDate: string;
  dailyGoal: number;
}

interface UserContextType {
  profile: UserProfile;
  profileLoaded: boolean;
  userId: string | null;
  saveProfile: (updates: Partial<UserProfile>) => Promise<void>;
  completeOnboarding: (input: OnboardingInput) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const DEFAULTS: UserProfile = {
  name: '',
  email: '',
  birthDate: '',
  dailyGoal: 8,
  onboardingComplete: false,
  joinedAt: '',
};

const UserContext = createContext<UserContextType>({
  profile: DEFAULTS,
  profileLoaded: false,
  userId: null,
  saveProfile: async () => {},
  completeOnboarding: async () => ({}),
  signOut: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(DEFAULTS);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try { setProfile(prev => ({ ...prev, ...JSON.parse(raw) })); } catch {}
      }
      setProfileLoaded(true);
    });

    if (!isSupabaseReady) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const persist = useCallback((p: UserProfile) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(p)).catch(() => {});
  }, []);

  const saveProfile = useCallback(async (updates: Partial<UserProfile>) => {
    setProfile(prev => {
      const next = { ...prev, ...updates };
      persist(next);
      return next;
    });
  }, [persist]);

  const completeOnboarding = useCallback(async (input: OnboardingInput): Promise<{ error?: string }> => {
    const { password, ...profileData } = input;

    if (isSupabaseReady) {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: profileData.email,
        password,
      });
      if (authError) return { error: authError.message };

      const uid = authData.user?.id;
      if (uid) {
        setUserId(uid);
        supabase.from('profiles').upsert({
          id: uid,
          name: profileData.name,
          birth_date: profileData.birthDate,
          daily_goal: profileData.dailyGoal,
          joined_at: new Date().toISOString(),
        }).then(undefined, console.warn);
      }
    }

    const next: UserProfile = {
      ...profileData,
      onboardingComplete: true,
      joinedAt: new Date().toISOString(),
    };
    setProfile(next);
    persist(next);
    return {};
  }, [persist]);

  const signOut = useCallback(async () => {
    if (isSupabaseReady) await supabase.auth.signOut().catch(console.warn);
    setUserId(null);
    const reset: UserProfile = { ...DEFAULTS };
    setProfile(reset);
    persist(reset);
  }, [persist]);

  return (
    <UserContext.Provider value={{ profile, profileLoaded, userId, saveProfile, completeOnboarding, signOut }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
