# Locus — AI-Native Life OS: Implementation Plan

> A persistent AI life operating system that knows you — your goals, energy patterns, habits, and projects — and delivers a daily prioritization brief powered by Claude AI.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 14** (App Router) | Server Components, Server Actions, Vercel deploy — no separate backend needed |
| Database | **Supabase** (Postgres) | Auth + DB in one, RLS baked in, generous free tier |
| Auth | **Supabase Auth** | Magic links + Google OAuth, session available in Next.js middleware |
| AI | **Claude API** (`claude-haiku-4-5`) | Fast, cheap (~$0.001/brief), reliable structured JSON output |
| Styling | **Tailwind CSS** + custom CSS variables | Port design tokens from prototype into Tailwind config |
| Hosting | **Vercel** | Zero-config Next.js deploy, Edge functions available for streaming |

---

## Data Model

### Tables

**`users`** (extends Supabase auth.users)
```
id            uuid (FK → auth.users.id)
name          text
avatar_url    text
timezone      text (default 'UTC')
onboarded_at  timestamptz
created_at    timestamptz
```

**`goals`**
```
id            uuid
user_id       uuid (FK → users.id)
title         text
category      text  ('product' | 'health' | 'learning' | 'financial' | 'wellbeing' | 'other')
timeframe     text  ('quarter' | 'year' | 'ongoing')
target_date   date (nullable)
progress_pct  int   (0–100)
next_action   text
status        text  ('active' | 'completed' | 'paused')
created_at    timestamptz
updated_at    timestamptz
```

**`habits`**
```
id            uuid
user_id       uuid (FK → users.id)
name          text
emoji         text
frequency     text  ('daily' | '3x_week' | 'weekdays')
target_count  int   (per week)
created_at    timestamptz
```

**`habit_logs`**
```
id            uuid
habit_id      uuid (FK → habits.id)
user_id       uuid (FK → users.id)
logged_date   date
created_at    timestamptz
UNIQUE (habit_id, logged_date)
```

**`check_ins`**
```
id              uuid
user_id         uuid (FK → users.id)
checked_in_at   timestamptz
energy_level    int    (1–10)
mood_note       text   (freeform, nullable)
blockers        text[] (array of blocker keys)
date            date
UNIQUE (user_id, date)
```

**`briefs`**
```
id              uuid
user_id         uuid (FK → users.id)
brief_date      date
generated_at    timestamptz
model_used      text
raw_prompt      text
priorities      jsonb  ([{title, category, estimated_time, time_of_day, reasoning}])
insight_text    text
energy_score    float
tokens_used     int
stale           boolean (default false)
UNIQUE (user_id, brief_date)
```

**`tasks`**
```
id              uuid
user_id         uuid (FK → users.id)
goal_id         uuid (FK → goals.id, nullable)
title           text
category        text
estimated_mins  int
status          text  ('todo' | 'done' | 'skipped')
due_date        date  (nullable)
created_at      timestamptz
completed_at    timestamptz (nullable)
```

### Key relationships
- One user → many goals, habits, check_ins, briefs, tasks
- A `brief` references the user's current goals, recent check_ins, and habit_logs
- A `check_in` marks the existing brief as `stale`, triggering regeneration
- Row-Level Security: all tables enforce `user_id = auth.uid()`

---

## AI Architecture — The Daily Brief

### What context Claude needs

1. **User profile** — name, timezone
2. **Active goals** (max 5) — title, category, progress %, next action, deadline
3. **Today's check-in** — energy level (1–10), mood note, blockers
4. **Recent energy pattern** — last 14 days of energy scores as array
5. **Habit performance** — each habit's completion rate over last 7 days + streak
6. **Task completion rate** — completed / created over last 7 days
7. **Day of week** — model weights recommendations differently Mon vs Fri

