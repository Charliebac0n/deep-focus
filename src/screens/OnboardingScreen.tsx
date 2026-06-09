import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing } from '../theme';
import { useUser } from '../context/UserContext';
import { useSettings } from '../context/SettingsContext';

const { width: W } = Dimensions.get('window');
const TOTAL_STEPS = 4; // 0=Welcome, 1=Profile, 2=Birthday, 3=Goal

const GOAL_OPTIONS = [
  { value: 4,  label: '4',  sub: 'Light',   emoji: '🌱' },
  { value: 6,  label: '6',  sub: 'Steady',  emoji: '🌊' },
  { value: 8,  label: '8',  sub: 'Deep',    emoji: '🔥' },
  { value: 12, label: '12', sub: 'Intense', emoji: '⚡' },
];

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

function isValidDate(d: string, m: string, y: string) {
  const day = parseInt(d), mon = parseInt(m), yr = parseInt(y);
  if (!day || !mon || !yr) return false;
  if (day < 1 || day > 31 || mon < 1 || mon > 12) return false;
  if (yr < 1900 || yr > new Date().getFullYear() - 5) return false;
  const dt = new Date(yr, mon - 1, day);
  return dt.getDate() === day && dt.getMonth() === mon - 1;
}

// ─── Progress dots ────────────────────────────────────────────────────────────
function ProgressDots({ step }: { step: number }) {
  return (
    <View style={pd.row}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[
            pd.dot,
            i < step && pd.dotDone,
            i === step && pd.dotActive,
          ]}
        />
      ))}
    </View>
  );
}
const pd = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)' },
  dotDone: { backgroundColor: Colors.primary, width: 6 },
  dotActive: { backgroundColor: Colors.primary, width: 22, borderRadius: 3 },
});

