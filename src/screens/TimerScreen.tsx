import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  AppStateStatus,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import Svg, { Circle, Defs, G, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { Colors, Fonts, Spacing } from '../theme';
import { useSettings } from '../context/SettingsContext';
import { useTasks } from '../context/TasksContext';
import { useStats } from '../context/StatsContext';
import { useUser } from '../context/UserContext';
import { useAmbientSound } from '../hooks/useAmbientSound';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const MODE_COLORS = [Colors.timerFocus, Colors.timerBreak, Colors.timerLong];
const MODE_KEYS = ['focus', 'short', 'long'];
const MODE_LABELS = ['Focus', 'Short Break', 'Long Break'];

const RADIUS = 118;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const CENTER = 140;

function getNextModeIdx(currentMode: number, completedFocusSessions: number, longBreakInterval: number): number {
  if (currentMode === 0) {
    return completedFocusSessions > 0 && completedFocusSessions % longBreakInterval === 0 ? 2 : 1;
  }
  return 0;
}

export default function TimerScreen() {
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { activeTask } = useTasks();
  const { active: activeSound, play: playSound } = useAmbientSound(settings.focusVolume);
  const { todaySessions, recordSession, statsLoaded } = useStats();
  const { profile } = useUser();
  const DAILY_SESSION_GOAL = profile.dailyGoal;

  const MODES = [
    { key: MODE_KEYS[0], label: MODE_LABELS[0], duration: settings.focusDuration * 60,      color: MODE_COLORS[0] },
    { key: MODE_KEYS[1], label: MODE_LABELS[1], duration: settings.shortBreakDuration * 60,  color: MODE_COLORS[1] },
    { key: MODE_KEYS[2], label: MODE_LABELS[2], duration: settings.longBreakDuration * 60,   color: MODE_COLORS[2] },
  ];

  const [modeIdx, setModeIdx]           = useState(0);
  const [seconds, setSeconds]           = useState(MODES[0].duration);
  const [running, setRunning]           = useState(false);
  const [sessions, setSessions]         = useState(0); // local run counter for break-interval logic
  const [justCompleted, setJustCompleted] = useState(false);
  const [sessionsSeeded, setSessionsSeeded] = useState(false);

  // Seed local counter once from persisted data so break intervals survive app restarts
  useEffect(() => {
    if (statsLoaded && !sessionsSeeded) {
      setSessions(todaySessions);
      setSessionsSeeded(true);
    }
  }, [statsLoaded, todaySessions, sessionsSeeded]);

  const targetTimeRef  = useRef<number | null>(null);
  const intervalRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const notifIdRef     = useRef<string | null>(null);
  const appStateRef    = useRef<AppStateStatus>(AppState.currentState);
  const modeIdxRef     = useRef(modeIdx);
  const sessionsRef    = useRef(sessions);
  const settingsRef    = useRef(settings);
  const recordSessionRef = useRef(recordSession);
  const pulseAnim      = useRef(new Animated.Value(1)).current;
  const completePulse  = useRef(new Animated.Value(1)).current;
  const pulseLoopRef   = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => { modeIdxRef.current   = modeIdx;    }, [modeIdx]);
  useEffect(() => { sessionsRef.current  = sessions;   }, [sessions]);
  useEffect(() => { settingsRef.current  = settings;   }, [settings]);
  useEffect(() => { recordSessionRef.current = recordSession; }, [recordSession]);

  useEffect(() => {
    Notifications.requestPermissionsAsync().catch(() => {});
  }, []);

  const scheduleNotif = async (secs: number, modeLabel: string) => {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Deep. — ${modeLabel} Complete`,
          body: modeLabel === 'Focus'
            ? 'Great work. Time to take a break.'
            : "Break's over. Ready to dive back in?",
          sound: true,
        },
        trigger: { seconds: secs } as any,
      });
      notifIdRef.current = id;
    } catch {}
  };

  const cancelNotif = async () => {
    if (!notifIdRef.current) return;
    try { await Notifications.cancelScheduledNotificationAsync(notifIdRef.current); } catch {}
    notifIdRef.current = null;
  };

  const handleComplete = useCallback(() => {
    const s = settingsRef.current;
    const currentMode = modeIdxRef.current;
    const currentSessions = sessionsRef.current;

    if (intervalRef.current) clearInterval(intervalRef.current);
    targetTimeRef.current = null;
    setRunning(false);
    setSeconds(0);
    setJustCompleted(true);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    Animated.sequence([
      Animated.timing(completePulse, { toValue: 1.12, duration: 250, useNativeDriver: true }),
      Animated.timing(completePulse, { toValue: 1,    duration: 250, useNativeDriver: true }),
      Animated.timing(completePulse, { toValue: 1.07, duration: 180, useNativeDriver: true }),
      Animated.timing(completePulse, { toValue: 1,    duration: 180, useNativeDriver: true }),
    ]).start();

    const newSessions = currentMode === 0 ? currentSessions + 1 : currentSessions;
    if (currentMode === 0) {
      setSessions(newSessions);
      recordSessionRef.current(s.focusDuration * 60);
    }

    setTimeout(() => {
      setJustCompleted(false);
      const nextIdx = getNextModeIdx(currentMode, newSessions, s.longBreakInterval);
      const durations = [s.focusDuration, s.shortBreakDuration, s.longBreakDuration];
      const nextDuration = durations[nextIdx] * 60;
      setModeIdx(nextIdx);
      setSeconds(nextDuration);

      const shouldAutoStart =
        (nextIdx !== 0 && s.autoStartBreaks) ||
        (nextIdx === 0 && s.autoStartSessions);

      if (shouldAutoStart) {
        targetTimeRef.current = Date.now() + nextDuration * 1000;
        setRunning(true);
        scheduleNotif(nextDuration, MODE_LABELS[nextIdx]).catch(() => {});
      }
    }, 2500);
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        next === 'active' &&
        targetTimeRef.current !== null
      ) {
        const remaining = Math.max(0, Math.round((targetTimeRef.current - Date.now()) / 1000));
        setSeconds(remaining);
        if (remaining === 0) handleComplete();
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [handleComplete]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        if (targetTimeRef.current === null) return;
        const remaining = Math.max(0, Math.round((targetTimeRef.current - Date.now()) / 1000));
        setSeconds(remaining);
        if (remaining === 0) handleComplete();
      }, 500);

      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.025, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,     duration: 1200, useNativeDriver: true }),
        ])
      );
      pulseLoopRef.current.start();
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (pulseLoopRef.current) pulseLoopRef.current.stop();
      Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, handleComplete]);

  const handleToggle = async () => {
    if (justCompleted) return;
    if (running) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      await cancelNotif();
      targetTimeRef.current = null;
      setRunning(false);
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      targetTimeRef.current = Date.now() + seconds * 1000;
      setRunning(true);
      await scheduleNotif(seconds, MODES[modeIdx].label);
    }
  };

  const handleReset = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await cancelNotif();
    targetTimeRef.current = null;
    setRunning(false);
    setJustCompleted(false);
    setSeconds(MODES[modeIdx].duration);
  };

  const handleSkip = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await cancelNotif();
    targetTimeRef.current = null;
    setRunning(false);
    setJustCompleted(false);
    const nextIdx = getNextModeIdx(modeIdx, sessions, settings.longBreakInterval);
    setModeIdx(nextIdx);
    setSeconds(MODES[nextIdx].duration);
  };

  const handleModeChange = async (idx: number) => {
    if (idx === modeIdx) return;
    await cancelNotif();
    targetTimeRef.current = null;
    setRunning(false);
    setJustCompleted(false);
    setModeIdx(idx);
    setSeconds(MODES[idx].duration);
  };

  const mode      = MODES[modeIdx];
  const progress  = seconds / mode.duration;
  const dashOffset = CIRCUMFERENCE * (1 - (justCompleted ? 1 : progress));
  const mins      = Math.floor(seconds / 60);
  const secs      = seconds % 60;
  const display   = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const nextIdx   = getNextModeIdx(modeIdx, sessions, settings.longBreakInterval);
  const ringColor = justCompleted ? Colors.success : mode.color;

  // Use todaySessions for display so pips reflect all sessions today (across app restarts)
  const displaySessions = todaySessions;

  return (
    <LinearGradient colors={['#020B18', '#041525', '#020B18']} style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Focus Timer</Text>
          <View style={styles.sessionsBadge}>
            <Text style={styles.sessionsBadgeText}>{displaySessions}/{DAILY_SESSION_GOAL} today</Text>
          </View>
        </View>

        {/* Mode Tabs */}
        <View style={styles.modeTabs}>
          {MODES.map((m, i) => (
            <TouchableOpacity
              key={m.key}
              onPress={() => handleModeChange(i)}
              style={[
                styles.modeTab,
                modeIdx === i && { borderColor: m.color, backgroundColor: `${m.color}22` },
              ]}
            >
              <Text style={[styles.modeTabText, modeIdx === i && { color: m.color }]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* SVG Timer Ring */}
        <Animated.View
          style={[
            styles.timerWrap,
            { transform: [{ scale: running ? pulseAnim : completePulse }] },
          ]}
        >
          <Svg width={280} height={280}>
            <Defs>
              <SvgGradient id="arc" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={ringColor} stopOpacity="1" />
                <Stop offset="1" stopColor={Colors.primaryDark} stopOpacity="1" />
              </SvgGradient>
            </Defs>
            <Circle
              cx={CENTER} cy={CENTER} r={RADIUS}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={10} fill="transparent"
            />
            <G rotation="-90" origin={`${CENTER}, ${CENTER}`}>
              <Circle
                cx={CENTER} cy={CENTER} r={RADIUS}
                stroke="url(#arc)"
                strokeWidth={10} fill="transparent"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
              />
            </G>
          </Svg>

          <View style={styles.timerCenter}>
            {justCompleted ? (
              <>
                <Text style={[styles.timerDisplay, { color: Colors.success, fontSize: 44 }]}>Done!</Text>
                <Text style={styles.timerModeLabel}>
                  {modeIdx === 0 ? 'Session complete 🎉' : 'Break over'}
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.timerDisplay, { color: mode.color }]}>{display}</Text>
                <Text style={styles.timerModeLabel}>{mode.label}</Text>
                {running && (
                  <View style={styles.liveRow}>
                    <View style={[styles.liveDot, { backgroundColor: mode.color }]} />
                    <Text style={[styles.liveText, { color: mode.color }]}>Live</Text>
                  </View>
                )}
              </>
            )}
          </View>
        </Animated.View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity onPress={handleReset} style={styles.ctrlBtn}>
            <Ionicons name="refresh" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleToggle} activeOpacity={0.85} disabled={justCompleted}>
            <LinearGradient
              colors={[ringColor, Colors.primaryDark]}
              style={[styles.playBtn, justCompleted && { opacity: 0.4 }]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Ionicons name={running ? 'pause' : 'play'} size={30} color="white" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSkip} style={styles.ctrlBtn}>
            <Ionicons name="play-skip-forward" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Next session hint */}
        {!justCompleted && (
          <View style={styles.nextHint}>
            <Ionicons name="arrow-forward-circle-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.nextHintText}>
              {'Next: '}
              <Text style={{ color: MODES[nextIdx].color, fontWeight: Fonts.weights.semibold }}>
                {MODES[nextIdx].label}
              </Text>
              {settings.autoStartBreaks && modeIdx === 0 ? '  ·  auto-starts' : ''}
              {settings.autoStartSessions && modeIdx !== 0 ? '  ·  auto-starts' : ''}
            </Text>
          </View>
        )}

        {/* Current Task */}
        <View style={styles.taskCard}>
          <View style={styles.taskCardHeader}>
            <Ionicons name="briefcase-outline" size={14} color={Colors.primary} />
            <Text style={styles.taskCardLabel}>Current Task</Text>
          </View>
          {activeTask ? (
            <>
              <Text style={styles.taskCardTitle}>{activeTask.title}</Text>
              <View style={styles.taskCardMeta}>
                <View style={styles.priorityRow}>
                  <View style={[styles.priorityDot, {
                    backgroundColor: activeTask.priority === 'high'
                      ? Colors.danger : activeTask.priority === 'medium'
                      ? Colors.warning : Colors.success,
                  }]} />
                  <Text style={styles.priorityText}>
                    {activeTask.priority.charAt(0).toUpperCase() + activeTask.priority.slice(1)} Priority
                  </Text>
                </View>
                <Text style={styles.estimateText}>~{activeTask.estimate}</Text>
              </View>
            </>
          ) : (
            <Text style={[styles.taskCardTitle, { color: Colors.textMuted, fontSize: Fonts.sizes.sm }]}>
              No active task — set one in the Tasks tab
            </Text>
          )}
        </View>

        {/* Sessions Pips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sessions Today</Text>
          <View style={styles.pipsRow}>
            {Array.from({ length: DAILY_SESSION_GOAL }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.pip,
                  i < displaySessions && { backgroundColor: Colors.timerFocus },
                  i === displaySessions && running && { backgroundColor: Colors.timerFocus, opacity: 0.35 },
                ]}
              />
            ))}
          </View>
          <Text style={styles.sessionsSubtext}>
            {displaySessions === 0
              ? 'Start your first session'
              : `${displaySessions} session${displaySessions !== 1 ? 's' : ''} completed today`}
          </Text>
        </View>

        {/* Ambient Sounds */}
        <View style={styles.section}>
          <View style={styles.ambientHeader}>
            <Text style={styles.sectionTitle}>Ambient Sounds</Text>
            {activeSound && (
              <View style={styles.nowPlayingBadge}>
                <View style={styles.nowPlayingDot} />
                <Text style={styles.nowPlayingText}>Playing</Text>
              </View>
            )}
          </View>
          <View style={styles.ambientRow}>
            {['🌊  Ocean', '🌧  Rain', '🔥  Fire', '🍃  Forest'].map(s => {
              const isActive = activeSound === s;
              return (
                <TouchableOpacity
                  key={s}
                  style={[styles.ambientChip, isActive && styles.ambientChipActive]}
                  onPress={() => playSound(s)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.ambientChipText, isActive && styles.ambientChipTextActive]}>{s}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.ambientHint}>Tap to play · Tap again to stop</Text>
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
  title: { fontSize: Fonts.sizes.xl, fontWeight: Fonts.weights.bold, color: Colors.textPrimary },
  sessionsBadge: {
    backgroundColor: 'rgba(0,180,216,0.15)',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,180,216,0.3)',
  },
  sessionsBadgeText: { fontSize: Fonts.sizes.sm, color: Colors.primary, fontWeight: Fonts.weights.semibold },

  modeTabs: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  modeTab: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  modeTabText: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.semibold, color: Colors.textMuted },

  timerWrap: { alignItems: 'center', marginBottom: Spacing.xl },
  timerCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  timerDisplay: { fontSize: 56, fontWeight: '900', letterSpacing: -2 },
  timerModeLabel: { fontSize: Fonts.sizes.base, color: Colors.textSecondary, fontWeight: Fonts.weights.medium, marginTop: 4 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.semibold },

  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xl, marginBottom: Spacing.lg },
  ctrlBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  playBtn: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },

  nextHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: Spacing.xl },
  nextHintText: { fontSize: Fonts.sizes.sm, color: Colors.textMuted },

  taskCard: { backgroundColor: Colors.bgCard, borderRadius: 16, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.xl },
  taskCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  taskCardLabel: { fontSize: Fonts.sizes.xs, color: Colors.primary, fontWeight: Fonts.weights.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  taskCardTitle: { fontSize: Fonts.sizes.md, color: Colors.textPrimary, fontWeight: Fonts.weights.semibold, marginBottom: 10 },
  taskCardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priorityRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  priorityText: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary },
  estimateText: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary },

  section: { marginBottom: Spacing.xl },
  sectionTitle: { fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.semibold, color: Colors.textPrimary, marginBottom: Spacing.md },
  pipsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  pip: { flex: 1, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  sessionsSubtext: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary },

  ambientHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  nowPlayingBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  nowPlayingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.timerBreak },
  nowPlayingText: { fontSize: Fonts.sizes.xs, color: Colors.timerBreak, fontWeight: Fonts.weights.semibold },

  ambientRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  ambientChip: { paddingHorizontal: 16, paddingVertical: 9, backgroundColor: Colors.bgCard, borderRadius: 22, borderWidth: 1, borderColor: Colors.border },
  ambientChipActive: { backgroundColor: 'rgba(0,180,216,0.15)', borderColor: Colors.primary },
  ambientChipText: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, fontWeight: Fonts.weights.medium },
  ambientChipTextActive: { color: Colors.primary },
  ambientHint: { fontSize: Fonts.sizes.xs, color: Colors.textMuted, marginTop: 8 },
});
