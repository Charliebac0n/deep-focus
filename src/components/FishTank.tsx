import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Spacing } from '../theme';
import { useStats, XP_PER_LEVEL } from '../context/StatsContext';
import { usePremium } from '../context/PremiumContext';

const { width: SCREEN_W } = Dimensions.get('window');
const TANK_W = SCREEN_W - Spacing.lg * 2;
const TANK_H = 300;
const BOTTOM_H = 58;
const SWIM_TOP = 30;
const SWIM_H = TANK_H - BOTTOM_H - SWIM_TOP;

// Seeded pseudo-random so fish positions are deterministic
function sr(seed: number, lo: number, hi: number): number {
  const v = Math.abs(Math.sin(seed * 127.1 + 311.7) * 43758.5453);
  return lo + (v - Math.floor(v)) * (hi - lo);
}

interface FishDef {
  emoji: string;
  sessionsNeeded: number;
  rarity: 'common' | 'rare' | 'legendary';
  size: number;
  yFrac: number;
  speed: number;
  goRight: boolean;
  opacity: number;
}

const FISH_DEFS: FishDef[] = [
  { emoji: '🐠', sessionsNeeded: 5,   rarity: 'common',    size: 26, yFrac: 0.72, speed: 6500,  goRight: true,  opacity: 0.95 },
  { emoji: '🐡', sessionsNeeded: 10,  rarity: 'common',    size: 28, yFrac: 0.58, speed: 8200,  goRight: false, opacity: 0.92 },
  { emoji: '🐬', sessionsNeeded: 20,  rarity: 'rare',      size: 34, yFrac: 0.18, speed: 4800,  goRight: true,  opacity: 0.88 },
  { emoji: '🐙', sessionsNeeded: 35,  rarity: 'rare',      size: 30, yFrac: 0.81, speed: 14500, goRight: false, opacity: 0.82 },
  { emoji: '🦈', sessionsNeeded: 50,  rarity: 'rare',      size: 36, yFrac: 0.35, speed: 5500,  goRight: true,  opacity: 0.76 },
  { emoji: '🐋', sessionsNeeded: 80,  rarity: 'legendary', size: 42, yFrac: 0.08, speed: 20000, goRight: false, opacity: 0.52 },
  { emoji: '🦑', sessionsNeeded: 120, rarity: 'legendary', size: 32, yFrac: 0.50, speed: 11500, goRight: true,  opacity: 0.70 },
];

const SEAWEED_CFG = [
  { left: 10,           height: 50, color: '#0e6b3a', speed: 2300, delay: 0   },
  { left: 28,           height: 38, color: '#137a42', speed: 2700, delay: 450 },
  { left: TANK_W - 42,  height: 54, color: '#0c5e34', speed: 2100, delay: 200 },
  { left: TANK_W - 24,  height: 34, color: '#118845', speed: 2900, delay: 700 },
];

const BUBBLE_CFG = [
  { leftFrac: 0.11, size: 5, duration: 3300, startDelay: 0    },
  { leftFrac: 0.28, size: 4, duration: 2900, startDelay: 1100 },
  { leftFrac: 0.46, size: 6, duration: 3700, startDelay: 600  },
  { leftFrac: 0.62, size: 4, duration: 3100, startDelay: 2200 },
  { leftFrac: 0.78, size: 5, duration: 2700, startDelay: 1800 },
  { leftFrac: 0.89, size: 3, duration: 3500, startDelay: 900  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SwimmingFish({ def, fishIdx }: { def: FishDef; fishIdx: number }) {
  const { emoji, size, yFrac, speed, goRight, opacity } = def;
  const fromX = goRight ? -size * 1.5 : TANK_W + size;
  const toX   = goRight ? TANK_W + size : -size * 1.5;

  const xAnim   = useRef(new Animated.Value(fromX)).current;
  const bobAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay    = sr(fishIdx, 0, 1) * speed;
    const bobSpeed = sr(fishIdx * 3.7 + 1, 1100, 1900);

    const tSwim = setTimeout(() => {
      Animated.loop(
        Animated.timing(xAnim, { toValue: toX, duration: speed, useNativeDriver: true })
      ).start();
    }, delay);

    Animated.loop(
      Animated.sequence([
        Animated.timing(bobAnim, { toValue:  6, duration: bobSpeed, useNativeDriver: true }),
        Animated.timing(bobAnim, { toValue: -6, duration: bobSpeed, useNativeDriver: true }),
      ])
    ).start();

    return () => clearTimeout(tSwim);
  }, []);

  return (
    <Animated.Text
      style={{
        position: 'absolute',
        top: SWIM_TOP + yFrac * SWIM_H,
        fontSize: size,
        opacity,
        transform: [
          { translateX: xAnim },
          { translateY: bobAnim },
          { scaleX: goRight ? 1 : -1 },
        ],
      }}
    >
      {emoji}
    </Animated.Text>
  );
}

