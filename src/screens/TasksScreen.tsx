import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { analyzeTask, TaskAnalysis } from '../services/claudeService';
import { useTasks, Task } from '../context/TasksContext';
import { usePremium } from '../context/PremiumContext';

type Filter = 'all' | 'active' | 'done';

const PRIORITY_COLOR: Record<string, string> = {
  high: '#FF6B6B',
  medium: '#FFD60A',
  low: '#52B788',
};

const CATEGORY_COLOR: Record<string, string> = {
  Work: Colors.primary,
  Design: '#9B5DE5',
  Comms: Colors.danger,
  Meeting: Colors.warning,
  Dev: Colors.success,
  Learning: '#48cae4',
  Personal: '#b794f4',
};

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const { tasks, setTasks, activeTask, setActiveTask, toggleTask, addTask } = useTasks();
  const { isPremium, showPaywall } = usePremium();

  const [input, setInput] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<TaskAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const moveTask = (id: string, direction: 'up' | 'down') => {
    setTasks(prev => {
      const idx = prev.findIndex(t => t.id === id);
      if (idx === -1) return prev;
      const next = direction === 'up' ? idx - 1 : idx + 1;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  };

  const addTaskPlain = () => {
    if (!input.trim()) return;
    addTask({
      id: String(Date.now()),
      title: input.trim(),
      category: 'Work',
      priority: 'medium',
      estimate: '25 min',
      subtasks: [],
      focusTip: '',
      pomodoroCount: 1,
      aiGenerated: false,
      completed: false,
      active: false,
    });
    setInput('');
    setAnalysis(null);
    setAnalysisError(null);
  };

  const runAIAnalysis = async () => {
    if (!input.trim()) return;
    setAnalyzing(true);
    setAnalysis(null);
    setAnalysisError(null);
    try {
      const result = await analyzeTask(input.trim());
      setAnalysis(result);
    } catch (e: any) {
      setAnalysisError(e?.message ?? 'Something went wrong. Try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const addTaskFromAnalysis = () => {
    if (!analysis || !input.trim()) return;
    addTask({
      id: String(Date.now()),
      title: input.trim(),
      category: analysis.category,
      priority: analysis.priority as any,
      estimate: analysis.timeEstimate,
      subtasks: analysis.subtasks,
      focusTip: analysis.focusTip,
      pomodoroCount: analysis.pomodoroCount,
      aiGenerated: true,
      completed: false,
      active: false,
    });
    setInput('');
    setAnalysis(null);
    setAnalysisError(null);
  };

  const shown = tasks.filter(t => {
    if (filter === 'active') return !t.completed;
    if (filter === 'done') return t.completed;
    return true;
  });

  const pendingCount = tasks.filter(t => !t.completed).length;
  const doneCount = tasks.filter(t => t.completed).length;

  const totalMins = tasks
    .filter(t => !t.completed)
    .reduce((sum, t) => sum + (parseInt(t.estimate) || 25), 0);
  const totalHrs = Math.floor(totalMins / 60);
  const remMins = totalMins % 60;
  const totalDisplay = totalHrs > 0 ? `${totalHrs}h ${remMins}m` : `${remMins}m`;

  const renderItem = ({ item: task, index }: { item: Task; index: number }) => {
    const isExpanded = expandedId === task.id;
    const hasSubtasks = task.subtasks.length > 0;
    const isCurrentActive = task.active && !task.completed;
    const isFirst = index === 0;
    const isLast = index === shown.length - 1;

    return (
      <View
        style={[
          styles.taskCard,
          isCurrentActive && styles.taskCardActive,
          task.completed && styles.taskCardDone,
        ]}
      >
        {isCurrentActive && <View style={styles.activeBar} />}
        <View style={styles.taskInner}>
          {/* Checkbox */}
          <TouchableOpacity
            onPress={() => toggleTask(task.id)}
            style={[styles.checkbox, task.completed && styles.checkboxDone]}
          >
            {task.completed && <Ionicons name="checkmark" size={12} color="white" />}
          </TouchableOpacity>

          {/* Content */}
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => {
              if (hasSubtasks) setExpandedId(isExpanded ? null : task.id);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.titleRow}>
              <Text style={[styles.taskTitle, task.completed && styles.taskTitleDone]} numberOfLines={2}>
                {task.title}
              </Text>
              {task.aiGenerated && <Ionicons name="sparkles" size={11} color={Colors.gold} />}
              {hasSubtasks && (
                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={13} color={Colors.textMuted} />
              )}
            </View>

            <View style={styles.taskMeta}>
              <View style={[styles.catChip, { backgroundColor: `${CATEGORY_COLOR[task.category] ?? Colors.primary}22` }]}>
                <Text style={[styles.catText, { color: CATEGORY_COLOR[task.category] ?? Colors.primary }]}>
                  {task.category}
                </Text>
              </View>
              <View style={styles.metaRight}>
                <View style={[styles.dot, { backgroundColor: PRIORITY_COLOR[task.priority] }]} />
                <Text style={styles.estimateText}>{task.estimate}</Text>
                {task.pomodoroCount > 0 && (
                  <Text style={styles.pomText}>×{task.pomodoroCount} 🍅</Text>
                )}
              </View>
            </View>

            {isExpanded && hasSubtasks && (
              <View style={styles.subtaskList}>
                {task.subtasks.map((step, i) => (
                  <View key={i} style={styles.subtaskRow}>
                    <View style={styles.subtaskNum}>
                      <Text style={styles.subtaskNumText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.subtaskText}>{step}</Text>
                  </View>
                ))}
                {task.focusTip ? (
                  <View style={styles.focusTipCard}>
                    <Ionicons name="bulb-outline" size={12} color={Colors.gold} />
                    <Text style={styles.focusTipText}>{task.focusTip}</Text>
                  </View>
                ) : null}
              </View>
            )}
          </TouchableOpacity>

          {/* Right side actions */}
          <View style={styles.taskActions}>
            {/* Set Active button */}
            {!task.completed && (
              <TouchableOpacity
                onPress={() => setActiveTask(task.id)}
                style={styles.setActiveBtn}
              >
                <Ionicons
                  name={isCurrentActive ? 'play-circle' : 'play-circle-outline'}
                  size={22}
                  color={isCurrentActive ? Colors.primary : Colors.textMuted}
                />
              </TouchableOpacity>
            )}
            {/* Up/down reorder arrows */}
            <View style={styles.reorderBtns}>
              <TouchableOpacity
                onPress={() => moveTask(task.id, 'up')}
                disabled={isFirst}
                style={styles.reorderBtn}
              >
                <Ionicons name="chevron-up" size={16} color={isFirst ? Colors.bgCard : Colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => moveTask(task.id, 'down')}
                disabled={isLast}
                style={styles.reorderBtn}
              >
                <Ionicons name="chevron-down" size={16} color={isLast ? Colors.bgCard : Colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const ListHeader = (
    <View>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>AI Task List</Text>
          <Text style={styles.subtitle}>{pendingCount} pending · {doneCount} done</Text>
        </View>
        <View style={styles.aiBadge}>
          <Ionicons name="sparkles" size={12} color={Colors.gold} />
          <Text style={styles.aiBadgeText}>Deep. Coach</Text>
        </View>
      </View>

      {activeTask && (
        <View style={styles.activeBanner}>
          <View style={styles.activeBannerLeft}>
            <View style={styles.activePulse} />
            <View style={{ flex: 1 }}>
              <Text style={styles.activeBannerLabel}>NOW FOCUSING ON</Text>
              <Text style={styles.activeBannerTitle} numberOfLines={1}>{activeTask.title}</Text>
            </View>
          </View>
          <Text style={styles.activeBannerEst}>{activeTask.estimate}</Text>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          value={input}
          onChangeText={v => { setInput(v); setAnalysis(null); setAnalysisError(null); }}
          placeholder="Describe a task for AI to plan..."
          placeholderTextColor={Colors.textMuted}
          style={styles.input}
          returnKeyType="done"
          onSubmitEditing={addTaskPlain}
        />
        <TouchableOpacity
          onPress={() => {
            if (!isPremium) { showPaywall(); return; }
            runAIAnalysis();
          }}
          disabled={analyzing || !input.trim()}
          style={[styles.aiBtn, !isPremium && styles.aiBtnLocked]}
        >
          {analyzing
            ? <ActivityIndicator size="small" color={Colors.gold} />
            : (
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="sparkles" size={18} color={!input.trim() ? Colors.textMuted : isPremium ? Colors.gold : Colors.textMuted} />
                {!isPremium && (
                  <View style={styles.aiLockBadge}>
                    <Ionicons name="lock-closed" size={7} color={Colors.gold} />
                  </View>
                )}
              </View>
            )
          }
        </TouchableOpacity>
        <TouchableOpacity onPress={addTaskPlain} disabled={!input.trim()}>
          <LinearGradient
            colors={input.trim() ? [Colors.primary, Colors.primaryDark] : [Colors.bgCard, Colors.bgCard]}
            style={styles.addBtn}
          >
            <Ionicons name="add" size={22} color={input.trim() ? 'white' : Colors.textMuted} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {analysisError && (
        <View style={styles.errorCard}>
          <Ionicons name="warning-outline" size={14} color={Colors.danger} />
          <Text style={styles.errorText}>{analysisError}</Text>
        </View>
      )}

      {analysis && (
        <View style={styles.coachCard}>
          <LinearGradient
            colors={['rgba(255,214,10,0.12)', 'rgba(0,180,216,0.06)']}
            style={styles.coachCardHeader}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Ionicons name="sparkles" size={14} color={Colors.gold} />
            <Text style={styles.coachCardTitle}>Deep. Coach Analysis</Text>
          </LinearGradient>
          <View style={styles.coachCardBody}>
            <View style={styles.coachStatsRow}>
              <View style={styles.coachStat}>
                <Text style={styles.coachStatValue}>{analysis.timeEstimate}</Text>
                <Text style={styles.coachStatLabel}>Estimate</Text>
              </View>
              <View style={styles.coachStatDivider} />
              <View style={styles.coachStat}>
                <Text style={[styles.coachStatValue, { color: PRIORITY_COLOR[analysis.priority] }]}>
                  {analysis.priority.charAt(0).toUpperCase() + analysis.priority.slice(1)}
                </Text>
                <Text style={styles.coachStatLabel}>Priority</Text>
              </View>
              <View style={styles.coachStatDivider} />
              <View style={styles.coachStat}>
                <Text style={styles.coachStatValue}>×{analysis.pomodoroCount}</Text>
                <Text style={styles.coachStatLabel}>Pomodoros</Text>
              </View>
              <View style={styles.coachStatDivider} />
              <View style={styles.coachStat}>
                <Text style={[styles.coachStatValue, { color: CATEGORY_COLOR[analysis.category] ?? Colors.primary, fontSize: 12 }]}>
                  {analysis.category}
                </Text>
                <Text style={styles.coachStatLabel}>Category</Text>
              </View>
            </View>
            <View style={styles.coachSection}>
              <Text style={styles.coachSectionLabel}>WHY THIS ESTIMATE</Text>
              <Text style={styles.coachReasoning}>{analysis.reasoning}</Text>
            </View>
            <View style={styles.coachSection}>
              <Text style={styles.coachSectionLabel}>ACTION PLAN</Text>
              {analysis.subtasks.map((step, i) => (
                <View key={i} style={styles.subtaskRow}>
                  <View style={styles.subtaskNum}>
                    <Text style={styles.subtaskNumText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.subtaskText}>{step}</Text>
                </View>
              ))}
            </View>
            <View style={styles.focusTipCard}>
              <Ionicons name="bulb-outline" size={14} color={Colors.gold} />
              <Text style={styles.focusTipText}>{analysis.focusTip}</Text>
            </View>
            <TouchableOpacity onPress={addTaskFromAnalysis} style={styles.addFromAIBtn} activeOpacity={0.85}>
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                style={styles.addFromAIGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <Ionicons name="checkmark-circle" size={18} color="white" />
                <Text style={styles.addFromAIText}>Add to Task List</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.filterRow}>
        {(['all', 'active', 'done'] as Filter[]).map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
          >
            <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const ListFooter = (
    <View>
      <View style={styles.footer}>
        <Ionicons name="time-outline" size={13} color={Colors.textSecondary} />
        <Text style={styles.footerText}>~{totalDisplay} of focus remaining today</Text>
      </View>
      <View style={{ height: 20 }} />
    </View>
  );

  return (
    <LinearGradient colors={['#020B18', '#041525', '#020B18']} style={styles.container}>
      <FlatList
        data={shown}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.lg },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.lg },
  title: { fontSize: Fonts.sizes.xl, fontWeight: Fonts.weights.bold, color: Colors.textPrimary },
  subtitle: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, marginTop: 4 },
  aiBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,214,10,0.12)',
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,214,10,0.3)',
  },
  aiBadgeText: { fontSize: Fonts.sizes.xs, color: Colors.gold, fontWeight: Fonts.weights.semibold },

  activeBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(0,180,216,0.1)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(0,180,216,0.3)',
    paddingHorizontal: Spacing.md, paddingVertical: 12, marginBottom: Spacing.lg,
  },
  activeBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 },
  activePulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.timerFocus },
  activeBannerLabel: { fontSize: 9, color: Colors.primary, fontWeight: Fonts.weights.bold, letterSpacing: 1 },
  activeBannerTitle: { fontSize: Fonts.sizes.sm, color: Colors.textPrimary, fontWeight: Fonts.weights.semibold, marginTop: 1 },
  activeBannerEst: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary },

  inputRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md, alignItems: 'center' },
  input: {
    flex: 1, backgroundColor: Colors.bgCard,
    borderRadius: 14, paddingHorizontal: Spacing.md, paddingVertical: 14,
    fontSize: Fonts.sizes.base, color: Colors.textPrimary,
    borderWidth: 1, borderColor: Colors.border,
  },
  aiBtn: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: 'rgba(255,214,10,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,214,10,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  aiBtnLocked: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: Colors.border,
  },
  aiLockBadge: {
    position: 'absolute', bottom: -6, right: -6,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: Colors.bgCard,
    borderWidth: 1, borderColor: Colors.gold + '66',
    alignItems: 'center', justifyContent: 'center',
  },
  addBtn: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  errorCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,107,107,0.1)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,107,107,0.3)',
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  errorText: { fontSize: Fonts.sizes.sm, color: Colors.danger, flex: 1 },

  coachCard: {
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,214,10,0.25)',
    overflow: 'hidden', marginBottom: Spacing.lg, backgroundColor: Colors.bgCard,
  },
  coachCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,214,10,0.15)',
  },
  coachCardTitle: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.bold, color: Colors.gold },
  coachCardBody: { padding: Spacing.md },
  coachStatsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  coachStat: { flex: 1, alignItems: 'center' },
  coachStatValue: { fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.bold, color: Colors.textPrimary, marginBottom: 2 },
  coachStatLabel: { fontSize: 10, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  coachStatDivider: { width: 1, height: 32, backgroundColor: Colors.border },
  coachSection: { marginBottom: Spacing.md },
  coachSectionLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: Fonts.weights.bold, letterSpacing: 1, marginBottom: 8 },
  coachReasoning: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, lineHeight: 20 },
  addFromAIBtn: { borderRadius: 12, overflow: 'hidden' },
  addFromAIGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  addFromAIText: { fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.bold, color: 'white' },

  filterRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md, alignItems: 'center' },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  filterTabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterTabText: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, fontWeight: Fonts.weights.medium },
  filterTabTextActive: { color: 'white', fontWeight: Fonts.weights.semibold },

  taskCard: {
    backgroundColor: Colors.bgCard, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden', marginBottom: Spacing.sm,
  },
  taskCardActive: { borderColor: 'rgba(0,212,255,0.5)', backgroundColor: 'rgba(0,180,216,0.06)' },
  taskCardDone: { opacity: 0.45 },
  activeBar: { height: 3, backgroundColor: Colors.primary },
  taskInner: { flexDirection: 'row', alignItems: 'flex-start', padding: Spacing.md, gap: 10 },
  checkbox: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0,
  },
  checkboxDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 8 },
  taskTitle: { fontSize: Fonts.sizes.base, color: Colors.textPrimary, fontWeight: Fonts.weights.medium, flex: 1 },
  taskTitleDone: { textDecorationLine: 'line-through', color: Colors.textMuted },
  taskMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  catText: { fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.semibold },
  metaRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  estimateText: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary },
  pomText: { fontSize: Fonts.sizes.xs, color: Colors.textMuted },

  taskActions: { flexDirection: 'column', alignItems: 'center', gap: 2, paddingLeft: 4 },
  setActiveBtn: { padding: 4 },
  reorderBtns: { flexDirection: 'column', alignItems: 'center' },
  reorderBtn: { padding: 3 },

  subtaskList: { marginTop: 10, gap: 6 },
  subtaskRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  subtaskNum: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(0,180,216,0.15)', borderWidth: 1, borderColor: 'rgba(0,180,216,0.3)',
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  subtaskNumText: { fontSize: 10, color: Colors.primary, fontWeight: Fonts.weights.bold },
  subtaskText: { flex: 1, fontSize: Fonts.sizes.sm, color: Colors.textSecondary, lineHeight: 20 },
  focusTipCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(255,214,10,0.06)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,214,10,0.2)',
    padding: 10, marginTop: 6,
  },
  focusTipText: { flex: 1, fontSize: Fonts.sizes.xs, color: Colors.textSecondary, lineHeight: 18 },

  footer: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingTop: Spacing.md },
  footerText: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary },
});
