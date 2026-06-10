-- ═══════════════════════════════════════════════════════════
-- SAKALA Summer 2026 -- Database Schema
-- Run this in Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Sponsors (applications + accounts)
CREATE TABLE IF NOT EXISTS public.sponsors (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at       TIMESTAMPTZ DEFAULT now(),
  first_name       TEXT        NOT NULL,
  last_name        TEXT        NOT NULL,
  email            TEXT        UNIQUE NOT NULL,
  location         TEXT,
  connection       TEXT,
  message          TEXT,
  status           TEXT        DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  user_id          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  payment_complete BOOLEAN     DEFAULT false,
  admin_notes      TEXT
);

-- Youth cohort (15 slots)
CREATE TABLE IF NOT EXISTS public.youth (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_number  INTEGER UNIQUE NOT NULL CHECK (slot_number BETWEEN 1 AND 15),
  code_name    TEXT    NOT NULL,
  age          INTEGER,
  bio          TEXT    DEFAULT 'Profile coming soon.',
  photo_url    TEXT,
  community    TEXT    DEFAULT 'Nord Department, Haiti',
  program_note TEXT
);

-- Sponsor <> Youth pairing (one sponsor, one youth)
CREATE TABLE IF NOT EXISTS public.sponsor_youth (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  sponsor_id  UUID        UNIQUE REFERENCES public.sponsors(id) ON DELETE CASCADE,
  youth_id    UUID        UNIQUE REFERENCES public.youth(id)    ON DELETE SET NULL
);

-- Field dispatches / updates
CREATE TABLE IF NOT EXISTS public.updates (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      TIMESTAMPTZ DEFAULT now(),
  title           TEXT        NOT NULL,
  content         TEXT        NOT NULL,
  photo_url       TEXT,
  youth_id        UUID        REFERENCES public.youth(id) ON DELETE SET NULL,
  published       BOOLEAN     DEFAULT true,
  dispatch_number INTEGER
);

-- ── Seed 15 youth slots ──────────────────────────────────────
INSERT INTO public.youth (slot_number, code_name) VALUES
  (1,'Youth 01'),(2,'Youth 02'),(3,'Youth 03'),(4,'Youth 04'),(5,'Youth 05'),
  (6,'Youth 06'),(7,'Youth 07'),(8,'Youth 08'),(9,'Youth 09'),(10,'Youth 10'),
  (11,'Youth 11'),(12,'Youth 12'),(13,'Youth 13'),(14,'Youth 14'),(15,'Youth 15')
ON CONFLICT (slot_number) DO NOTHING;

-- ── Row Level Security ───────────────────────────────────────
ALTER TABLE public.sponsors     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youth        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_youth ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.updates      ENABLE ROW LEVEL SECURITY;

-- Anyone can submit an application
CREATE POLICY "public_apply" ON public.sponsors
  FOR INSERT WITH CHECK (true);

-- Sponsors can read their own record
CREATE POLICY "sponsors_read_own" ON public.sponsors
  FOR SELECT USING (auth.uid() = user_id);

-- Sponsors can read their paired youth
CREATE POLICY "sponsors_read_youth" ON public.youth
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sponsor_youth sy
      JOIN public.sponsors s ON s.id = sy.sponsor_id
      WHERE sy.youth_id = youth.id AND s.user_id = auth.uid()
    )
  );

-- Sponsors can read their own pairing
CREATE POLICY "sponsors_read_pairing" ON public.sponsor_youth
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sponsors s
      WHERE s.id = sponsor_youth.sponsor_id AND s.user_id = auth.uid()
    )
  );

-- Sponsors can read published updates for their youth + general dispatches
CREATE POLICY "sponsors_read_updates" ON public.updates
  FOR SELECT USING (
    published = true AND (
      youth_id IS NULL OR
      EXISTS (
        SELECT 1 FROM public.sponsor_youth sy
        JOIN public.sponsors s ON s.id = sy.sponsor_id
        WHERE sy.youth_id = updates.youth_id AND s.user_id = auth.uid()
      )
    )
  );

-- ═══════════════════════════════════════════════════════════
-- After running: go to Authentication > Settings and set:
--   Site URL:     https://analyticsresearchsciencesorcercies.github.io
--   Redirect URLs: https://analyticsresearchsciencesorcercies.github.io/sakala-summer-2026/dashboard.html
-- ═══════════════════════════════════════════════════════════