function Seaweed({ left, height, color, speed, delay }: typeof SEAWEED_CFG[0]) {
  const rotAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(rotAnim, { toValue:  1, duration: speed, useNativeDriver: true }),
          Animated.timing(rotAnim, { toValue: -1, duration: speed, useNativeDriver: true }),
        ])
      ).start();
    }, delay);
    return () => clearTimeout(t);
  }, []);

  const rotate = rotAnim.interpolate({ inputRange: [-1, 1], outputRange: ['-7deg', '7deg'] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: BOTTOM_H - 10,
        left,
        width: 7,
        height,
        backgroundColor: color,
        borderRadius: 4,
        // Rotate around the base: shift centre to bottom, rotate, shift back
        transform: [{ translateY: -(height / 2) }, { rotate }, { translateY: height / 2 }],
      }}
    />
  );
}

function Bubble({ leftFrac, size, duration, startDelay }: typeof BUBBLE_CFG[0]) {
  const yAnim  = useRef(new Animated.Value(0)).current;
  const opAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let alive = true;
    const run = () => {
      if (!alive) return;
      yAnim.setValue(0);
      opAnim.setValue(0.5);
      Animated.parallel([
        Animated.timing(yAnim,  { toValue: -(SWIM_H + SWIM_TOP - 8), duration, useNativeDriver: true }),
        Animated.timing(opAnim, { toValue: 0, duration, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished && alive) setTimeout(run, 700 + sr(leftFrac * 97, 0, 1400));
      });
    };
    const t = setTimeout(run, startDelay);
    return () => { alive = false; clearTimeout(t); };
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: BOTTOM_H + 8,
        left: leftFrac * (TANK_W - size),
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: 'rgba(180,235,255,0.55)',
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.5)',
        opacity: opAnim,
        transform: [{ translateY: yAnim }],
      }}
    />
  );
}

