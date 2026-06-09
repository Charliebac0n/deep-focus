import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = `You are Deep. Coach — an expert productivity and organisation assistant built into a Pomodoro focus app. You specialise in breaking tasks down, estimating time accurately, and creating structured deep-work plans.

When given a task description, respond with ONLY a valid JSON object (no markdown, no extra text) in this exact format:
{
  "timeEstimate": "X min" or "X hr Y min",
  "priority": "high" | "medium" | "low",
  "category": "Work" | "Design" | "Dev" | "Comms" | "Meeting" | "Learning" | "Personal",
  "reasoning": "One sentence explaining the time estimate",
  "subtasks": ["Step 1", "Step 2", "Step 3"],
  "focusTip": "One specific, actionable tip for this exact task",
  "pomodoroCount": number
}

Rules:
- Be realistic — account for thinking time, context switching, and revisions
- pomodoroCount = Math.ceil(totalMinutes / 25)
- 2–4 concrete, actionable subtasks
- focusTip must be specific to this task, not generic
- priority: high = urgent or high-impact; medium = important but not urgent; low = nice-to-have`;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Server misconfiguration' }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const { task } = await req.json();
    if (!task || typeof task !== 'string' || task.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'task is required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const upstream = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: task.trim() }],
      }),
    });

    if (!upstream.ok) {
      const body = await upstream.text();
      throw new Error(`Anthropic ${upstream.status}: ${body}`);
    }

    const data = await upstream.json();
    const text: string = data.content[0].text;
    const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const result = JSON.parse(clean);

    return new Response(JSON.stringify(result), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
