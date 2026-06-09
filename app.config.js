import 'dotenv/config';

const RC_API_KEY_IOS = 'test_WvmqJbGpVomRFyzOgcyxoUvnUYl';

export default {
  expo: {
    name: 'Deep.',
    slug: 'deep-focus',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'dark',
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#020B18',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.deep.focus',
      buildNumber: '1',
      infoPlist: {
        NSUserNotificationUsageDescription: 'Deep. sends reminders to start focus sessions and celebrates your streaks.',
      },
    },
    android: {
      package: 'com.deep.focus',
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#020B18',
      },
    },
    plugins: [
      'expo-font',
      'expo-audio',
      'expo-secure-store',
    ],
    extra: {
      supabaseUrl: process.env.SUPABASE_URL ?? '',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
      rcApiKeyIos: RC_API_KEY_IOS,
    },
  },
};