### System prompt (fixed, ~400 tokens)
```
You are Locus, an AI life operating system. You know this user intimately through
their daily check-ins, goal progress, and energy patterns. Your job is to generate
a daily brief that helps them prioritize ruthlessly and understand themselves better.

Tone: warm, direct, intelligent. Never generic. Reference specific data.
Never say "based on your data" — show the insight, don't narrate it.

Return a JSON object with this exact shape:
{
  "insight": "string (2-3 sentences, specific to today)",
  "priorities": [
    {
      "title": "string",
      "category": "work|health|personal|learning",
      "estimated_time": "string (e.g. '~2h')",
      "time_of_day": "morning|afternoon|evening|flexible",
      "reasoning": "string (1 sentence why this is #1 today)"
    }
  ],
  "energy_note": "string (1 sentence about today's energy context)"
}

Return 3 priorities. Rank by: urgency × goal alignment × energy match.
```

### Key files
- `lib/ai/context.ts` — `buildBriefContext(userId, date)`: queries all user data in parallel
- `lib/ai/prompts.ts` — `SYSTEM_PROMPT` + `buildUserMessage(context)`
- `lib/ai/parse.ts` — `parseBriefResponse(rawJSON)` with fallback
- `app/api/brief/generate/route.ts` — auth → build context → Claude → store → return

### Caching
- If `briefs` table has a non-stale entry for `(user_id, today)` → return cached, no API call
- On check-in submission → set `briefs.stale = true` → next Brief view triggers regeneration
- Log `tokens_used` per brief to track per-user AI costs

---

## File Structure

```
/locus
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (onboarding)/
│   │   └── onboarding/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx              ← MainLayout with Sidebar
│   │   ├── page.tsx                ← redirect to /brief
│   │   ├── brief/page.tsx
│   │   ├── goals/page.tsx
│   │   ├── checkin/page.tsx
│   │   └── review/page.tsx
│   ├── api/
│   │   ├── brief/generate/route.ts
│   │   └── brief/feedback/route.ts
│   └── actions/
│       ├── checkin.ts
│       └── goals.ts
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── MainLayout.tsx
│   ├── brief/
│   │   ├── DailyBrief.tsx
│   │   ├── AICard.tsx
│   │   ├── EnergyBar.tsx
│   │   ├── PriorityCard.tsx
│   │   └── StatsRow.tsx
│   ├── goals/
│   │   ├── GoalsList.tsx
│   │   ├── GoalCard.tsx
│   │   └── GoalForm.tsx
│   ├── checkin/
│   │   ├── CheckinFlow.tsx
│   │   └── EnergySlider.tsx
│   ├── weekly/
│   │   ├── WeeklyReview.tsx
│   │   ├── EnergyChart.tsx
│   │   └── HabitCard.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Card.tsx
│       └── Badge.tsx
├── lib/
│   ├── supabase/
│   │   ├── server.ts
│   │   └── client.ts
│   ├── ai/
│   │   ├── client.ts
│   │   ├── context.ts              ← highest-leverage file
│   │   ├── prompts.ts
│   │   └── parse.ts
│   ├── db/
│   │   ├── goals.ts
│   │   ├── checkins.ts
│   │   ├── habits.ts
│   │   └── briefs.ts
│   └── types.ts
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       └── 002_rls_policies.sql
├── middleware.ts
└── tailwind.config.ts
```

---

## Phased Roadmap

### Phase 1 — Foundation (Weeks 1–2)
**Goal:** Working app with auth, persistent data, full UI ported from HTML prototype.

- [ ] Next.js 14 project scaffold + Tailwind with design tokens
- [ ] Supabase project + all table migrations + RLS policies
- [ ] Auth: login/signup pages (email + Google OAuth)
- [ ] Middleware auth guard
- [ ] Port `locus_lifeos.html` prototype into React components
- [ ] Check-in flow wired to DB
- [ ] Goals display wired to DB
- [ ] Habits display wired to DB
- [ ] Seed script for development data

**Done when:** Log in, see real goals/habits from DB, submit a check-in that persists. Brief view shows placeholder AI card.

---

### Phase 2 — AI Core (Weeks 3–4)
**Goal:** Real Claude-generated daily briefs from real user data.