function SurfaceShimmer() {
  const a = useRef([
    new Animated.Value(0.50),
    new Animated.Value(0.25),
    new Animated.Value(0.40),
  ]).current;

  useEffect(() => {
    a.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 0.10, duration: 1800 + i * 500, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.55, duration: 1800 + i * 500, useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
      {a.map((anim, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            top: 12 + i * 8,
            left: 16,
            right: 16,
            height: i === 0 ? 2 : 1,
            backgroundColor: 'rgba(0,220,255,0.5)',
            borderRadius: 1,
            opacity: anim,
          }}
        />
      ))}
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FishTank() {
  const { stats, level, xpInLevel } = useStats();
  const { isPremium } = usePremium();

  const tierColor = useMemo(() => {
    if (level >= 21) return '#FFD60A';
    if (level >= 13) return '#9B5DE5';
    if (level >= 7)  return '#0077B6';
    if (level >= 3)  return '#00B4D8';
    return '#48CAE4';
  }, [level]);

  const nextFish = FISH_DEFS.find(f =>
    (f.rarity === 'common' || isPremium) && stats.totalSessions < f.sessionsNeeded
  );
  const hasAnyFish = FISH_DEFS.some(f =>
    (f.rarity === 'common' || isPremium) && stats.totalSessions >= f.sessionsNeeded
  );
  const sessionsToNext = nextFish ? nextFish.sessionsNeeded - stats.totalSessions : 0;
  const xpPct = Math.min(1, xpInLevel / XP_PER_LEVEL);

  // Slow-pulsing light shaft opacity
  const rayOp = useRef(new Animated.Value(0.7)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(rayOp, { toValue: 0.25, duration: 4500, useNativeDriver: true }),
        Animated.timing(rayOp, { toValue: 0.85, duration: 4500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.tank}>
      {/* ── Deep ocean background ── */}
      <LinearGradient
        colors={['#010c18', '#021422', '#032136', '#031c2e']}
        locations={[0, 0.28, 0.65, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Volumetric light shafts ── */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: rayOp }]}>
        {[0.13, 0.30, 0.50, 0.69, 0.86].map((x, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              top: -20,
              left: x * TANK_W,
              width: 1.5 + (i % 2) * 0.5,
              height: TANK_H * 0.60,
              backgroundColor: `rgba(0,200,255,${0.05 + (i % 3) * 0.02})`,
              transform: [{ rotate: `${9 + i * 4}deg` }],
            }}
          />
        ))}
      </Animated.View>

      {/* ── Seaweed — renders behind the floor strip ── */}
      {SEAWEED_CFG.map((sw, i) => <Seaweed key={i} {...sw} />)}

      {/* ── Ocean floor ── */}
      <View style={styles.floor} />

      {/* ── Pebbles on floor ── */}
      {[0.12, 0.31, 0.52, 0.71, 0.86].map((px, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            bottom: BOTTOM_H,
            left: px * (TANK_W - 20),
            width: 9 + (i % 3) * 4,
            height: 6 + (i % 2) * 3,
            borderRadius: 5,
            backgroundColor: `rgba(${68 + i * 12}, ${62 + i * 8}, ${58 + i * 5}, 0.78)`,
          }}
        />
      ))}

      {/* ── Coral (unlocks progressively with level) ── */}
      {level >= 2  && <Text style={[styles.coral, { left: Math.round(TANK_W * 0.16) }]}>🪸</Text>}
      {level >= 4  && <Text style={[styles.coral, { left: Math.round(TANK_W * 0.60), fontSize: 18 }]}>🪸</Text>}
      {level >= 7  && <Text style={[styles.coral, { left: Math.round(TANK_W * 0.38), fontSize: 14 }]}>🪸</Text>}
      {level >= 10 && <Text style={[styles.coral, { left: Math.round(TANK_W * 0.80), fontSize: 20 }]}>🪸</Text>}

      {/* ── Swimming fish ── */}
      {FISH_DEFS.map((f, i) => {
        const unlocked = (f.rarity === 'common' || isPremium) && stats.totalSessions >= f.sessionsNeeded;
        return unlocked ? <SwimmingFish key={f.emoji} def={f} fishIdx={i} /> : null;
      })}

      {/* ── Bubbles ── */}
      {BUBBLE_CFG.map((b, i) => <Bubble key={i} {...b} />)}

      {/* ── Water surface shimmer ── */}
      <SurfaceShimmer />

      {/* ── Empty state ── */}
      {!hasAnyFish && (
        <View pointerEvents="none" style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>{nextFish?.emoji ?? '🌊'}</Text>
          <Text style={styles.emptyText}>
            {stats.totalSessions === 0
              ? 'Complete a focus session to start your ocean'
              : `${sessionsToNext} more session${sessionsToNext !== 1 ? 's' : ''} to welcome ${nextFish?.emoji ?? ''} to your ocean`}
          </Text>
        </View>
      )}

      {/* ── XP / level bar ── */}
      <View style={styles.xpArea}>
        <View style={styles.xpRow}>
          <Text style={styles.xpText}>{xpInLevel} / {XP_PER_LEVEL} XP</Text>
          <Text style={styles.xpNextText}>Level {level + 1} →</Text>
        </View>
        <View style={styles.xpBg}>
          <LinearGradient
            colors={[tierColor, tierColor + '77']}
            style={[styles.xpFill, { width: `${xpPct * 100}%` }]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          />
        </View>
        {nextFish ? (
          <Text style={styles.nextHint}>
            🔓 {sessionsToNext} session{sessionsToNext !== 1 ? 's' : ''} until {nextFish.emoji} joins your ocean
          </Text>
        ) : hasAnyFish ? (
          <Text style={styles.nextHint}>🎉 All available companions are here!</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tank: {
    width: '100%',
    height: TANK_H,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,180,216,0.22)',
    marginBottom: Spacing.xl,
  },
  floor: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: BOTTOM_H,
    backgroundColor: '#041828',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,140,190,0.22)',
  },
  coral: {
    position: 'absolute',
    bottom: BOTTOM_H,
    fontSize: 20,
  },
  xpArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: BOTTOM_H,
    paddingHorizontal: Spacing.md,
    paddingTop: 10,
    paddingBottom: 7,
    gap: 4,
    justifyContent: 'space-evenly',
  },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  xpText: { fontSize: 11, color: 'rgba(130,215,255,0.85)', fontWeight: '500' },
  xpNextText: { fontSize: 11, color: 'rgba(100,190,240,0.55)' },
  xpBg: { height: 5, backgroundColor: 'rgba(0,80,130,0.5)', borderRadius: 3, overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 3 },
  nextHint: { fontSize: 10.5, color: 'rgba(100,200,255,0.65)' },
  emptyState: {
    position: 'absolute',
    top: SWIM_TOP,
    left: 0,
    right: 0,
    height: SWIM_H,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyEmoji: { fontSize: 42, opacity: 0.32 },
  emptyText: {
    fontSize: 13,
    color: 'rgba(100,180,220,0.62)',
    textAlign: 'center',
    paddingHorizontal: 36,
    lineHeight: 20,
  },
});
