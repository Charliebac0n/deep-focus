import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
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
import { Colors, Fonts, Spacing } from '../theme';
import { useStats, Stats } from '../context/StatsContext';
import { usePremium } from '../context/PremiumContext';
import FishTank from '../components/FishTank';

// ─── Static definitions ───────────────────────────────────────────────────────

const LEVEL_TIERS = [
  { min: 1,  max: 2,  name: 'Tidal Pool',        color: '#48CAE4' },
  { min: 3,  max: 6,  name: 'Coral Reef',         color: '#00B4D8' },
  { min: 7,  max: 12, name: 'Open Ocean',         color: '#0077B6' },
  { min: 13, max: 20, name: 'Deep Sea Explorer',  color: '#9B5DE5' },
  { min: 21, max: 999,name: 'Abyss Diver',        color: '#FFD60A' },
];

function getTier(level: number) {
  return LEVEL_TIERS.find(t => level >= t.min && level <= t.max) ?? LEVEL_TIERS[0];
}

type Rarity = 'common' | 'rare' | 'legendary' | 'pro';

interface CreatureDef {
  emoji: string; name: string; rarity: Rarity;
  sessionsNeeded: number; pro?: boolean; desc: string;
}

const CREATURE_DEFS: CreatureDef[] = [
  { emoji: '🐠', name: 'Clownfish',   rarity: 'common',    sessionsNeeded: 5,   desc: 'First to arrive in your ocean.' },
  { emoji: '🐡', name: 'Pufferfish',  rarity: 'common',    sessionsNeeded: 10,  desc: 'Calm and focused, just like you.' },
  { emoji: '🐬', name: 'Dolphin',     rarity: 'rare',      sessionsNeeded: 20,  desc: 'Celebrates every deep session.' },
  { emoji: '🐙', name: 'Octopus',     rarity: 'rare',      sessionsNeeded: 35,  desc: 'Master of multitasking.' },
  { emoji: '🦈', name: 'Shark',       rarity: 'rare',      sessionsNeeded: 50,  desc: 'Relentless, unstoppable focus.' },
  { emoji: '🐋', name: 'Blue Whale',  rarity: 'legendary', sessionsNeeded: 80,  desc: 'The largest reward in the ocean.' },
  { emoji: '🦑', name: 'Giant Squid', rarity: 'legendary', sessionsNeeded: 120, desc: 'Lurks in the deepest focus depths.' },
  { emoji: '🐲', name: 'Sea Dragon',  rarity: 'pro',       sessionsNeeded: 0,   pro: true, desc: 'Exclusive to Deep. Pro members.' },
  { emoji: '🌊', name: 'Maelstrom',   rarity: 'pro',       sessionsNeeded: 0,   pro: true, desc: 'Transcend the ocean itself.' },
];

const RARITY_COLOR: Record<Rarity, string> = {
  common:    Colors.primary,
  rare:      '#9B5DE5',
  legendary: Colors.gold,
  pro:       '#FF6B6B',
};

interface AchievementDef {
  id: string; icon: string; title: string; desc: string;
  total: number; xp: number; pro?: boolean;
  getProgress: (s: Stats, todayTasksDone: number) => number;
}