// ─── Field component ──────────────────────────────────────────────────────────
function Field({
  label, value, onChangeText, placeholder, keyboardType = 'default',
  autoCapitalize = 'words', error, maxLength, returnKeyType = 'next',
  onSubmitEditing, secureTextEntry = false,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder: string; keyboardType?: any; autoCapitalize?: any;
  error?: string; maxLength?: number; returnKeyType?: any;
  onSubmitEditing?: () => void; secureTextEntry?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={fi.wrap}>
      <Text style={fi.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[fi.input, focused && fi.inputFocused, !!error && fi.inputError]}
        autoCorrect={false}
        secureTextEntry={secureTextEntry}
      />
      {!!error && (
        <View style={fi.errorRow}>
          <Ionicons name="alert-circle-outline" size={12} color={Colors.danger} />
          <Text style={fi.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}
const fi = StyleSheet.create({
  wrap: { marginBottom: Spacing.md },
  label: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, fontWeight: Fonts.weights.semibold, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  input: { backgroundColor: Colors.bgCard, borderRadius: 14, paddingHorizontal: Spacing.md, paddingVertical: 16, fontSize: Fonts.sizes.base, color: Colors.textPrimary, borderWidth: 1.5, borderColor: Colors.border },
  inputFocused: { borderColor: Colors.primary, backgroundColor: 'rgba(0,180,216,0.06)' },
  inputError: { borderColor: Colors.danger },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  errorText: { fontSize: Fonts.sizes.xs, color: Colors.danger },
});

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useUser();
  const { updateSetting, saveSettings } = useSettings();

  const [step, setStep] = useState(0);

  // Profile fields
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');

  // Birthday fields
  const [bDay, setBDay]     = useState('');
  const [bMonth, setBMonth] = useState('');
  const [bYear, setBYear]   = useState('');

  // Goal
  const [dailyGoal, setDailyGoal] = useState(8);

  // Errors / loading
  const [nameError, setNameError]       = useState('');
  const [emailError, setEmailError]     = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [dateError, setDateError]       = useState('');
  const [authError, setAuthError]       = useState('');
  const [submitting, setSubmitting]     = useState(false);

  // Animation
  const fadeAnim  = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const advance = (next: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -24, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setStep(next);
      slideAnim.setValue(24);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    });
  };

  const handleNext = async () => {
    if (step === 0) {
      advance(1);
      return;
    }

    if (step === 1) {
      let ok = true;
      if (!name.trim()) { setNameError('Please enter your name'); ok = false; } else setNameError('');
      if (!isValidEmail(email)) { setEmailError('Enter a valid email address'); ok = false; } else setEmailError('');
      if (password.length < 8) { setPasswordError('Password must be at least 8 characters'); ok = false; } else setPasswordError('');
      if (ok) advance(2);
      return;
    }

    if (step === 2) {
      if (!isValidDate(bDay, bMonth, bYear)) {
        setDateError('Please enter a valid date of birth');
        return;
      }
      setDateError('');
      advance(3);
      return;
    }

    if (step === 3) {
      setSubmitting(true);
      setAuthError('');
      const birthDate = `${bYear.padStart(4, '0')}-${bMonth.padStart(2, '0')}-${bDay.padStart(2, '0')}`;
      updateSetting('userName', name.trim());
      await saveSettings();
      const result = await completeOnboarding({
        name: name.trim(),
        email: email.trim(),
        password,
        birthDate,
        dailyGoal,
      });
      if (result.error) {
        setAuthError(result.error);
        setSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (step > 0) advance(step - 1);
  };

  const canProceed = () => {
    if (step === 1) return name.trim().length > 0 && email.trim().length > 0 && password.length >= 8;
    if (step === 2) return bDay.length > 0 && bMonth.length > 0 && bYear.length === 4;
    return true;
  };

  return (
    <LinearGradient colors={['#020B18', '#041525', '#031A30']} style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back button */}
          {step > 0 && (
            <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}

          {step > 0 && <ProgressDots step={step - 1} />}

          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

            {/* ── Step 0: Welcome ───────────────────────── */}
            {step === 0 && (
              <View style={styles.stepContainer}>
                <View style={styles.welcomeCreatures}>
                  <Text style={styles.welcomeCreature}>🐠</Text>
                  <Text style={[styles.welcomeCreature, { fontSize: 52, marginTop: 16 }]}>🐬</Text>
                  <Text style={styles.welcomeCreature}>🐙</Text>
                </View>

                <Text style={styles.appName}>Deep.</Text>
                <Text style={styles.welcomeTagline}>Your personal focus sanctuary</Text>

                <View style={styles.featureList}>
                  {[
                    { icon: 'timer-outline',          text: 'Pomodoro timer with smart breaks' },
                    { icon: 'sparkles-outline',        text: 'AI-powered task planning' },
                    { icon: 'fish-outline',            text: 'Ocean rewards as you focus' },
                  ].map(f => (
                    <View key={f.text} style={styles.featureRow}>
                      <View style={styles.featureIconWrap}>
                        <Ionicons name={f.icon as any} size={16} color={Colors.primary} />
                      </View>
                      <Text style={styles.featureText}>{f.text}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity onPress={handleNext} activeOpacity={0.85} style={styles.primaryBtnWrap}>
                  <LinearGradient
                    colors={[Colors.primary, Colors.primaryDark]}
                    style={styles.primaryBtn}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.primaryBtnText}>Begin Your Journey</Text>
                    <Ionicons name="arrow-forward" size={18} color="white" />
                  </LinearGradient>
                </TouchableOpacity>

                <Text style={styles.privacyNote}>
                  Your data stays private and secure. No spam, ever.
                </Text>
              </View>
            )}

            {/* ── Step 1: Profile ───────────────────────── */}
            {step === 1 && (
              <View style={styles.stepContainer}>
                <View style={styles.stepIconCircle}>
                  <Text style={{ fontSize: 28 }}>👋</Text>
                </View>
                <Text style={styles.stepTitle}>Nice to meet you</Text>
                <Text style={styles.stepSubtitle}>
                  Tell us a little about yourself so we can personalise your experience.
                </Text>

                <View style={styles.fields}>
                  <Field
                    label="Your Name"
                    value={name}
                    onChangeText={v => { setName(v); setNameError(''); }}
                    placeholder="e.g. Alex"
                    autoCapitalize="words"
                    maxLength={40}
                    error={nameError}
                    returnKeyType="next"
                  />
                  <Field
                    label="Email Address"
                    value={email}
                    onChangeText={v => { setEmail(v); setEmailError(''); }}
                    placeholder="you@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    maxLength={120}
                    error={emailError}
                    returnKeyType="next"
                  />
                  <Field
                    label="Password"
                    value={password}
                    onChangeText={v => { setPassword(v); setPasswordError(''); }}
                    placeholder="Min. 8 characters"
                    autoCapitalize="none"
                    maxLength={128}
                    error={passwordError}
                    returnKeyType="done"
                    secureTextEntry
                  />
                </View>

                <ContinueButton onPress={handleNext} enabled={canProceed()} />
              </View>
            )}

            {/* ── Step 2: Birthday ──────────────────────── */}
            {step === 2 && (
              <View style={styles.stepContainer}>
                <View style={styles.stepIconCircle}>
                  <Text style={{ fontSize: 28 }}>🎂</Text>
                </View>
                <Text style={styles.stepTitle}>Date of Birth</Text>
                <Text style={styles.stepSubtitle}>
                  We'll celebrate your birthday with a special ocean event. 🌊
                </Text>

                <View style={styles.dateRow}>
                  <View style={styles.dateField}>
                    <Text style={fi.label}>Day</Text>
                    <TextInput
                      value={bDay}
                      onChangeText={v => { setBDay(v.replace(/[^0-9]/g, '').slice(0, 2)); setDateError(''); }}
                      placeholder="DD"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="number-pad"
                      maxLength={2}
                      style={[fi.input, styles.dateInput]}
                      textAlign="center"
                    />
                  </View>
                  <View style={styles.dateSeparator}>
                    <Text style={styles.dateSep}>/</Text>
                  </View>
                  <View style={styles.dateField}>
                    <Text style={fi.label}>Month</Text>
                    <TextInput
                      value={bMonth}
                      onChangeText={v => { setBMonth(v.replace(/[^0-9]/g, '').slice(0, 2)); setDateError(''); }}
                      placeholder="MM"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="number-pad"
                      maxLength={2}
                      style={[fi.input, styles.dateInput]}
                      textAlign="center"
                    />
                  </View>
                  <View style={styles.dateSeparator}>
                    <Text style={styles.dateSep}>/</Text>
                  </View>
                  <View style={[styles.dateField, { flex: 2 }]}>
                    <Text style={fi.label}>Year</Text>
                    <TextInput
                      value={bYear}
                      onChangeText={v => { setBYear(v.replace(/[^0-9]/g, '').slice(0, 4)); setDateError(''); }}
                      placeholder="YYYY"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="number-pad"
                      maxLength={4}
                      style={[fi.input, styles.dateInput]}
                      textAlign="center"
                    />
                  </View>
                </View>

                {!!dateError && (
                  <View style={styles.dateErrorRow}>
                    <Ionicons name="alert-circle-outline" size={13} color={Colors.danger} />
                    <Text style={styles.dateErrorText}>{dateError}</Text>
                  </View>
                )}

                <ContinueButton onPress={handleNext} enabled={canProceed()} />
              </View>
            )}

            {/* ── Step 3: Daily Goal ────────────────────── */}
            {step === 3 && (
              <View style={styles.stepContainer}>
                <View style={styles.stepIconCircle}>
                  <Text style={{ fontSize: 28 }}>🎯</Text>
                </View>
                <Text style={styles.stepTitle}>Daily Focus Goal</Text>
                <Text style={styles.stepSubtitle}>
                  How many focus sessions do you want to complete each day?
                </Text>

                <View style={styles.goalGrid}>
                  {GOAL_OPTIONS.map(g => (
                    <TouchableOpacity
                      key={g.value}
                      style={[styles.goalCard, dailyGoal === g.value && styles.goalCardSelected]}
                      onPress={() => setDailyGoal(g.value)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.goalEmoji}>{g.emoji}</Text>
                      <Text style={[styles.goalNum, dailyGoal === g.value && { color: Colors.primary }]}>
                        {g.label}
                      </Text>
                      <Text style={[styles.goalSub, dailyGoal === g.value && { color: Colors.primary }]}>
                        {g.sub}
                      </Text>
                      {dailyGoal === g.value && (
                        <View style={styles.goalCheck}>
                          <Ionicons name="checkmark" size={10} color="white" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.goalNote}>
                  <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.goalNoteText}>
                    Each session is {25} minutes by default. You can change this in settings.
                  </Text>
                </View>

                {!!authError && (
                  <View style={styles.authErrorBox}>
                    <Ionicons name="alert-circle-outline" size={14} color={Colors.danger} />
                    <Text style={styles.authErrorText}>{authError}</Text>
                  </View>
                )}

                <TouchableOpacity
                  onPress={handleNext}
                  activeOpacity={0.85}
                  style={styles.primaryBtnWrap}
                  disabled={submitting}
                >
                  <LinearGradient
                    colors={submitting ? [Colors.bgCard, Colors.bgCard] : [Colors.primary, Colors.primaryDark]}
                    style={styles.primaryBtn}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  >
                    <Text style={[styles.primaryBtnText, submitting && { color: Colors.textMuted }]}>
                      {submitting ? 'Creating account...' : 'Dive In'}
                    </Text>
                    {!submitting && <Text style={{ fontSize: 18 }}>🌊</Text>}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function ContinueButton({ onPress, enabled }: { onPress: () => void; enabled: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={!enabled} activeOpacity={0.85} style={styles.primaryBtnWrap}>
      <LinearGradient
        colors={enabled ? [Colors.primary, Colors.primaryDark] : [Colors.bgCard, Colors.bgCard]}
        style={styles.primaryBtn}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      >
        <Text style={[styles.primaryBtnText, !enabled && { color: Colors.textMuted }]}>Continue</Text>
        <Ionicons name="arrow-forward" size={18} color={enabled ? 'white' : Colors.textMuted} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.lg, flexGrow: 1 },

  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.lg,
  },

  stepContainer: { flex: 1 },

  // Welcome
  welcomeCreatures: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end',
    gap: Spacing.lg, marginBottom: Spacing.xl,
  },
  welcomeCreature: { fontSize: 40 },
  appName: {
    fontSize: 80, fontWeight: '900', color: Colors.textPrimary,
    letterSpacing: -4, textAlign: 'center', lineHeight: 84,
    marginBottom: 8,
  },
  welcomeTagline: {
    fontSize: Fonts.sizes.md, color: Colors.textSecondary,
    textAlign: 'center', marginBottom: Spacing.xl, letterSpacing: 0.4,
  },
  featureList: { gap: 10, marginBottom: Spacing.xl },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.bgCard, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: Colors.border,
  },
  featureIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: 'rgba(0,180,216,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  featureText: { fontSize: Fonts.sizes.base, color: Colors.textPrimary, fontWeight: Fonts.weights.medium, flex: 1 },

  privacyNote: {
    fontSize: Fonts.sizes.xs, color: Colors.textMuted,
    textAlign: 'center', marginTop: Spacing.md, lineHeight: 18,
  },

  // Steps
  stepIconCircle: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: 'rgba(0,180,216,0.12)',
    borderWidth: 1, borderColor: 'rgba(0,180,216,0.3)',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: Spacing.lg,
  },
  stepTitle: {
    fontSize: Fonts.sizes.xl, fontWeight: Fonts.weights.bold,
    color: Colors.textPrimary, textAlign: 'center', marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: Fonts.sizes.base, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl,
  },
  fields: { marginBottom: Spacing.md },

  // Birthday date inputs
  dateRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 0, marginBottom: Spacing.md },
  dateField: { flex: 1 },
  dateSeparator: { paddingBottom: 14, paddingHorizontal: 4, alignSelf: 'flex-end' },
  dateSep: { fontSize: Fonts.sizes.xl, color: Colors.textMuted, lineHeight: 52 },
  dateInput: { textAlign: 'center', fontSize: Fonts.sizes.lg, paddingHorizontal: 8 },
  dateErrorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: Spacing.md },
  dateErrorText: { fontSize: Fonts.sizes.sm, color: Colors.danger },

  // Goal
  goalGrid: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  goalCard: {
    flex: 1, backgroundColor: Colors.bgCard,
    borderRadius: 16, borderWidth: 1.5, borderColor: Colors.border,
    padding: 14, alignItems: 'center', gap: 4,
    position: 'relative',
  },
  goalCardSelected: { borderColor: Colors.primary, backgroundColor: 'rgba(0,180,216,0.08)' },
  goalEmoji: { fontSize: 24, marginBottom: 4 },
  goalNum: { fontSize: Fonts.sizes.xl, fontWeight: Fonts.weights.bold, color: Colors.textPrimary },
  goalSub: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, textAlign: 'center' },
  goalCheck: {
    position: 'absolute', top: 6, right: 6,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  goalNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: Colors.bgCard, borderRadius: 12,
    padding: Spacing.md, marginBottom: Spacing.xl,
    borderWidth: 1, borderColor: Colors.border,
  },
  goalNoteText: { fontSize: Fonts.sizes.sm, color: Colors.textMuted, flex: 1, lineHeight: 18 },

  // Auth error
  authErrorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(255,82,82,0.08)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,82,82,0.25)',
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  authErrorText: { fontSize: Fonts.sizes.sm, color: Colors.danger, flex: 1, lineHeight: 18 },

  // Button
  primaryBtnWrap: { borderRadius: 16, overflow: 'hidden', marginBottom: Spacing.md },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 18,
  },
  primaryBtnText: { fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.bold, color: 'white' },
});
