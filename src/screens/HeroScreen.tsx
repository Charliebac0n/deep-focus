import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing } from '../theme';
import { useSettings } from '../context/SettingsContext';
import { useStats, XP_PER_LEVEL } from '../context/StatsContext';
import { useTasks } from '../context/TasksContext';
import { useUser } from '../context/UserContext';
import { getDailyQuote, CATEGORY_LABELS } from '../data/quotes';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning,';
  if (h < 17) return 'Good afternoon,';
  return 'Good evening,';
}

function formatFocusTime(seconds: number): string {
  if (seconds === 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function HeroScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { settings, setSettingsVisible } = useSettings();
  const { stats, level, xpInLevel, todaySessions, todayFocusSeconds, todayTasksDone } = useStats();
  const { activeTask, tasks } = useTasks();
  const { profile } = useUser();
  const DAILY_SESSION_GOAL = profile.dailyGoal;

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  const quote       = getDailyQuote();
  const greeting    = getGreeting();
  const displayName = settings.userName.trim() || 'there';
  const tierColor   = level >= 21 ? Colors.gold : level >= 13 ? '#9B5DE5' : level >= 7 ? Colors.primaryLight : Colors.primary;

  const STATS = [
    { label: 'Focus Time', value: formatFocusTime(todayFocusSeconds), icon: 'timer-outline' as const,             color: Colors.timerFocus },
    { label: 'Tasks Done', value: String(todayTasksDone),             icon: 'checkmark-circle-outline' as const,  color: Colors.success },
    { label: 'Day Streak', value: `${stats.currentStreak}d`,          icon: 'flame-outline' as const,             color: Colors.warning },
  ];

  // Find first incomplete task to show as "next task" (active first, then any pending)
  const nextTask = activeTask ?? tasks.find(t => !t.completed) ?? null;

  return (
    <LinearGradient colors={['#020B18', '#041525', '#020B18']} style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.username}>{displayName} 🌊</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => setSettingsVisible(true)} style={styles.gearBtn}>
              <Ionicons name="settings-outline" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
            <View style={styles.avatar}>
              <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.avatarGradient}>
                <Text style={styles.avatarText}>
                  {displayName === 'there' ? '🌊' : displayName.charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
            </View>
          </View>
        </Animated.View>

        {/* Hero Brand */}
        <Animated.View style={[styles.heroSection, { opacity: fadeAnim }]}>
          <Text style={styles.appName}>Deep.</Text>
          <Text style={styles.tagline}>Focus deeper. Breathe easier.</Text>
        </Animated.View>

        {/* Quote Card */}
        <Animated.View style={[styles.quoteCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient
            colors={['rgba(0,180,216,0.15)', 'rgba(0,119,182,0.06)']}
            style={styles.quoteGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <View style={styles.quoteHeader}>
              <Ionicons name="water-outline" size={16} color={Colors.primary} />
              <View style={styles.quoteCategoryPill}>
                <Text style={styles.quoteCategoryText}>{CATEGORY_LABELS[quote.category]}</Text>
              </View>
            </View>
            <Text style={styles.quoteText}>"{quote.text}"</Text>
            <Text style={styles.quoteAuthor}>— {quote.author}</Text>
          </LinearGradient>
        </Animated.View>

        {/* Stats Row */}
        <Animated.View style={[styles.statsRow, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {STATS.map(stat => (
            <View key={stat.label} style={styles.statCard}>
              <LinearGradient colors={['#0A2035', '#061828']} style={styles.statGradient}>
                <Ionicons name={stat.icon} size={20} color={stat.color} />
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </LinearGradient>
            </View>
          ))}
        </Animated.View>

        {/* Next Task Banner */}
        <Animated.View style={[{ opacity: fadeAnim }]}>
          {nextTask ? (
            <TouchableOpacity
              style={styles.nextTask}
              onPress={() => navigation.navigate('Tasks')}
              activeOpacity={0.85}
            >
              <View style={styles.nextTaskLeft}>
                <View style={[styles.activeDot, { backgroundColor: nextTask.active ? Colors.timerFocus : Colors.textMuted }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.nextTaskLabel}>{nextTask.active ? 'Active Task' : 'Next Task'}</Text>
                  <Text style={styles.nextTaskTitle} numberOfLines={1}>{nextTask.title}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.miniPlay}
                onPress={() => navigation.navigate('Timer')}
              >
                <Ionicons name="play" size={14} color={Colors.bg} />
              </TouchableOpacity>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.addFirstTask}
              onPress={() => navigation.navigate('Tasks')}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
              <Text style={styles.addFirstTaskText}>Add your first task to get started →</Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Start Focus Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Timer')}
          style={styles.startBtn}
        >
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            style={styles.startBtnInner}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Ionicons name="play-circle" size={22} color="white" />
            <Text style={styles.startBtnText}>Start Focus Session</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Today's Progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Progress</Text>
          <View style={styles.pipsRow}>
            {Array.from({ length: DAILY_SESSION_GOAL }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.pip,
                  i < todaySessions && styles.pipDone,
                  i === todaySessions && styles.pipCurrent,
                ]}
              />
            ))}
          </View>
          <Text style={styles.pipsLabel}>
            {todaySessions === 0
              ? 'No sessions yet today — let\'s get started'
              : `${todaySessions} of ${DAILY_SESSION_GOAL} sessions completed today`}
          </Text>
        </View>

        {/* Ocean Level */}
        <View style={styles.section}>
          <View style={styles.levelRow}>
            <Text style={styles.sectionTitle}>Ocean Level</Text>
            <Text style={[styles.levelBadge, { color: tierColor }]}>Level {level}</Text>
          </View>
          <View style={styles.progressBg}>
            <LinearGradient
              colors={[tierColor, tierColor + '88']}
              style={[styles.progressFill, { width: `${(xpInLevel / XP_PER_LEVEL) * 100}%` }]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            />
          </View>
          <Text style={styles.progressLabel}>
            {xpInLevel} / {XP_PER_LEVEL} XP to Level {level + 1}
          </Text>
        </View>

        {/* Quick Start */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Start</Text>
          <View style={styles.quickRow}>
            {[
              { label: `${settings.focusDuration}m`,       sub: 'Deep Work',   icon: 'briefcase-outline' as const,    modeIdx: 0 },
              { label: `${settings.shortBreakDuration}m`,  sub: 'Short Break', icon: 'leaf-outline' as const,         modeIdx: 1 },
              { label: `${settings.longBreakDuration}m`,   sub: 'Long Break',  icon: 'cafe-outline' as const,         modeIdx: 2 },
            ].map(q => (
              <TouchableOpacity
                key={q.sub}
                style={styles.quickCard}
                onPress={() => navigation.navigate('Timer')}
              >
                <Ionicons name={q.icon} size={20} color={Colors.primary} />
                <Text style={styles.quickLabel}>{q.label}</Text>
                <Text style={styles.quickSub}>{q.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.lg },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  greeting: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary },
  username: { fontSize: Fonts.sizes.xl, color: Colors.textPrimary, fontWeight: Fonts.weights.bold, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gearBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  avatar: { borderRadius: 22, overflow: 'hidden' },
  avatarGradient: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: Fonts.weights.bold, color: 'white' },

  heroSection: { alignItems: 'center', marginBottom: Spacing.xl },
  appName: { fontSize: 72, fontWeight: '900', color: Colors.textPrimary, letterSpacing: -3, lineHeight: 76 },
  tagline: { fontSize: Fonts.sizes.base, color: Colors.textSecondary, marginTop: 4, letterSpacing: 0.4 },

  quoteCard: { marginBottom: Spacing.xl, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,180,216,0.2)' },
  quoteGradient: { padding: Spacing.lg },
  quoteHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  quoteCategoryPill: {
    backgroundColor: 'rgba(0,180,216,0.12)', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(0,180,216,0.2)',
  },
  quoteCategoryText: { fontSize: Fonts.sizes.xs, color: Colors.primary, fontWeight: Fonts.weights.medium },
  quoteText: { fontSize: Fonts.sizes.md, color: Colors.textPrimary, fontStyle: 'italic', lineHeight: 26, marginBottom: 8 },
  quoteAuthor: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary },

  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  statCard: { flex: 1, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  statGradient: { padding: Spacing.md, alignItems: 'center', gap: 5 },
  statValue: { fontSize: Fonts.sizes.xl, fontWeight: Fonts.weights.bold },
  statLabel: { fontSize: 10, color: Colors.textSecondary, textAlign: 'center', fontWeight: Fonts.weights.medium },

  nextTask: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.bgCard, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.xl },
  nextTaskLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  nextTaskLabel: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, fontWeight: Fonts.weights.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  nextTaskTitle: { fontSize: Fonts.sizes.base, color: Colors.textPrimary, fontWeight: Fonts.weights.semibold, marginTop: 2 },
  miniPlay: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },

  addFirstTask: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.bgCard, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.xl },
  addFirstTaskText: { fontSize: Fonts.sizes.base, color: Colors.primary, fontWeight: Fonts.weights.medium },

  startBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: Spacing.xl },
  startBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
  startBtnText: { fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.bold, color: 'white' },

  section: { marginBottom: Spacing.xl },
  sectionTitle: { fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.semibold, color: Colors.textPrimary, marginBottom: Spacing.md },

  pipsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  pip: { flex: 1, height: 10, borderRadius: 5, backgroundColor: Colors.border },
  pipDone: { backgroundColor: Colors.primary },
  pipCurrent: { backgroundColor: Colors.accent, opacity: 0.5 },
  pipsLabel: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary },

  levelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  levelBadge: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.semibold },
  progressBg: { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 4 },
  progressLabel: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary },

  quickRow: { flexDirection: 'row', gap: Spacing.sm },
  quickCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, alignItems: 'center', gap: 6 },
  quickLabel: { fontSize: Fonts.sizes.md, color: Colors.textPrimary, fontWeight: Fonts.weights.bold },
  quickSub: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, textAlign: 'center' },
});