const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: 'first_dive',  icon: '🌊', title: 'First Dive',       desc: 'Complete your first focus session',  total: 1,   xp: 50,  getProgress: (s) => Math.min(1, s.totalSessions) },
  { id: 'on_fire',     icon: '🔥', title: 'On Fire',          desc: '7-day streak',                       total: 7,   xp: 100, getProgress: (s) => Math.min(7, s.currentStreak) },
  { id: 'deep_diver',  icon: '🏆', title: 'Deep Diver',       desc: 'Complete 100 focus sessions',        total: 100, xp: 300, getProgress: (s) => Math.min(100, s.totalSessions) },
  { id: 'speed_demon', icon: '⚡', title: 'Speed Demon',      desc: 'Complete 5 tasks in one day',        total: 5,   xp: 150, getProgress: (_, t) => Math.min(5, t) },
  { id: 'night_owl',   icon: '🌑', title: 'Night Owl',        desc: 'Complete a session after 10 pm',     total: 1,   xp: 75,  getProgress: (s) => s.achievementsEarned.includes('night_owl') ? 1 : 0 },
  { id: 'pro_legend',  icon: '👑', title: 'Deep. Pro Legend', desc: 'Unlock every Pro creature',          total: 2,   xp: 500, pro: true, getProgress: () => 0 },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ progress, color = Colors.primary, height = 6 }: { progress: number; color?: string; height?: number }) {
  const pct = Math.min(1, Math.max(0, progress));
  return (
    <View style={[pb.bg, { height }]}>
      <LinearGradient colors={[color, color + 'AA']} style={[pb.fill, { width: `${pct * 100}%` }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
    </View>
  );
}
const pb = StyleSheet.create({
  bg:   { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden', width: '100%' },
  fill: { height: '100%', borderRadius: 99 },
});

function RarityBadge({ rarity }: { rarity: Rarity }) {
  if (rarity === 'common') return null;
  const label = rarity === 'pro' ? 'PRO' : rarity.charAt(0).toUpperCase() + rarity.slice(1);
  return (
    <View style={[rb.badge, { backgroundColor: RARITY_COLOR[rarity] + '22', borderColor: RARITY_COLOR[rarity] + '55' }]}>
      <Text style={[rb.text, { color: RARITY_COLOR[rarity] }]}>{label}</Text>
    </View>
  );
}
const rb = StyleSheet.create({
  badge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6, borderWidth: 1, marginTop: 2 },
  text:  { fontSize: 8, fontWeight: '700' as const, letterSpacing: 0.5 },
});

// ─── Premium gate overlay ─────────────────────────────────────────────────────

function LockedSection({ label, onUnlock, children }: {
  label: string; onUnlock: () => void; children: React.ReactNode;
}) {
  return (
    <View style={{ position: 'relative' }}>
      <View style={{ opacity: 0.18 }} pointerEvents="none">{children}</View>
      <View style={ls.overlay}>
        <View style={ls.lockCircle}>
          <Ionicons name="lock-closed" size={22} color={Colors.gold} />
        </View>
        <Text style={ls.label}>{label}</Text>
        <TouchableOpacity onPress={onUnlock} activeOpacity={0.85} style={ls.ctaWrap}>
          <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={ls.cta} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={ls.ctaText}>Unlock with Premium</Text>
            <Ionicons name="arrow-forward" size={14} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const ls = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  lockCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,214,10,0.1)',
    borderWidth: 1.5, borderColor: 'rgba(255,214,10,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  label: { fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.bold, color: Colors.textPrimary },
  ctaWrap: { borderRadius: 14, overflow: 'hidden' },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: Spacing.lg },
  ctaText: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.bold, color: 'white' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function RewardsScreen() {
  const insets = useSafeAreaInsets();
  const {
    stats, level,
    todaySessions, todayFocusSeconds, todayTasksDone, todayAITasksDone,
    weekHistory,
  } = useStats();
  const { isPremium, showPaywall } = usePremium();

  const tier = getTier(level);

  // Free tier: only 'common' creatures; Premium: all non-pro
  const creatures = useMemo(() => CREATURE_DEFS.map(c => {
    const premiumLocked = !isPremium && c.rarity !== 'common';
    const unlocked = !premiumLocked && !c.pro && stats.totalSessions >= c.sessionsNeeded;
    return {
      ...c,
      unlocked,
      premiumLocked,
      sessionsEarned: c.pro ? 0 : Math.min(c.sessionsNeeded, stats.totalSessions),
    };
  }), [stats.totalSessions, isPremium]);

  const unlockedCount = creatures.filter(c => c.unlocked).length;

  // Daily challenges derived from live stats
  const today = new Date().toISOString().split('T')[0];
  const completedToday = stats.completedChallenges.date === today ? stats.completedChallenges.ids : [];
  const challenges = [
    { id: 'sessions',   label: 'Complete 4 focus sessions',  target: 4,  current: Math.min(4,  todaySessions),                                xpReward: 80, icon: 'timer-outline' as const },
    { id: 'ai_tasks',   label: 'Finish 2 AI-planned tasks',  target: 2,  current: Math.min(2,  todayAITasksDone),                             xpReward: 50, icon: 'sparkles' as const },
    { id: 'focus_time', label: 'Log 90 min of focus',        target: 90, current: Math.min(90, Math.floor(todayFocusSeconds / 60)),           xpReward: 60, icon: 'hourglass-outline' as const },
  ];

  // Achievements with live progress
  const achievements = useMemo(() => ACHIEVEMENT_DEFS.map(a => ({
    ...a,
    progress: a.getProgress(stats, todayTasksDone),
    earned: stats.achievementsEarned.includes(a.id),
  })), [stats, todayTasksDone]);

  // Weekly chart
  const maxSessions = Math.max(1, ...weekHistory.map(d => d.sessions));
  const BAR_MAX = 72;

  // Streak pulse animation
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (stats.currentStreak === 0) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [stats.currentStreak]);

  const [selectedCreature, setSelectedCreature] = useState<typeof creatures[0] | null>(null);

  const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <LinearGradient colors={['#020B18', '#041525', '#020B18']} style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Ocean Rewards</Text>
            <Text style={[styles.tierLabel, { color: tier.color }]}>{tier.name}</Text>
          </View>
          <View style={[styles.levelBadge, { borderColor: tier.color + '66' }]}>
            <Text style={[styles.levelNum, { color: tier.color }]}>Lv.{level}</Text>
          </View>
        </View>

        {/* ── Ocean Fish Tank ── */}
        <FishTank />

        {/* ── Daily Challenges ── */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Today's Challenges</Text>
            <View style={styles.resetPill}>
              <Ionicons name="time-outline" size={11} color={Colors.textMuted} />
              <Text style={styles.resetText}>Resets at midnight</Text>
            </View>
          </View>
          {isPremium ? (
            <View style={styles.challengeList}>
              {challenges.map(ch => {
                const done = completedToday.includes(ch.id) || ch.current >= ch.target;
                const pct = Math.min(1, ch.current / ch.target);
                return (
                  <View key={ch.id} style={[styles.challengeCard, done && styles.challengeCardDone]}>
                    <View style={[styles.challengeIconWrap, done && styles.challengeIconDone]}>
                      <Ionicons name={done ? 'checkmark' : ch.icon as any} size={16} color={done ? 'white' : Colors.primary} />
                    </View>
                    <View style={{ flex: 1, gap: 6 }}>
                      <View style={styles.challengeTopRow}>
                        <Text style={[styles.challengeLabel, done && styles.challengeLabelDone]}>{ch.label}</Text>
                        <View style={[styles.xpPill, done && styles.xpPillDone]}>
                          <Ionicons name="sparkles" size={9} color={done ? Colors.success : Colors.gold} />
                          <Text style={[styles.xpPillText, done && { color: Colors.success }]}>
                            {done ? 'Done' : `+${ch.xpReward} XP`}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.challengeProgressRow}>
                        <ProgressBar progress={pct} color={done ? Colors.success : Colors.primary} height={5} />
                        <Text style={styles.challengeCount}>{ch.current}/{ch.target}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <LockedSection label="Premium Feature" onUnlock={showPaywall}>
              <View style={styles.challengeList}>
                {challenges.map(ch => (
                  <View key={ch.id} style={styles.challengeCard}>
                    <View style={styles.challengeIconWrap}>
                      <Ionicons name={ch.icon as any} size={16} color={Colors.primary} />
                    </View>
                    <View style={{ flex: 1, gap: 6 }}>
                      <View style={styles.challengeTopRow}>
                        <Text style={styles.challengeLabel}>{ch.label}</Text>
                        <View style={styles.xpPill}>
                          <Ionicons name="sparkles" size={9} color={Colors.gold} />
                          <Text style={styles.xpPillText}>+{ch.xpReward} XP</Text>
                        </View>
                      </View>
                      <ProgressBar progress={0} color={Colors.primary} height={5} />
                    </View>
                  </View>
                ))}
              </View>
            </LockedSection>
          )}
        </View>

        {/* ── Streak ── */}
        <View style={styles.section}>
          <View style={styles.streakHero}>
            <LinearGradient
              colors={['rgba(255,214,10,0.12)', 'rgba(255,107,107,0.06)']}
              style={styles.streakHeroInner}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <View style={styles.streakLeft}>
                <Animated.Text style={[styles.streakFlame, { transform: [{ scale: stats.currentStreak > 0 ? pulse : new Animated.Value(1) }] }]}>
                  🔥
                </Animated.Text>
                <View>
                  <Text style={styles.streakNum}>{stats.currentStreak}</Text>
                  <Text style={styles.streakSub}>day streak</Text>
                </View>
              </View>
              <View style={styles.streakRight}>
                <View style={styles.streakDots}>
                  {Array.from({ length: 7 }).map((_, i) => {
                    const filled = i < Math.min(stats.currentStreak, 7);
                    return <View key={i} style={[styles.streakDot, filled && styles.streakDotFull]} />;
                  })}
                </View>
                <Text style={styles.streakDotLabel}>Last 7 days</Text>
                {stats.longestStreak > 0 && (
                  <Text style={styles.bestStreakText}>Best: {stats.longestStreak} days</Text>
                )}
                <TouchableOpacity style={styles.shieldBtn} activeOpacity={0.8} onPress={showPaywall}>
                  <Ionicons name="shield-checkmark-outline" size={12} color={Colors.gold} />
                  <Text style={styles.shieldText}>{isPremium ? 'Streak Shield active' : 'Protect streak — Premium'}</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          {[
            { label: 'Sessions',    value: String(stats.totalSessions),                    icon: 'timer-outline' as const,            color: Colors.primary },
            { label: 'Focus Time',  value: formatTime(stats.totalFocusSeconds),             icon: 'hourglass-outline' as const,        color: '#9B5DE5' },
            { label: 'Tasks Done',  value: String(stats.totalTasksDone),                   icon: 'checkmark-done-outline' as const,   color: Colors.success },
            { label: 'Best Streak', value: `${stats.longestStreak}d`,                      icon: 'flame-outline' as const,            color: Colors.warning },
          ].map(s => (
            <View key={s.label} style={styles.statCard}>
              <Ionicons name={s.icon} size={18} color={s.color} />
              <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Weekly Activity ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This Week</Text>
          {isPremium ? (
            <View style={styles.chart}>
              {weekHistory.map((d, i) => {
                const isToday = i === weekHistory.length - 1;
                const barH = Math.max(4, (d.sessions / maxSessions) * BAR_MAX);
                return (
                  <View key={d.date} style={styles.barCol}>
                    <Text style={styles.barCount}>{d.sessions > 0 ? d.sessions : ''}</Text>
                    <View style={styles.barBg}>
                      <LinearGradient
                        colors={isToday ? [Colors.accent, Colors.primary] : [Colors.primary + 'CC', Colors.primaryDark]}
                        style={[styles.bar, { height: barH }]}
                        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                      />
                    </View>
                    <Text style={[styles.barDay, isToday && { color: Colors.accent }]}>
                      {WEEK_DAYS[i]}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <LockedSection label="Premium Feature" onUnlock={showPaywall}>
              <View style={styles.chart}>
                {WEEK_DAYS.map((d, i) => (
                  <View key={i} style={styles.barCol}>
                    <Text style={styles.barCount} />
                    <View style={styles.barBg}>
                      <View style={[styles.bar, { height: Math.max(4, Math.random() * BAR_MAX * 0.6), backgroundColor: Colors.primary + '44' }]} />
                    </View>
                    <Text style={styles.barDay}>{d}</Text>
                  </View>
                ))}
              </View>
            </LockedSection>
          )}
        </View>

        {/* ── Creature Collection ── */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Collection</Text>
            <Text style={styles.sectionCount}>{unlockedCount}/{creatures.filter(c => !c.pro).length} unlocked</Text>
          </View>

          {selectedCreature && (
            <TouchableOpacity style={styles.creatureDetail} onPress={() => setSelectedCreature(null)} activeOpacity={0.9}>
              <Text style={{ fontSize: 42 }}>{selectedCreature.emoji}</Text>
              <View style={{ flex: 1 }}>
                <View style={styles.creatureDetailTop}>
                  <Text style={styles.creatureDetailName}>{selectedCreature.name}</Text>
                  <RarityBadge rarity={selectedCreature.rarity} />
                </View>
                <Text style={styles.creatureDetailDesc}>{selectedCreature.desc}</Text>
                {!selectedCreature.unlocked && !selectedCreature.pro && (
                  <View style={{ marginTop: 8 }}>
                    <ProgressBar progress={selectedCreature.sessionsEarned / selectedCreature.sessionsNeeded} color={RARITY_COLOR[selectedCreature.rarity]} height={5} />
                    <Text style={styles.creatureDetailProgress}>
                      {selectedCreature.sessionsEarned}/{selectedCreature.sessionsNeeded} sessions
                    </Text>
                  </View>
                )}
                {selectedCreature.pro && (
                  <Text style={[styles.creatureDetailProgress, { color: '#FF6B6B', marginTop: 6 }]}>Unlock with Deep. Pro ✦</Text>
                )}
              </View>
              <Ionicons name="close-circle-outline" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}

          <View style={styles.creaturesGrid}>
            {creatures.map(c => (
              <TouchableOpacity
                key={c.name}
                style={[
                  styles.creatureCard,
                  c.unlocked && styles.creatureCardUnlocked,
                  c.pro && styles.creatureCardPro,
                  c.premiumLocked && styles.creatureCardPremiumLocked,
                  selectedCreature?.name === c.name && styles.creatureCardSelected,
                ]}
                onPress={() => {
                  if (c.premiumLocked) { showPaywall(); return; }
                  setSelectedCreature(selectedCreature?.name === c.name ? null : c);
                }}
                activeOpacity={0.8}
              >
                <Text style={[{ fontSize: 28 }, !c.unlocked && { opacity: 0.25 }]}>{c.emoji}</Text>
                <Text style={[styles.creatureName, !c.unlocked && { color: Colors.textMuted }]}>{c.name}</Text>
                <RarityBadge rarity={c.rarity} />
                {!c.unlocked && !c.pro && !c.premiumLocked && c.sessionsNeeded > 0 && (
                  <View style={{ width: '100%', marginTop: 4 }}>
                    <ProgressBar progress={c.sessionsEarned / c.sessionsNeeded} color={RARITY_COLOR[c.rarity]} height={3} />
                  </View>
                )}
                {c.pro && <Ionicons name="star" size={10} color="#FF6B6B" style={{ marginTop: 4 }} />}
                {c.unlocked && <View style={styles.unlockedDot} />}
                {c.premiumLocked && (
                  <View style={styles.creaturePremiumLock}>
                    <Ionicons name="lock-closed" size={9} color={Colors.gold} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Achievements ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <View style={styles.achieveList}>
            {achievements.map(a => {
              const pct = a.total > 0 ? Math.min(1, a.progress / a.total) : 0;
              return (
                <View key={a.id} style={[styles.achieveCard, a.earned && styles.achieveCardDone, a.pro && styles.achieveCardPro]}>
                  <Text style={[{ fontSize: 26 }, !a.earned && !a.pro && { opacity: 0.4 }]}>{a.icon}</Text>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={styles.achieveTopRow}>
                      <Text style={[styles.achieveTitle, !a.earned && { color: a.pro ? '#FF6B6B' : Colors.textSecondary }]}>
                        {a.title}
                      </Text>
                      <View style={[styles.xpPill, a.earned && styles.xpPillDone]}>
                        <Ionicons name="sparkles" size={9} color={a.earned ? Colors.success : Colors.gold} />
                        <Text style={[styles.xpPillText, a.earned && { color: Colors.success }]}>
                          {a.earned ? 'Earned' : `+${a.xp} XP`}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.achieveDesc}>{a.desc}</Text>
                    {!a.earned && !a.pro && (
                      <View style={styles.achieveProgressRow}>
                        <ProgressBar progress={pct} color={Colors.primary} height={4} />
                        <Text style={styles.achieveCount}>{a.progress}/{a.total}</Text>
                      </View>
                    )}
                    {a.pro && <Text style={styles.proHint}>Deep. Pro exclusive</Text>}
                  </View>
                  {a.earned && <Ionicons name="checkmark-circle" size={22} color={Colors.success} />}
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Pro Banner ── */}
        {!isPremium && (
          <TouchableOpacity style={styles.proBanner} activeOpacity={0.9} onPress={showPaywall}>
            <LinearGradient
              colors={['rgba(0,180,216,0.15)', 'rgba(155,93,229,0.12)']}
              style={styles.proBannerInner}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <View style={styles.proBannerLeft}>
                <Text style={styles.proBannerTitle}>Unlock Deep. Premium</Text>
                <Text style={styles.proBannerSub}>AI Coach · All creatures · Daily challenges · Streak Shield</Text>
              </View>
              <View style={styles.proBannerRight}>
                <Text style={styles.proBannerCta}>Try Free</Text>
                <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </LinearGradient>
  );
}

function formatTime(seconds: number): string {
  if (seconds === 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.lg },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  title: { fontSize: Fonts.sizes.xl, fontWeight: Fonts.weights.bold, color: Colors.textPrimary },
  tierLabel: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.semibold, marginTop: 2 },
  levelBadge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1 },
  levelNum: { fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.bold },

  section: { marginBottom: Spacing.xl },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: Fonts.sizes.lg, fontWeight: Fonts.weights.bold, color: Colors.textPrimary, marginBottom: Spacing.md },
  sectionCount: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, marginBottom: Spacing.md },
  resetPill: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.md },
  resetText: { fontSize: Fonts.sizes.xs, color: Colors.textMuted },

  challengeList: { gap: Spacing.sm },
  challengeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.bgCard, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md },
  challengeCardDone: { borderColor: Colors.success + '44', backgroundColor: 'rgba(82,183,136,0.07)' },
  challengeIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(0,180,216,0.12)', alignItems: 'center', justifyContent: 'center' },
  challengeIconDone: { backgroundColor: Colors.success },
  challengeTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  challengeLabel: { fontSize: Fonts.sizes.sm, color: Colors.textPrimary, fontWeight: Fonts.weights.medium, flex: 1, marginRight: 8 },
  challengeLabelDone: { color: Colors.textSecondary, textDecorationLine: 'line-through' },
  challengeProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  challengeCount: { fontSize: Fonts.sizes.xs, color: Colors.textMuted, minWidth: 28, textAlign: 'right' },
  xpPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,214,10,0.1)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,214,10,0.25)' },
  xpPillDone: { backgroundColor: 'rgba(82,183,136,0.1)', borderColor: 'rgba(82,183,136,0.3)' },
  xpPillText: { fontSize: 10, color: Colors.gold, fontWeight: Fonts.weights.semibold },

  streakHero: { borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,214,10,0.2)' },
  streakHeroInner: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: Spacing.lg },
  streakLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  streakFlame: { fontSize: 44 },
  streakNum: { fontSize: 42, fontWeight: Fonts.weights.black, color: Colors.warning, lineHeight: 48 },
  streakSub: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, marginTop: -2 },
  streakRight: { flex: 1, alignItems: 'flex-end', gap: 6 },
  streakDots: { flexDirection: 'row', gap: 5 },
  streakDot: { width: 22, height: 22, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,214,10,0.2)' },
  streakDotFull: { backgroundColor: Colors.warning, borderColor: Colors.warning },
  streakDotLabel: { fontSize: 10, color: Colors.textMuted },
  bestStreakText: { fontSize: 10, color: Colors.textSecondary },
  shieldBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,214,10,0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,214,10,0.3)' },
  shieldText: { fontSize: 10, color: Colors.gold, fontWeight: Fonts.weights.semibold },

  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  statCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: Spacing.sm, alignItems: 'center', gap: 4, paddingVertical: 14 },
  statVal: { fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.bold },
  statLabel: { fontSize: 9, color: Colors.textSecondary, fontWeight: Fonts.weights.medium, textAlign: 'center' },

  chart: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: Colors.bgCard, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm, alignItems: 'flex-end', height: 140 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barCount: { fontSize: 9, color: Colors.textMuted },
  barBg: { height: 72, justifyContent: 'flex-end', width: '65%' },
  bar: { width: '100%', borderRadius: 4 },
  barDay: { fontSize: 11, color: Colors.textSecondary, fontWeight: Fonts.weights.medium },

  creatureDetail: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.bgCard, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.md },
  creatureDetailTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  creatureDetailName: { fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.bold, color: Colors.textPrimary },
  creatureDetailDesc: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary },
  creatureDetailProgress: { fontSize: Fonts.sizes.xs, color: Colors.textMuted, marginTop: 4 },

  creaturesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  creatureCard: { width: '22%', backgroundColor: Colors.bgCard, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 10, alignItems: 'center', gap: 3, position: 'relative' },
  creatureCardUnlocked: { borderColor: 'rgba(0,180,216,0.3)', backgroundColor: 'rgba(0,180,216,0.06)' },
  creatureCardPro: { borderColor: 'rgba(255,107,107,0.3)', backgroundColor: 'rgba(255,107,107,0.04)' },
  creatureCardPremiumLocked: { borderColor: 'rgba(255,214,10,0.2)', backgroundColor: 'rgba(255,214,10,0.03)' },
  creatureCardSelected: { borderColor: Colors.primary },
  creatureName: { fontSize: 9, color: Colors.textSecondary, textAlign: 'center', fontWeight: Fonts.weights.medium },
  unlockedDot: { position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  creaturePremiumLock: {
    position: 'absolute', top: 6, right: 6,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.bgCard,
    borderWidth: 1, borderColor: 'rgba(255,214,10,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },

  achieveList: { gap: Spacing.sm },
  achieveCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.bgCard, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: Spacing.md },
  achieveCardDone: { borderColor: Colors.success + '44', backgroundColor: 'rgba(82,183,136,0.07)' },
  achieveCardPro: { borderColor: 'rgba(255,107,107,0.3)', backgroundColor: 'rgba(255,107,107,0.04)' },
  achieveTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  achieveTitle: { fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.semibold, color: Colors.textPrimary, flex: 1, marginRight: 8 },
  achieveDesc: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary },
  achieveProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  achieveCount: { fontSize: Fonts.sizes.xs, color: Colors.textMuted, minWidth: 32 },
  proHint: { fontSize: Fonts.sizes.xs, color: '#FF6B6B', marginTop: 4, fontWeight: Fonts.weights.medium },

  proBanner: { borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,107,107,0.3)' },
  proBannerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg },
  proBannerLeft: { flex: 1, gap: 4 },
  proBannerTitle: { fontSize: Fonts.sizes.lg, fontWeight: Fonts.weights.bold, color: Colors.textPrimary },
  proBannerSub: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, lineHeight: 18 },
  proBannerRight: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 16 },
  proBannerCta: { fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.bold, color: '#FF6B6B' },
});
