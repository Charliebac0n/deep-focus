import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra as Record<string, string> | undefined;
const supabaseUrl = extra?.supabaseUrl ?? '';
const supabaseAnonKey = extra?.supabaseAnonKey ?? '';

export const isSupabaseReady = Boolean(supabaseUrl && supabaseAnonKey);

const SecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
