import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseReady } from '../services/supabase';

const STORAGE_KEY = '@deep_stats_v1';

export const XP_PER_SESSION = 20;
export const XP_PER_TASK = 10;
export const XP_PER_LEVEL = 1000;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DayRecord {
  date: string;        // 'YYYY-MM-DD'
  sessions: number;
  focusSeconds: number;
  tasksDone: number;
  aiTasksDone: number;
}

export interface Stats {
  totalSessions: number;
  totalFocusSeconds: number;
  totalTasksDone: number;
  currentStreak: number;
  longestStreak: number;
  xp: number;
  lastActiveDate: string;
  history: DayRecord[];  // last 60 days, ascending
  achievementsEarned: string[];
  completedChallenges: { date: string; ids: string[] };
}

interface StatsContextType {
  stats: Stats;
  statsLoaded: boolean;
  recordSession: (durationSeconds: number) => void;
  recordTaskDone: (isAI: boolean) => void;
  level: number;
  xpInLevel: number;
  todaySessions: number;
  todayFocusSeconds: number;
  todayTasksDone: number;
  todayAITasksDone: number;
  weekHistory: DayRecord[];
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const EMPTY_STATS: Stats = {
  totalSessions: 0,
  totalFocusSeconds: 0,
  totalTasksDone: 0,
  currentStreak: 0,
  longestStreak: 0,
  xp: 0,
  lastActiveDate: '',
  history: [],
  achievementsEarned: [],
  completedChallenges: { date: '', ids: [] },
};

const StatsContext = createContext<StatsContextType>({
  stats: EMPTY_STATS,
  statsLoaded: false,
  recordSession: () => {},
  recordTaskDone: () => {},
  level: 1,
  xpInLevel: 0,
  todaySessions: 0,
  todayFocusSeconds: 0,
  todayTasksDone: 0,
  todayAITasksDone: 0,
  weekHistory: [],
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysBetween(a: string, b: string): number {
  if (!a) return 999;
  const parse = (s: string) => {
    const [y, mo, d] = s.split('-').map(Number);
    return new Date(y, mo - 1, d).getTime();
  };
  return Math.round((parse(b) - parse(a)) / 86400000);
}

function upsertDay(
  history: DayRecord[],
  date: string,
  delta: Partial<Omit<DayRecord, 'date'>>,
): DayRecord[] {
  const idx = history.findIndex(d => d.date === date);
  const base: DayRecord = idx >= 0
    ? history[idx]
    : { date, sessions: 0, focusSeconds: 0, tasksDone: 0, aiTasksDone: 0 };
  const updated: DayRecord = {
    date,
    sessions:     base.sessions     + (delta.sessions     ?? 0),
    focusSeconds: base.focusSeconds + (delta.focusSeconds ?? 0),
    tasksDone:    base.tasksDone    + (delta.tasksDone    ?? 0),
    aiTasksDone:  base.aiTasksDone  + (delta.aiTasksDone  ?? 0),
  };
  const next = idx >= 0
    ? history.map((d, i) => (i === idx ? updated : d))
    : [...history, updated];
  return next.sort((a, b) => a.date.localeCompare(b.date)).slice(-60);
}

function computeAchievements(s: Stats, todayTasksDone: number, isNight: boolean): string[] {
  const earned = new Set(s.achievementsEarned);
  if (s.totalSessions >= 1)   earned.add('first_dive');
  if (s.currentStreak >= 7)   earned.add('on_fire');
  if (s.totalSessions >= 100) earned.add('deep_diver');
  if (isNight)                 earned.add('night_owl');
  if (todayTasksDone >= 5)     earned.add('speed_demon');
  return [...earned];
}

interface ChallengeResult { newIds: string[]; xpBonus: number }

function checkChallenges(
  completedChallenges: Stats['completedChallenges'],
  today: string,
  todaySessions: number,
  todayFocusMins: number,
  todayAITasksDone: number,
): ChallengeResult {
  const prevIds = completedChallenges.date === today ? completedChallenges.ids : [];
  const newIds: string[] = [];
  let xpBonus = 0;

  if (todaySessions >= 4       && !prevIds.includes('sessions'))  { newIds.push('sessions');  xpBonus += 80; }
  if (todayAITasksDone >= 2    && !prevIds.includes('ai_tasks'))  { newIds.push('ai_tasks');  xpBonus += 50; }
  if (todayFocusMins >= 90     && !prevIds.includes('focus_time'))  { newIds.push('focus_time'); xpBonus += 60; }

  return { newIds, xpBonus };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function StatsProvider({ children }: { children: React.ReactNode }) {
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [statsLoaded, setStatsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try { setStats(prev => ({ ...prev, ...JSON.parse(raw) })); } catch {}
      }
      setStatsLoaded(true);
    });
  }, []);

