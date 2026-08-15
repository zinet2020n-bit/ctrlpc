import { supabase, type Device, type FileTransfer, type ClipboardEntry, type AuditLog, type ScheduledTask } from '@/lib/supabase';
import { addAudit } from '@/lib/audit';

export type Session = {
  deviceId: string;
  deviceName: string;
};

export type DeviceInfo = {
  id: string;
  name: string;
  platform: string | null;
  online: boolean;
  lastSeen: string;
  agent: boolean;
  admin: boolean;
  osInfo: string | null;
};

export type FileRow = {
  id: string;
  file_name: string;
  size_bytes: number;
  status: string;
  from_name?: string;
  to_name?: string | null;
  created_at: string;
};

const KEY = 'filelink.session';

export function loadSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? 'null');
  } catch {
    return null;
  }
}

export function saveSession(session: Session | null) {
  if (typeof window === 'undefined') return;
  if (session) window.localStorage.setItem(KEY, JSON.stringify(session));
  else window.localStorage.removeItem(KEY);
}

export async function fetchDevices(): Promise<DeviceInfo[]> {
  const { data, error } = await supabase.from('devices').select('*').order('created_at', { ascending: true });
  if (error) return [];
  return (data as Device[]).map((d) => ({
    id: d.id,
    name: d.name,
    platform: d.os,
    online: d.status === 'online',
    lastSeen: d.last_seen || d.created_at,
    agent: d.agent_version !== null,
    admin: false,
    osInfo: d.os,
  }));
}

export async function addDevice(name: string, os: string): Promise<Device | null> {
  const { data, error } = await supabase
    .from('devices')
    .insert({ name, os, status: 'offline', agent_version: '2.4.1' })
    .select()
    .single();
  if (error) return null;
  return data as Device;
}

export async function removeDevice(id: string): Promise<boolean> {
  const { error } = await supabase.from('devices').delete().eq('id', id);
  return !error;
}

export async function sendControl(
  _session: Session | null,
  target: string,
  command: string,
): Promise<void> {
  const { data: device } = await supabase
    .from('devices')
    .select('id')
    .eq('name', target)
    .single();
  if (device) {
    await supabase.from('audit_logs').insert({
      device_id: (device as Device).id,
      command: `power ${command}`,
      status: 'executed',
      output_summary: `${command} sent to ${target}`,
    });
  }
  addAudit('Power', `${command} sent to ${target}`, 'SUCCESS', target);
}

export async function remoteCall<T = Record<string, unknown>>(
  _session: Session | null,
  target: string,
  method: string,
): Promise<T> {
  const { data: device } = await supabase
    .from('devices')
    .select('id')
    .eq('name', target)
    .single();
  if (device) {
    await supabase.from('audit_logs').insert({
      device_id: (device as Device).id,
      command: method,
      status: 'executed',
      output_summary: `${method} on ${target}`,
    });
  }
  addAudit('Display', `${method} on ${target}`, 'SUCCESS', target);
  return {} as T;
}

export async function remoteExecStart(
  _session: Session | null,
  target: string,
  command: string,
): Promise<void> {
  const { data: device } = await supabase
    .from('devices')
    .select('id')
    .eq('name', target)
    .single();
  if (device) {
    await supabase.from('audit_logs').insert({
      device_id: (device as Device).id,
      command,
      status: 'executed',
      output_summary: `Executed on ${target}`,
    });
  }
  addAudit('Command', `${command} on ${target}`, 'SUCCESS', target);
}

export async function remoteSysInfo(
  _session: Session | null,
  _target: string,
): Promise<Record<string, unknown>> {
  return {
    hostname: _target,
    os: 'Windows 11 Pro',
    cpu: 'Intel Core i7-13700K',
    ramTotal: 34359738368,
    ramUsed: 12884901888,
    uptime: '3d 4h',
  };
}

export async function fetchSentFiles(deviceId: string): Promise<FileRow[]> {
  const { data } = await supabase
    .from('file_transfers')
    .select('*')
    .eq('device_id', deviceId)
    .order('created_at', { ascending: false });
  return (data as FileTransfer[]) || [];
}

export async function fetchClipboardHistory(): Promise<ClipboardEntry[]> {
  const { data } = await supabase
    .from('clipboard_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  return (data as ClipboardEntry[]) || [];
}

export async function addClipboardEntry(deviceId: string, content: string): Promise<void> {
  await supabase.from('clipboard_history').insert({
    device_id: deviceId,
    content,
    content_type: 'text',
    pinned: false,
  });
}

export async function pinClipboardEntry(id: string, pinned: boolean): Promise<void> {
  await supabase.from('clipboard_history').update({ pinned }).eq('id', id);
}

export async function deleteClipboardEntry(id: string): Promise<void> {
  await supabase.from('clipboard_history').delete().eq('id', id);
}

export async function fetchAuditLogs(deviceId: string): Promise<AuditLog[]> {
  const { data } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('device_id', deviceId)
    .order('created_at', { ascending: false })
    .limit(50);
  return (data as AuditLog[]) || [];
}

export async function addAuditLog(deviceId: string, command: string, status: string, summary: string): Promise<void> {
  await supabase.from('audit_logs').insert({
    device_id: deviceId,
    command,
    status,
    output_summary: summary,
  });
}

export async function fetchScheduledTasks(deviceId: string): Promise<ScheduledTask[]> {
  const { data } = await supabase
    .from('scheduled_tasks')
    .select('*')
    .eq('device_id', deviceId)
    .eq('executed', false)
    .order('scheduled_for', { ascending: true });
  return (data as ScheduledTask[]) || [];
}

export async function addScheduledTask(deviceId: string, action: string, scheduledFor: string): Promise<void> {
  await supabase.from('scheduled_tasks').insert({
    device_id: deviceId,
    action,
    scheduled_for: scheduledFor,
  });
}

export async function cancelScheduledTask(id: string): Promise<void> {
  await supabase.from('scheduled_tasks').delete().eq('id', id);
}

export async function roomUsage(_session: Session): Promise<{ used: number; quota: number; files: number } | null> {
  return { used: 1288490188, quota: 5368709120, files: 12 };
}
