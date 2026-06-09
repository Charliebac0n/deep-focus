import './src/polyfills';
import { registerRootComponent } from 'expo';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import TabNavigator from './src/navigation/TabNavigator';
import { StatsProvider } from './src/context/StatsContext';
import { SettingsProvider } from './src/context/SettingsContext';
import { TasksProvider } from './src/context/TasksContext';
import { UserProvider, useUser } from './src/context/UserContext';
import { PremiumProvider } from './src/context/PremiumContext';
import SettingsModal from './src/components/SettingsModal';
import OnboardingScreen from './src/screens/OnboardingScreen';
import PaywallModal from './src/screens/PaywallModal';
import TrialExpiredModal from './src/components/TrialExpiredModal';
import { Colors, Fonts } from './src/theme';

function Splash() {
  return (
    <LinearGradient colors={['#020B18', '#041525', '#020B18']} style={StyleSheet.absoluteFill}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 72, fontWeight: '900', color: Colors.textPrimary, letterSpacing: -3 }}>
          Deep.
        </Text>
        <Text style={{ fontSize: Fonts.sizes.sm, color: Colors.textMuted, marginTop: 8 }}>
          Loading...
        </Text>
      </View>
    </LinearGradient>
  );
}

function AppContent() {
  const { profile, profileLoaded } = useUser();

  if (!profileLoaded) return <Splash />;

  if (!profile.onboardingComplete) return <OnboardingScreen />;

  return (
    <>
      <NavigationContainer>
        <StatusBar style="light" />
        <TabNavigator />
        <SettingsModal />
      </NavigationContainer>
      <PaywallModal />
      <TrialExpiredModal />
    </>
  );
}

function App() {
  return (
    <View style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatsProvider>
          <UserProvider>
            <SettingsProvider>
              <TasksProvider>
                <PremiumProvider>
                  <AppContent />
                </PremiumProvider>
              </TasksProvider>
            </SettingsProvider>
          </UserProvider>
        </StatsProvider>
      </SafeAreaProvider>
    </View>
  );
}

registerRootComponent(App);
