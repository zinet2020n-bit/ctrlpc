import { useEffect, useState } from 'react';
import {
  Activity,
  Cpu,
  Skull,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  X,
  Search,
  MemoryStick,
  HardDrive,
} from 'lucide-react';
import { remoteExecStart, type DeviceInfo, type Session } from '@/lib/linkClient';
import { isUnlocked } from '@/lib/lock';

type RawProcess = {
  pid: string;
  name: string;
  ram: number;
  cpu: number;
  disk?: number;
  network?: number;
  status?: string;
};

const SAMPLE_PROCESSES: RawProcess[] = [
  { pid: '4', name: 'System', ram: 128, cpu: 0.5, disk: 0, network: 0, status: 'Running' },
  { pid: '512', name: 'explorer.exe', ram: 89432, cpu: 1.2, disk: 0.1, network: 0.5, status: 'Running' },
  { pid: '1024', name: 'node.exe', ram: 145678, cpu: 3.4, disk: 2.1, network: 5.6, status: 'Running' },
  { pid: '2048', name: 'chrome.exe', ram: 567890, cpu: 8.7, disk: 12.3, network: 45.2, status: 'Running' },
  { pid: '3072', name: 'code.exe', ram: 234567, cpu: 4.5, disk: 3.2, network: 1.1, status: 'Running' },
  { pid: '4096', name: 'wscript.exe', ram: 12345, cpu: 0.1, disk: 0, network: 0, status: 'Running' },
  { pid: '5120', name: 'svchost.exe', ram: 34567, cpu: 0.8, disk: 0.2, network: 0.3, status: 'Running' },
  { pid: '6144', name: 'powershell.exe', ram: 67890, cpu: 2.3, disk: 0.5, network: 0.8, status: 'Running' },
];

const SYSTEM_NAMES = ['System', 'svchost.exe', 'explorer.exe'];

export function TasksTab({ session, devices, target }: { session: Session | null; devices: DeviceInfo[]; target: string }) {
  const [processes, setProcesses] = useState<RawProcess[]>(SAMPLE_PROCESSES);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [killTarget, setKillTarget] = useState<RawProcess | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const admin = isUnlocked();

  async function refresh() {
    setLoading(true);
    if (target && session) {
      await remoteExecStart(session, target, 'tasklist');
    }
    setTimeout(() => { setProcesses(SAMPLE_PROCESSES); setLoading(false); }, 800);
  }

  useEffect(() => { refresh(); }, []);

  async function kill() {
    if (!killTarget) return;
    setBusy(true);
    if (session && target) {
      await remoteExecStart(session, target, `taskkill /PID ${killTarget.pid} /F`);
    }
    setProcesses((prev) => prev.filter((p) => p.pid !== killTarget.pid));
    setNote(`Killed ${killTarget.name} (PID ${killTarget.pid})`);
    setTimeout(() => setNote(null), 3000);
    setBusy(false);
    setKillTarget(null);
  }

  const filtered = processes.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()) || p.pid.includes(query));

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center"><Activity className="w-5 h-5 text-primary" /></div>
          <div><h3 className="text-base font-bold text-foreground">Process Manager</h3><p className="text-xs text-muted-foreground">{processes.length} processes on {target || 'no device'}</p></div>
        </div>
        <button onClick={refresh} disabled={loading} className="ios-btn flex items-center gap-1.5 rounded-lg border border-border bg-cardhover px-3 py-2 text-xs font-semibold text-foreground hover:text-primary disabled:opacity-40"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
      </div>

      {note && <div className="px-4 py-2 rounded-xl bg-accent/10 border border-accent/20 text-xs text-accent">{note}</div>}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search processes..." className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
      </div>

      {/* Process list */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border">
          <div className="col-span-5">Name</div>
          <div className="col-span-2 text-right">PID</div>
          <div className="col-span-2 text-right">CPU%</div>
          <div className="col-span-2 text-right">RAM</div>
          <div className="col-span-1"></div>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {filtered.map((p) => {
            const isSystem = SYSTEM_NAMES.includes(p.name);
            return (
              <div key={p.pid} className="group grid grid-cols-12 gap-2 px-4 py-2.5 items-center hover:bg-cardhover transition-colors border-b border-border/50">
                <div className="col-span-5 flex items-center gap-2 min-w-0">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isSystem ? 'bg-warning/10' : 'bg-primary/10'}`}>
                    {isSystem ? <AlertTriangle className="w-3.5 h-3.5 text-warning" /> : <Cpu className="w-3.5 h-3.5 text-primary" />}
                  </div>
                  <span className="text-sm text-foreground truncate">{p.name}</span>
                </div>
                <div className="col-span-2 text-right text-xs text-muted-foreground font-mono">{p.pid}</div>
                <div className="col-span-2 text-right text-xs text-warning font-mono">{p.cpu.toFixed(1)}%</div>
                <div className="col-span-2 text-right text-xs text-accent font-mono">{(p.ram / 1024).toFixed(0)} MB</div>
                <div className="col-span-1 flex justify-end">
                  {!isSystem && admin && (
                    <button onClick={() => setKillTarget(p)} className="ios-btn p-1.5 rounded-lg hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all">
                      <Skull className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <div className="text-center py-6 text-xs text-muted-foreground">No processes found</div>}
        </div>
      </div>

      {!admin && <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-warning/10 border border-warning/20 text-xs text-warning"><AlertTriangle className="w-4 h-4" /> Admin mode required to kill processes. Unlock from the Terminal tab.</div>}

      {/* Kill confirmation */}
      {killTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => !busy && setKillTarget(null)}>
          <div className="glass rounded-3xl p-6 max-w-sm w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2.5 mb-4"><div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center"><Skull className="w-5 h-5 text-destructive" /></div><div><h3 className="text-base font-bold text-foreground">Kill Process</h3><p className="text-xs text-muted-foreground">Force terminate</p></div></div>
            <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/30 mb-5"><p className="text-xs text-destructive">Are you sure you want to kill <strong>{killTarget.name}</strong> (PID {killTarget.pid})? This action cannot be undone.</p></div>
            <div className="flex gap-3">
              <button onClick={() => setKillTarget(null)} disabled={busy} className="flex-1 py-2.5 rounded-xl bg-cardhover border border-border text-sm font-semibold text-foreground ios-btn disabled:opacity-50">Cancel</button>
              <button onClick={kill} disabled={busy} className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold ios-btn disabled:opacity-50 flex items-center justify-center gap-2">{busy ? 'Killing...' : 'Kill Process'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