  const persist = useCallback((s: Stats) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s)).catch(() => {});
  }, []);

  const recordSession = useCallback((durationSeconds: number) => {
    if (isSupabaseReady) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return;
        supabase.from('sessions').insert({
          user_id: user.id,
          duration_seconds: durationSeconds,
          date: toDateStr(new Date()),
        }).then(undefined, console.warn);
      });
    }

    setStats(prev => {
      const today = toDateStr(new Date());
      const isNight = new Date().getHours() >= 22;

      const newHistory = upsertDay(prev.history, today, {
        sessions: 1,
        focusSeconds: durationSeconds,
      });

      const diff = daysBetween(prev.lastActiveDate, today);
      const streak = diff > 1 ? 1 : diff === 1 ? prev.currentStreak + 1 : prev.currentStreak;
      const longestStreak = Math.max(prev.longestStreak, streak);
      const totalSessions = prev.totalSessions + 1;
      const totalFocusSeconds = prev.totalFocusSeconds + durationSeconds;

      const todayRec = newHistory.find(d => d.date === today)!;
      const todayFocusMins = Math.floor(todayRec.focusSeconds / 60);
      const { newIds, xpBonus } = checkChallenges(
        prev.completedChallenges, today,
        todayRec.sessions, todayFocusMins, todayRec.aiTasksDone,
      );
      const prevIds = prev.completedChallenges.date === today ? prev.completedChallenges.ids : [];
      const completedChallenges = { date: today, ids: [...prevIds, ...newIds] };

      const xp = prev.xp + XP_PER_SESSION + xpBonus;

      const next: Stats = {
        ...prev,
        totalSessions,
        totalFocusSeconds,
        currentStreak: streak,
        longestStreak,
        lastActiveDate: today,
        xp,
        history: newHistory,
        completedChallenges,
        achievementsEarned: [],
      };
      next.achievementsEarned = computeAchievements(next, todayRec.tasksDone, isNight);

      persist(next);
      return next;
    });
  }, [persist]);

  const recordTaskDone = useCallback((isAI: boolean) => {
    setStats(prev => {
      const today = toDateStr(new Date());
      const newHistory = upsertDay(prev.history, today, {
        tasksDone: 1,
        aiTasksDone: isAI ? 1 : 0,
      });
      const totalTasksDone = prev.totalTasksDone + 1;
      const todayRec = newHistory.find(d => d.date === today)!;
      const todayFocusMins = Math.floor(todayRec.focusSeconds / 60);
      const { newIds, xpBonus } = checkChallenges(
        prev.completedChallenges, today,
        todayRec.sessions, todayFocusMins, todayRec.aiTasksDone,
      );
      const prevIds = prev.completedChallenges.date === today ? prev.completedChallenges.ids : [];
      const completedChallenges = { date: today, ids: [...prevIds, ...newIds] };
      const xp = prev.xp + XP_PER_TASK + xpBonus;

      const next: Stats = {
        ...prev,
        totalTasksDone,
        xp,
        history: newHistory,
        completedChallenges,
        achievementsEarned: [],
      };
      next.achievementsEarned = computeAchievements(next, todayRec.tasksDone, false);

      persist(next);
      return next;
    });
  }, [persist]);

  // ── Computed ──────────────────────────────────────────────────────────────

  const today = toDateStr(new Date());
  const todayRec: DayRecord = stats.history.find(d => d.date === today)
    ?? { date: today, sessions: 0, focusSeconds: 0, tasksDone: 0, aiTasksDone: 0 };

  const level = Math.floor(stats.xp / XP_PER_LEVEL) + 1;
  const xpInLevel = stats.xp % XP_PER_LEVEL;

  const weekHistory = useMemo((): DayRecord[] => {
    const out: DayRecord[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = toDateStr(d);
      out.push(
        stats.history.find(h => h.date === ds)
          ?? { date: ds, sessions: 0, focusSeconds: 0, tasksDone: 0, aiTasksDone: 0 },
      );
    }
    return out;
  }, [stats.history]);

  return (
    <StatsContext.Provider value={{
      stats,
      statsLoaded,
      recordSession,
      recordTaskDone,
      level,
      xpInLevel,
      todaySessions:     todayRec.sessions,
      todayFocusSeconds: todayRec.focusSeconds,
      todayTasksDone:    todayRec.tasksDone,
      todayAITasksDone:  todayRec.aiTasksDone,
      weekHistory,
    }}>
      {children}
    </StatsContext.Provider>
  );
}

export const useStats = () => useContext(StatsContext);
