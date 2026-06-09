import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStats } from './StatsContext';
import { supabase, isSupabaseReady } from '../services/supabase';

const STORAGE_KEY = '@deep_tasks_v1';

export type Priority = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  title: string;
  category: string;
  priority: Priority;
  estimate: string;
  subtasks: string[];
  focusTip: string;
  pomodoroCount: number;
  aiGenerated: boolean;
  completed: boolean;
  active: boolean;
}

interface TasksContextType {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  activeTask: Task | null;
  setActiveTask: (id: string) => void;
  toggleTask: (id: string) => void;
  addTask: (task: Task) => void;
  deleteTask: (id: string) => void;
}

const TasksContext = createContext<TasksContextType>({
  tasks: [],
  setTasks: () => {},
  activeTask: null,
  setActiveTask: () => {},
  toggleTask: () => {},
  addTask: () => {},
  deleteTask: () => {},
});

function persistTasks(tasks: Task[]) {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)).catch(() => {});
}

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasksRaw] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const { recordTaskDone } = useStats();
  const recordTaskDoneRef = useRef(recordTaskDone);
  recordTaskDoneRef.current = recordTaskDone;

  // Load from AsyncStorage on mount, then try Supabase if empty and logged in
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(async raw => {
      let local: Task[] = [];
      if (raw) {
        try { local = JSON.parse(raw); } catch {}
      }

      if (local.length === 0 && isSupabaseReady) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
          if (data && data.length > 0) {
            local = data.map(row => ({
              id: row.id,
              title: row.title,
              category: row.category ?? 'Work',
              priority: row.priority ?? 'medium',
              estimate: row.estimate ?? '',
              subtasks: row.subtasks ?? [],
              focusTip: row.focus_tip ?? '',
              pomodoroCount: row.pomodoro_count ?? 1,
              aiGenerated: row.ai_generated ?? false,
              completed: row.completed ?? false,
              active: false,
            }));
            persistTasks(local);
          }
        }
      }

      setTasksRaw(local);
      setLoaded(true);
    });
  }, []);

  const setTasks: React.Dispatch<React.SetStateAction<Task[]>> = useCallback((action) => {
    setTasksRaw(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      if (loaded) persistTasks(next);
      return next;
    });
  }, [loaded]);

  const activeTask = tasks.find(t => t.active && !t.completed) ?? null;

  const setActiveTask = useCallback((id: string) => {
    setTasks(prev => prev.map(t => ({ ...t, active: t.id === id })));
  }, [setTasks]);

  const toggleTask = useCallback((id: string) => {
    setTasks(prev => {
      const task = prev.find(t => t.id === id);
      if (!task) return prev;
      const completing = !task.completed;
      if (completing) {
        setTimeout(() => recordTaskDoneRef.current(task.aiGenerated), 0);
        if (isSupabaseReady) {
          supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return;
            supabase.from('tasks').update({ completed: true }).eq('id', id).eq('user_id', user.id).then(undefined, console.warn);
          });
        }
      }
      return prev.map(t =>
        t.id !== id ? t : { ...t, completed: completing, active: completing ? false : t.active },
      );
    });
  }, [setTasks]);

  const addTask = useCallback((task: Task) => {
    setTasks(prev => [task, ...prev]);
    if (isSupabaseReady) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return;
        supabase.from('tasks').insert({
          id: task.id,
          user_id: user.id,
          title: task.title,
          category: task.category,
          priority: task.priority,
          estimate: task.estimate,
          subtasks: task.subtasks,
          focus_tip: task.focusTip,
          pomodoro_count: task.pomodoroCount,
          ai_generated: task.aiGenerated,
          completed: task.completed,
        }).then(undefined, console.warn);
      });
    }
  }, [setTasks]);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    if (isSupabaseReady) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return;
        supabase.from('tasks').delete().eq('id', id).eq('user_id', user.id).then(undefined, console.warn);
      });
    }
  }, [setTasks]);

  return (
    <TasksContext.Provider value={{ tasks, setTasks, activeTask, setActiveTask, toggleTask, addTask, deleteTask }}>
      {children}
    </TasksContext.Provider>
  );
}

export const useTasks = () => useContext(TasksContext);
