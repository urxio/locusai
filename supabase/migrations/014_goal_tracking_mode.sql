-- Add tracking_mode to goals
-- 'manual'  → user sets progress_pct directly (default, backward-compatible)
-- 'steps'   → progress_pct is derived from goal_steps completion
-- 'habits'  → progress_pct is derived from linked habit log completions

ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS tracking_mode TEXT NOT NULL DEFAULT 'manual'
    CHECK (tracking_mode IN ('manual', 'steps', 'habits'));
