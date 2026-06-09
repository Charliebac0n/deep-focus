import { supabase } from './supabase';

export interface TaskAnalysis {
  timeEstimate: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  reasoning: string;
  subtasks: string[];
  focusTip: string;
  pomodoroCount: number;
}

export async function analyzeTask(taskDescription: string): Promise<TaskAnalysis> {
  const { data, error } = await supabase.functions.invoke('analyze-task', {
    body: { task: taskDescription },
  });

  if (error) throw new Error(`Edge Function error: ${error.message}`);
  if (data?.error) throw new Error(data.error);

  return data as TaskAnalysis;
}
