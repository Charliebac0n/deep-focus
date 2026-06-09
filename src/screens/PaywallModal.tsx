import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PurchasesError, PURCHASES_ERROR_CODE } from 'react-native-purchases';
import { Colors, Fonts, Spacing } from '../theme';
import { usePremium } from '../context/PremiumContext';

const FEATURES = [
  { icon: 'sparkles' as const,                title: 'AI Task Coach',        desc: 'Plan & prioritise any task in seconds' },
  { icon: 'fish-outline' as const,            title: 'All Ocean Creatures',  desc: 'Unlock 7 rare deep sea companions' },
  { icon: 'trophy-outline' as const,          title: 'Daily Challenges',     desc: 'Earn bonus XP with daily goals' },
  { icon: 'bar-chart-outline' as const,       title: 'Full Stats & History', desc: 'Track your progress week by week' },
  { icon: 'shield-checkmark-outline' as const, title: 'Streak Shield',       desc: 'Never lose your streak on rest days' },
];

const PRIVACY_URL = 'https://deep-focus.app/privacy';
const TERMS_URL   = 'https://deep-focus.app/terms';

export default function PaywallModal() {
  const insets = useSafeAreaInsets();
  const {
    paywallVisible,
    offering,
    purchasing,
    restoring,
    dismissPaywall,
    startTrial,
    purchasePackage,
    restorePurchases,
  } = usePremium();

  const [billing, setBilling] = useState<'yearly' | 'monthly'>('yearly');

  const annualPkg  = offering?.annual;
  const monthlyPkg = offering?.monthly;

  const yearlyPrice  = annualPkg?.product.priceString  ?? '£30.00';
  const monthlyPrice = monthlyPkg?.product.priceString ?? '£2.99';
  const yearlyMonthly = annualPkg
    ? `£${(annualPkg.product.price / 12).toFixed(2)}/mo`
    : '£2.50/mo';

  const selectedPkg = billing === 'yearly' ? annualPkg : monthlyPkg;
  const hasTrialOnYearly = Boolean(
    annualPkg?.product.introPrice?.periodNumberOfUnits
  );

  const ctaLabel = billing === 'yearly' && hasTrialOnYearly
    ? 'Start 7-Day Free Trial'
    : `Subscribe — ${billing === 'yearly' ? yearlyPrice + '/yr' : monthlyPrice + '/mo'}`;

  const busy = purchasing || restoring;

  async function handleCta() {
    if (!selectedPkg) {
      // RevenueCat not configured yet — dev fallback
      dismissPaywall();
      return;
    }
    try {
      await purchasePackage(selectedPkg);
    } catch (err) {
      const rcErr = err as PurchasesError;
      if (rcErr.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return;
      Alert.alert('Purchase failed', rcErr.message ?? 'Please try again.');
    }
  }

  async function handleRestore() {
    try {
      await restorePurchases();
      Alert.alert('Restored', 'Your purchases have been restored.');
    } catch {
      Alert.alert('Restore failed', 'No previous purchases found for this Apple ID.');
    }
  }

  return (
    <Modal
      visible={paywallVisible}
      transparent
      animationType="slide"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 8, 24) }]}>
          {/* Close */}
          <TouchableOpacity
            onPress={dismissPaywall}
            style={styles.closeBtn}
            hitSlop={{ top: 14, right: 14, bottom: 14, left: 14 }}
            disabled={busy}
          >
            <Ionicons name="close" size={20} color={Colors.textMuted} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

            {/* Hero */}
            <LinearGradient
              colors={['rgba(0,180,216,0.18)', 'transparent']}
              style={styles.hero}
              start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
            >
              <Text style={styles.heroEmoji}>🌊</Text>
              <Text style={styles.headline}>Deep. Premium</Text>
              <Text style={styles.tagline}>Unlock your full focus potential</Text>
            </LinearGradient>

            {/* Feature list */}
            <View style={styles.features}>
              {FEATURES.map(f => (
                <View key={f.title} style={styles.featureRow}>
                  <View style={styles.featureIconWrap}>
                    <Ionicons name={f.icon} size={16} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.featureTitle}>{f.title}</Text>
                    <Text style={styles.featureDesc}>{f.desc}</Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={18} color={Colors.primary} style={{ opacity: 0.75 }} />
                </View>
              ))}
            </View>

            {/* Pricing toggle */}
            <View style={styles.pricingRow}>
              <TouchableOpacity
                style={[styles.pricingCard, billing === 'monthly' && styles.pricingCardActive]}
                onPress={() => setBilling('monthly')}
                activeOpacity={0.8}
                disabled={busy}
              >
                <Text style={[styles.pricingLabel, billing === 'monthly' && { color: Colors.textSecondary }]}>Monthly</Text>
                <Text style={[styles.pricingAmount, billing === 'monthly' && { color: Colors.primary }]}>{monthlyPrice}</Text>
                <Text style={[styles.pricingPer, billing === 'monthly' && { color: Colors.textMuted }]}>per month</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pricingCard, billing === 'yearly' && styles.pricingCardActive]}
                onPress={() => setBilling('yearly')}
                activeOpacity={0.8}
                disabled={busy}
              >
                <View style={styles.savePill}>
                  <Text style={styles.savePillText}>BEST VALUE</Text>
                </View>
                <Text style={[styles.pricingLabel, billing === 'yearly' && { color: Colors.textSecondary }]}>Yearly</Text>
                <Text style={[styles.pricingAmount, billing === 'yearly' && { color: Colors.primary }]}>{yearlyPrice}</Text>
                <Text style={[styles.pricingPer, billing === 'yearly' && { color: Colors.textMuted }]}>per year · {yearlyMonthly}</Text>
              </TouchableOpacity>
            </View>

            {/* CTA */}
            <TouchableOpacity
              onPress={handleCta}
              activeOpacity={0.88}
              style={styles.ctaWrap}
              disabled={busy}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                style={styles.cta}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                {busy && purchasing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Text style={styles.ctaText}>{ctaLabel}</Text>
                    <Ionicons name="arrow-forward" size={18} color="white" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Apple required subscription disclosure */}
            <Text style={styles.legalText}>
              {billing === 'yearly' && hasTrialOnYearly
                ? `7-day free trial, then ${yearlyPrice}/year. `
                : billing === 'yearly'
                  ? `${yearlyPrice}/year. `
                  : `${monthlyPrice}/month. `}
              Payment charged to your Apple ID at confirmation. Subscription automatically renews unless cancelled at least 24 hours before the end of the current period. Manage or cancel in your App Store account settings. Cancelling does not end your current subscription period.
            </Text>

            <View style={styles.legalLinks}>
              <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)}>
                <Text style={styles.legalLink}>Privacy Policy</Text>
              </TouchableOpacity>
              <Text style={styles.legalDot}>·</Text>
              <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)}>
                <Text style={styles.legalLink}>Terms of Use</Text>
              </TouchableOpacity>
            </View>

            {/* Restore */}
            <TouchableOpacity
              onPress={handleRestore}
              style={styles.restoreBtn}
              activeOpacity={0.7}
              disabled={busy}
            >
              {restoring ? (
                <ActivityIndicator size="small" color={Colors.textMuted} />
              ) : (
                <Text style={styles.restoreText}>Restore Purchases</Text>
              )}
            </TouchableOpacity>

            {/* Continue free */}
            <TouchableOpacity onPress={dismissPaywall} style={styles.skipBtn} activeOpacity={0.7} disabled={busy}>
              <Text style={styles.skipText}>Continue for Free</Text>
            </TouchableOpacity>
            <Text style={styles.skipNote}>Free plan: Pomodoro timer + manual tasks only</Text>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#061828',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: 'rgba(0,180,216,0.2)',
    maxHeight: '92%',
    overflow: 'hidden',
  },

  closeBtn: {
    position: 'absolute', top: 16, right: 20, zIndex: 10,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },

  hero: {
    alignItems: 'center',
    paddingTop: Spacing.xl + 8,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  heroEmoji: { fontSize: 52, marginBottom: 10 },
  headline: {
    fontSize: 28, fontWeight: Fonts.weights.black,
    color: Colors.textPrimary, letterSpacing: -0.5, marginBottom: 6,
  },
  tagline: {
    fontSize: Fonts.sizes.base, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 22,
  },

  features: { marginHorizontal: Spacing.lg, marginBottom: Spacing.lg, gap: 2 },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(0,180,216,0.05)',
    borderRadius: 14, padding: 14, marginBottom: 4,
    borderWidth: 1, borderColor: 'rgba(0,180,216,0.1)',
  },
  featureIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(0,180,216,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  featureTitle: {
    fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.semibold,
    color: Colors.textPrimary, marginBottom: 2,
  },
  featureDesc: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary },

  pricingRow: {
    flexDirection: 'row', gap: Spacing.sm,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.lg,
  },
  pricingCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18, borderWidth: 1.5, borderColor: Colors.border,
    padding: Spacing.md, alignItems: 'center', gap: 2,
    position: 'relative', paddingTop: 22,
  },
  pricingCardActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(0,180,216,0.08)',
  },
  savePill: {
    position: 'absolute', top: -10,
    backgroundColor: Colors.primary, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  savePillText: { fontSize: 9, fontWeight: Fonts.weights.bold, color: 'white', letterSpacing: 0.5 },
  pricingLabel: { fontSize: Fonts.sizes.xs, color: Colors.textMuted, fontWeight: Fonts.weights.medium, textTransform: 'uppercase', letterSpacing: 0.5 },
  pricingAmount: { fontSize: 26, fontWeight: Fonts.weights.black, color: Colors.textPrimary, marginTop: 2 },
  pricingPer: { fontSize: Fonts.sizes.xs, color: Colors.textMuted, textAlign: 'center' },

  ctaWrap: { marginHorizontal: Spacing.lg, borderRadius: 18, overflow: 'hidden', marginBottom: Spacing.md },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 18, minHeight: 56,
  },
  ctaText: { fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.bold, color: 'white' },

  legalText: {
    fontSize: 11, color: Colors.textMuted, textAlign: 'center', lineHeight: 16,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.sm,
  },
  legalLinks: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 6, marginBottom: Spacing.lg,
  },
  legalLink: { fontSize: 11, color: Colors.primary, textDecorationLine: 'underline' },
  legalDot: { fontSize: 11, color: Colors.textMuted },

  restoreBtn: { alignItems: 'center', paddingVertical: 8, marginBottom: 4 },
  restoreText: { fontSize: Fonts.sizes.sm, color: Colors.textMuted },

  skipBtn: { alignItems: 'center', paddingVertical: 8, marginBottom: 4 },
  skipText: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, fontWeight: Fonts.weights.medium },
  skipNote: { fontSize: Fonts.sizes.xs, color: Colors.textMuted, textAlign: 'center', marginBottom: Spacing.sm },
});
