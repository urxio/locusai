export type UserProfile = {
  id: string
  name: string
  avatar_url: string | null
  timezone: string
  onboarded_at: string | null
  created_at: string
}

export type Goal = {
  id: string
  user_id: string
  title: string
  category: 'product' | 'health' | 'learning' | 'financial' | 'wellbeing' | 'other'
  timeframe: 'quarter' | 'year' | 'ongoing'
  target_date: string | null
  progress_pct: number
  next_action: string
  status: 'active' | 'completed' | 'paused'
  created_at: string
  updated_at: string
}

export type Habit = {
  id: string
  user_id: string
  name: string
  emoji: string
  frequency: string           // display label: "Daily", "Weekdays", "Mon · Wed · Fri", etc.
  days_of_week: number[] | null  // 0=Sun … 6=Sat; null or [] = every day
  target_count: number        // expected completions per week
  ends_at: string | null      // ISO date — optional end date
  time_of_day: 'morning' | 'afternoon' | 'evening' | null
  goal_id: string | null      // optional link to a goal
  created_at: string
}

export type WeeklyPlanBlock = {
  id: string
  user_id: string
  week_start: string
  day_of_week: number
  time_slot: 'morning' | 'afternoon' | 'evening'
  title: string
  type: 'goal' | 'custom'
  reference_id: string | null
  accepted: boolean
  position: number
  created_at: string
}

export type HabitLog = {
  id: string
  habit_id: string
  user_id: string
  logged_date: string
  created_at: string
}

export type CheckIn = {
  id: string
  user_id: string
  checked_in_at: string
  energy_level: number
  mood_note: string | null
  blockers: string[]
  highlight: string | null
  date: string
}

export type BriefPriority = {
  title: string
  category: 'work' | 'health' | 'personal' | 'learning'
  estimated_time: string
  time_of_day: 'morning' | 'afternoon' | 'evening' | 'flexible'
  reasoning: string
}

export type Brief = {
  id: string
  user_id: string
  brief_date: string
  generated_at: string
  model_used: string
  raw_prompt: string | null
  priorities: BriefPriority[]
  insight_text: string
  energy_score: number | null
  tokens_used: number | null
  stale: boolean
}

export type Task = {
  id: string
  user_id: string
  goal_id: string | null
  title: string
  category: string
  estimated_mins: number | null
  status: 'todo' | 'done' | 'skipped'
  due_date: string | null
  created_at: string
  completed_at: string | null
}

export type HabitWithLogs = Habit & {
  logs: HabitLog[]
  streak: number
  weekCompletions: number
  isScheduledToday: boolean   // true if habit is due today based on days_of_week
  linkedGoal: { id: string; title: string; category: Goal['category'] } | null
}

export type GoalStep = {
  id: string
  goal_id: string
  user_id: string
  title: string
  due_date: string | null
  completed: boolean
  completed_at: string | null
  position: number
  created_at: string
}

export type GoalWithSteps = Goal & {
  steps: GoalStep[]
}

export type JournalEntry = {
  id: string
  user_id: string
  date: string
  content: string
  created_at: string
  updated_at: string
}
