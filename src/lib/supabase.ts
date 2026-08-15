import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Copy .env.example to .env and fill in your credentials.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});

export type Device = {
  id: string;
  name: string;
  os: string;
  status: 'online' | 'offline';
  agent_version: string | null;
  last_seen: string | null;
  created_at: string;
};

export type ClipboardEntry = {
  id: string;
  device_id: string | null;
  content: string;
  content_type: string;
  pinned: boolean;
  created_at: string;
};

export type AuditLog = {
  id: string;
  device_id: string | null;
  command: string;
  status: string;
  output_summary: string | null;
  created_at: string;
};

export type ScheduledTask = {
  id: string;
  device_id: string | null;
  action: string;
  scheduled_for: string;
  executed: boolean;
  created_at: string;
};

export type FileTransfer = {
  id: string;
  device_id: string | null;
  file_name: string;
  size_bytes: number;
  status: string;
  from_name: string | null;
  to_name: string | null;
  created_at: string;
};
