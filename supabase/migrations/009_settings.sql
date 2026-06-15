-- ─────────────────────────────────────────────────────────────
-- Migration 009: App Settings & User Profiles  (idempotent)
-- Run this in the Supabase SQL Editor.
-- Safe to re-run: uses IF NOT EXISTS and ADD COLUMN IF NOT EXISTS.
-- ─────────────────────────────────────────────────────────────

-- ══ 1. app_settings ══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS app_settings (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Company
  company_name            text        NOT NULL DEFAULT 'HR Portal',
  company_industry        text        NOT NULL DEFAULT 'Technology',
  company_size            text        NOT NULL DEFAULT '51–200 employees',
  company_address         text        NOT NULL DEFAULT '',
  company_website         text        NOT NULL DEFAULT '',
  company_phone           text        NOT NULL DEFAULT '',
  company_email           text        NOT NULL DEFAULT '',
  company_logo_url        text        NOT NULL DEFAULT '',
  -- HR Configuration
  fiscal_year_start       text        NOT NULL DEFAULT 'January',
  default_currency        text        NOT NULL DEFAULT 'USD',
  timezone                text        NOT NULL DEFAULT 'UTC',
  date_format             text        NOT NULL DEFAULT 'MM/DD/YYYY',
  probation_days          integer     NOT NULL DEFAULT 90,
  working_days            text[]      NOT NULL DEFAULT ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday'],
  employee_id_prefix      text        NOT NULL DEFAULT 'EMP',
  candidate_id_prefix     text        NOT NULL DEFAULT 'CAN',
  offer_id_prefix         text        NOT NULL DEFAULT 'OFF',
  -- Security Policy
  min_password_length     integer     NOT NULL DEFAULT 8,
  require_uppercase       boolean     NOT NULL DEFAULT true,
  require_numbers         boolean     NOT NULL DEFAULT true,
  require_special_chars   boolean     NOT NULL DEFAULT false,
  session_timeout_minutes integer     NOT NULL DEFAULT 480,
  -- Appearance (global defaults)
  accent_color            text        NOT NULL DEFAULT 'indigo',
  sidebar_collapsed_default boolean   NOT NULL DEFAULT false,
  -- Timestamps
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- Add columns added after initial creation (idempotent)
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS employee_id_prefix      text    NOT NULL DEFAULT 'EMP';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS candidate_id_prefix      text    NOT NULL DEFAULT 'CAN';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS offer_id_prefix          text    NOT NULL DEFAULT 'OFF';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS min_password_length      integer NOT NULL DEFAULT 8;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS require_uppercase        boolean NOT NULL DEFAULT true;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS require_numbers          boolean NOT NULL DEFAULT true;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS require_special_chars    boolean NOT NULL DEFAULT false;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS session_timeout_minutes  integer NOT NULL DEFAULT 480;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS accent_color             text    NOT NULL DEFAULT 'indigo';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS sidebar_collapsed_default boolean NOT NULL DEFAULT false;

-- Seed one row if the table is empty
INSERT INTO app_settings (company_name)
VALUES ('HR Portal')
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "app_settings_authenticated" ON app_settings;
CREATE POLICY "app_settings_authenticated"
  ON app_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ══ 2. user_profiles ═════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_profiles (
  id                 uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email              text        NOT NULL DEFAULT '',
  display_name       text        NOT NULL DEFAULT '',
  phone              text        NOT NULL DEFAULT '',
  job_title          text        NOT NULL DEFAULT '',
  department         text        NOT NULL DEFAULT '',
  bio                text        NOT NULL DEFAULT '',
  role               text        NOT NULL DEFAULT 'hr_user'
                                 CHECK (role IN ('admin','hr_manager','hr_user','viewer')),
  is_active          boolean     NOT NULL DEFAULT true,
  notification_prefs jsonb       NOT NULL DEFAULT '{"new_candidate":true,"offer_accepted":true,"offer_rejected":false,"employee_joined":true,"review_due":true,"payroll_processed":false,"doc_uploaded":false,"email_digest":true}'::jsonb,
  avatar_url         text        NOT NULL DEFAULT '',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- Add columns added after initial creation (idempotent)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email     text    NOT NULL DEFAULT '';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- RLS
-- SELECT: any authenticated user reads all profiles (Users tab needs this)
-- INSERT: users can only create their own row  (auth.uid() = id)
-- UPDATE: any authenticated user can update any profile (role & active management)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_profiles_select" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update" ON user_profiles;

CREATE POLICY "user_profiles_select"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "user_profiles_insert"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "user_profiles_update"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ══ 3. Trigger: auto-create profile row on sign-up ═══════════
-- SECURITY DEFINER → runs as postgres (table owner), bypasses RLS.
-- This is intentional — a brand-new user has no JWT yet.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      split_part(COALESCE(NEW.email,''), '@', 1)
    )
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;   -- keep email in sync if it changes
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ══ 4. Backfill: profiles for users that existed before this migration ══

INSERT INTO user_profiles (id, email, display_name)
SELECT
  id,
  COALESCE(email, ''),
  split_part(COALESCE(email, ''), '@', 1)
FROM auth.users
ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;   -- backfill email into existing rows

-- ══ 5. Storage bucket for company logo ═══════════════════════
-- Run these manually in Supabase SQL Editor if the bucket doesn't exist yet:
--
--   INSERT INTO storage.buckets (id, name, public)
--   VALUES ('company-assets', 'company-assets', true)
--   ON CONFLICT DO NOTHING;
--
--   CREATE POLICY "company_assets_auth"
--     ON storage.objects FOR ALL
--     TO authenticated
--     USING  (bucket_id = 'company-assets')
--     WITH CHECK (bucket_id = 'company-assets');
