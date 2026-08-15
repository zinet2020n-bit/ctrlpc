-- File transfers table for tracking sent/received files between devices
CREATE TABLE IF NOT EXISTS file_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid REFERENCES devices(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  size_bytes bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  from_name text,
  to_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE file_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_file_transfers" ON file_transfers;
CREATE POLICY "anon_select_file_transfers" ON file_transfers FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_file_transfers" ON file_transfers;
CREATE POLICY "anon_insert_file_transfers" ON file_transfers FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_file_transfers" ON file_transfers;
CREATE POLICY "anon_update_file_transfers" ON file_transfers FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_file_transfers" ON file_transfers;
CREATE POLICY "anon_delete_file_transfers" ON file_transfers FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_file_transfers_device ON file_transfers(device_id);