- [ ] `@anthropic-ai/sdk` installed, API key in env
- [ ] `lib/ai/client.ts` — Anthropic singleton
- [ ] `lib/ai/context.ts` — `buildBriefContext()` with parallel Supabase queries
- [ ] `lib/ai/prompts.ts` — system prompt + user message template
- [ ] `lib/ai/parse.ts` — JSON response parser with fallback
- [ ] `app/api/brief/generate/route.ts` — full pipeline
- [ ] Brief caching (no duplicate API calls for same day)
- [ ] Check-in → brief staleness pipeline
- [ ] Onboarding flow (non-skippable goal/habit entry)
- [ ] Loading skeleton for brief view
- [ ] Error states throughout

**Done when:** Complete a check-in, navigate to Daily Brief, see a Claude-generated brief that references your actual goals and energy pattern.

> ⚠️ Budget 3–5 hours on prompt tuning. This is what makes the product feel magical vs generic.

---

### Phase 3 — Beta (Weeks 5–7)
**Goal:** 10–20 real users, feedback loop established.

- [ ] Invite code gate on signup
- [ ] Goals CRUD (create, edit, update progress, complete)
- [ ] Habits CRUD + one-tap daily logging
- [ ] Weekly Review wired to real data
- [ ] Weekly AI reflection (separate Claude call, cached weekly)
- [ ] Thumbs up/down feedback on Daily Brief
- [ ] `brief_feedback` table + storage
- [ ] Error handling + retry logic for Claude calls
- [ ] Structured logging to Vercel logs

**Done when:** 10 real users have completed 3+ check-ins and provided feedback on brief quality.

---

### Phase 4 — Growth (Weeks 8–12)
**Goal:** Retention, deeper AI, monetization.

- [ ] Patterns view (rolling 4-week energy chart, day-of-week analysis)
- [ ] Streak + momentum system
- [ ] Stripe integration ($8–12/mo Pro plan)
- [ ] Feature gating (free: 7-day history, 3 goals; pro: unlimited + patterns)
- [ ] PWA manifest + service worker for mobile
- [ ] Weekly email digest (Resend)
- [ ] Brief quality feedback loop (user-specific prompt addendum after 30 check-ins)

---

## Critical Path

```
Supabase schema
    ↓
Auth (login/signup)
    ↓
UI port from prototype → React components
    ↓
Check-in wired to DB          Goals wired to DB
    ↓                               ↓
         buildBriefContext()
                ↓
        Claude API integration
                ↓
          Prompt tuning
                ↓
        Onboarding flow
                ↓
     Invite system + beta users
```

**The single most important file:** `lib/ai/context.ts`  
Brief quality is 100% determined by what you feed the model. Get this right before recruiting beta users.

---

## What NOT to Build (MVP cuts)

| Cut | Reason |
|---|---|
| Calendar integration | OAuth complexity, refresh token management — not needed for good briefs |
| React Native / mobile app | Use PWA |
| Social / sharing features | Personal OS — social dilutes the core product |
| AI task auto-generation | Too aggressive, kills trust when the AI is wrong |
| Notion / Todoist integrations | Every integration is ongoing maintenance |
| Custom themes / light mode | The warm dark palette IS the brand |
| Journal / long-form notes | `mood_note` on check-in is enough |
| Brief editing | Undermines data integrity — regenerate instead |
| Push notifications | Use Vercel Cron to pre-generate briefs; no notification center needed |
| Team / multi-user features | Single-user only through Phase 4 |

---

## Summary

| Phase | Duration | Key Output | Main Risk |
|---|---|---|---|
| 1 — Foundation | 2 weeks | Auth + DB + UI port | Low — translation work |
| 2 — AI Core | 2 weeks | Real Claude briefs from real data | Medium — prompt quality |
| 3 — Beta | 3 weeks | 10–20 users, feedback loop | Medium — onboarding drop-off |
| 4 — Growth | 4 weeks | Retention, patterns, monetization | Medium-high — scope creep |

---

*Prototype reference: `locus_lifeos.html` — source of truth for all component structure, CSS variables, and design tokens. Every React component is derived from this file.*
