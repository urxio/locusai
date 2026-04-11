-- Add highlight field to check_ins for capturing daily wins/positive moments
ALTER TABLE public.check_ins
  ADD COLUMN IF NOT EXISTS highlight TEXT DEFAULT NULL;
