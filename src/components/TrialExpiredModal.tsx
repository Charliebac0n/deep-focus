import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing } from '../theme';
import { usePremium } from '../context/PremiumContext';

export default function TrialExpiredModal() {
  const insets = useSafeAreaInsets();
  const { customerInfo, isTrialActive, isPremium, showPaywall } = usePremium();

  // Show when the user had a subscription entitlement before but it is no longer active
  const hadEntitlement = Boolean(customerInfo?.entitlements.all['premium']);
  const visible = hadEntitlement && !isPremium && !isTrialActive;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.card, { paddingBottom: Math.max(insets.bottom + 16, 32) }]}>
          <LinearGradient
            colors={['rgba(0,180,216,0.12)', 'transparent']}
            style={styles.glow}
            start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
          />

          <View style={styles.iconWrap}>
            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>🌊</Text>
            </LinearGradient>
          </View>

          <Text style={styles.title}>Your free trial has ended</Text>
          <Text style={styles.body}>
            Subscribe to Deep. Premium to keep your fish tank growing, unlock AI task coaching, and maintain your streak shield.
          </Text>

          <View style={styles.perksRow}>
            {['AI Task Coach', 'Ocean Creatures', 'Streak Shield'].map(perk => (
              <View key={perk} style={styles.perk}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
                <Text style={styles.perkText}>{perk}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity onPress={showPaywall} activeOpacity={0.88} style={styles.ctaWrap}>
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              style={styles.cta}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <Text style={styles.ctaText}>See Plans</Text>
              <Ionicons name="arrow-forward" size={18} color="white" />
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.note}>
            Your progress and sessions are always saved — subscribe anytime to unlock premium again.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  card: {
    width: '100%',
    backgroundColor: '#061828',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(0,180,216,0.2)',
    padding: Spacing.xl,
    alignItems: 'center',
    overflow: 'hidden',
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
  },
  iconWrap: { marginBottom: Spacing.lg },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  iconEmoji: { fontSize: 34 },

  title: {
    fontSize: Fonts.sizes.xl,
    fontWeight: Fonts.weights.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: Fonts.sizes.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },

  perksRow: { gap: 8, alignSelf: 'stretch', marginBottom: Spacing.xl },
  perk: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  perkText: { fontSize: Fonts.sizes.sm, color: Colors.textPrimary, fontWeight: Fonts.weights.medium },

  ctaWrap: { borderRadius: 18, overflow: 'hidden', alignSelf: 'stretch', marginBottom: Spacing.lg },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 18,
  },
  ctaText: { fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.bold, color: 'white' },

  note: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
});
