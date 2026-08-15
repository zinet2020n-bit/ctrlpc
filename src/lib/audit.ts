export type AuditCategory = 'Clipboard' | 'Command' | 'Power' | 'File/Link' | 'Display' | 'System';
export type AuditStatus = 'SUCCESS' | 'INFO' | 'WARN' | 'ERROR';

export type AuditEvent = {
  id: string;
  ts: number;
  device: string;
  category: AuditCategory;
  details: string;
  status: AuditStatus;
};

const KEY = 'filelink.audit.v1';
const EVENT = 'filelink:audit';
const MAX = 500;

function read(): AuditEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || '[]') as AuditEvent[];
  } catch {
    return [];
  }
}

function write(list: AuditEvent[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX)));
  window.dispatchEvent(new Event(EVENT));
}

export function addAudit(
  category: AuditCategory,
  details: string,
  status: AuditStatus = 'SUCCESS',
  device = 'Local',
) {
  const list = read();
  list.push({
    id: crypto.randomUUID(),
    ts: Date.now(),
    device,
    category,
    details,
    status,
  });
  write(list);
}

export function getAudit(): AuditEvent[] {
  return read().slice().reverse();
}

export function clearAudit() {
  write([]);
}

export function subscribeAudit(cb: () => void) {
  if (typeof window === 'undefined') return () => {};
  const h = () => cb();
  window.addEventListener(EVENT, h);
  window.addEventListener('storage', h);
  return () => {
    window.removeEventListener(EVENT, h);
    window.removeEventListener('storage', h);
  };
}

export function exportCsv(list: AuditEvent[]): string {
  const rows = [['time', 'device', 'category', 'status', 'details']];
  list.forEach((e) =>
    rows.push([
      new Date(e.ts).toISOString(),
      e.device,
      e.category,
      e.status,
      e.details.replace(/"/g, '""'),
    ]),
  );
  return rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
}

export function download(name: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
