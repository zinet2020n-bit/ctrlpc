/*
# PC Control Center Schema

1. Purpose
   A remote PC control web app. Users register PCs as "devices" and send
   commands (power, agent, clipboard, terminal, file/link, display) from the
   web dashboard. This migration creates the tables that store devices,
   clipboard history, audit logs, and scheduled tasks.

2. New Tables
   - `devices` — registered PCs/laptops. Columns: id, name, os, status
     (online/offline), agent_version, last_seen, created_at.
   - `clipboard_history` — synced clipboard text across devices. Columns:
     id, device_id, content, content_type, pinned, created_at.
   - `audit_logs` — terminal command audit trail. Columns: id, device_id,
     command, status, output_summary, created_at.
   - `scheduled_tasks` — scheduled power actions. Columns: id, device_id,
     action, scheduled_for, executed, created_at.

3. Security
   - This is a single-tenant app (no sign-in screen). All policies use
     `TO anon, authenticated` with `USING (true)` because the data is
     intentionally shared/public within the app.
   - RLS enabled on every table.
*/

CREATE TABLE IF NOT EXISTS devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  os text NOT NULL DEFAULT 'Windows',
  status text NOT NULL DEFAULT 'offline',
  agent_version text,
  last_seen timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_devices" ON devices;
CREATE POLICY "anon_select_devices" ON devices FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_devices" ON devices;
CREATE POLICY "anon_insert_devices" ON devices FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_devices" ON devices;
CREATE POLICY "anon_update_devices" ON devices FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_devices" ON devices;
CREATE POLICY "anon_delete_devices" ON devices FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS clipboard_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid REFERENCES devices(id) ON DELETE CASCADE,
  content text NOT NULL,
  content_type text NOT NULL DEFAULT 'text',
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clipboard_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_clipboard" ON clipboard_history;
CREATE POLICY "anon_select_clipboard" ON clipboard_history FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_clipboard" ON clipboard_history;
CREATE POLICY "anon_insert_clipboard" ON clipboard_history FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_clipboard" ON clipboard_history;
CREATE POLICY "anon_update_clipboard" ON clipboard_history FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_clipboard" ON clipboard_history;
CREATE POLICY "anon_delete_clipboard" ON clipboard_history FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid REFERENCES devices(id) ON DELETE CASCADE,
  command text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  output_summary text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_audit" ON audit_logs;
CREATE POLICY "anon_select_audit" ON audit_logs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_audit" ON audit_logs;
CREATE POLICY "anon_insert_audit" ON audit_logs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_audit" ON audit_logs;
CREATE POLICY "anon_update_audit" ON audit_logs FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_audit" ON audit_logs;
CREATE POLICY "anon_delete_audit" ON audit_logs FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid REFERENCES devices(id) ON DELETE CASCADE,
  action text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  executed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scheduled_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_tasks" ON scheduled_tasks;
CREATE POLICY "anon_select_tasks" ON scheduled_tasks FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_tasks" ON scheduled_tasks;
CREATE POLICY "anon_insert_tasks" ON scheduled_tasks FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_tasks" ON scheduled_tasks;
CREATE POLICY "anon_update_tasks" ON scheduled_tasks FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_tasks" ON scheduled_tasks;
CREATE POLICY "anon_delete_tasks" ON scheduled_tasks FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_clipboard_device ON clipboard_history(device_id);
CREATE INDEX IF NOT EXISTS idx_audit_device ON audit_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_tasks_device ON scheduled_tasks(device_id);
