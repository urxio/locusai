-- Migration 008: Habit–Goal linking
-- Adds a nullable FK from habits to goals.
-- ON DELETE SET NULL: deleting a goal orphans its habits rather than deleting them.

ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS goal_id UUID
  REFERENCES public.goals(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS habits_goal_id_idx ON public.habits(goal_id);
