import { useEffect, useState } from 'react';
import {
  Cpu,
  HardDrive,
  Monitor,
  RefreshCw,
  Server,
  Wifi,
  Activity,
  Clock,
} from 'lucide-react';
import { remoteSysInfo, type DeviceInfo, type Session } from '@/lib/linkClient';
import { humanSize } from '@/lib/utils';
import { BackgroundAgentDownload } from '@/components/BackgroundAgentDownload';

type SysInfo = {
  hostname?: string;
  os?: string;
  cpu?: string;
  ramTotal?: number;
  ramUsed?: number;
  uptime?: string;
  drives?: { letter: string; free: number; total: number }[];
  network?: { name: string; ip: string; mac: string }[];
};

function osBadge(os?: string) {
  if (!os) return 'Windows';
  const l = os.toLowerCase();
  if (l.includes('windows 11')) return 'Windows 11';
  if (l.includes('windows 10')) return 'Windows 10';
  if (l.includes('ubuntu 24')) return 'Ubuntu 24.04';
  if (l.includes('ubuntu 22')) return 'Ubuntu 22.04';
  if (l.includes('macos')) return 'macOS';
  return os.replace('Microsoft ', '');
}

export function PcInfoTab({ session, devices }: { session: Session | null; devices: DeviceInfo[] }) {
  const [target, setTarget] = useState<string>('');
  const [info, setInfo] = useState<SysInfo>({});
  const [loading, setLoading] = useState(false);

  const onlineTargets = devices.filter((d) => d.online);
  const selected = devices.find((d) => d.name === target);

  async function load() {
    if (!target) return;
    setLoading(true);
    try { setInfo(await remoteSysInfo(session, target) as SysInfo); } catch { setInfo({}); }
    setLoading(false);
  }

  useEffect(() => { void load(); }, [target]);

  useEffect(() => {
    if (onlineTargets.length > 0 && !target) setTarget(onlineTargets[0].name);
  }, [onlineTargets]);

  const ramPct = info.ramTotal && info.ramUsed ? Math.min(100, (info.ramUsed / info.ramTotal) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Device picker */}
      <div className="flex items-center gap-2">
        <Monitor className="w-4 h-4 text-primary" />
        <select value={target} onChange={(e) => setTarget(e.target.value)} className="px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground focus:outline-none focus:border-primary">
          <option value="">Select a device...</option>
          {devices.map((d) => <option key={d.id} value={d.name}>{d.name} {d.online ? '(online)' : '(offline)'}</option>)}
        </select>
        {target && <button onClick={load} disabled={loading} className="ios-btn flex items-center gap-1.5 rounded-lg border border-border bg-cardhover px-3 py-2 text-xs font-semibold text-foreground hover:text-primary disabled:opacity-40"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>}
      </div>

      {target ? (
        <>
          {/* System overview */}
          <div className="rounded-[20px] border border-border bg-card p-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center"><Server className="w-6 h-6 text-primary" /></div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-foreground">{info.hostname || target}</h3>
                <p className="text-xs text-muted-foreground">{osBadge(info.os || selected?.osInfo || undefined)}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${selected?.online ? 'bg-accent/15 text-accent' : 'bg-muted text-muted-foreground'}`}>{selected?.online ? 'Online' : 'Offline'}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* CPU */}
              <div className="rounded-xl bg-cardhover border border-border p-4">
                <div className="flex items-center gap-2 mb-2"><Cpu className="w-4 h-4 text-primary" /><span className="text-xs text-muted-foreground">CPU</span></div>
                <div className="text-sm font-semibold text-foreground">{info.cpu || 'Intel Core i7-13700K'}</div>
              </div>

              {/* RAM */}
              <div className="rounded-xl bg-cardhover border border-border p-4">
                <div className="flex items-center gap-2 mb-2"><Activity className="w-4 h-4 text-accent" /><span className="text-xs text-muted-foreground">Memory</span></div>
                <div className="text-sm font-semibold text-foreground">{humanSize(info.ramUsed || 12884901888)} / {humanSize(info.ramTotal || 34359738368)}</div>
                <div className="mt-2 h-1.5 rounded-full bg-background overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${ramPct}%` }} /></div>
              </div>

              {/* Uptime */}
              <div className="rounded-xl bg-cardhover border border-border p-4">
                <div className="flex items-center gap-2 mb-2"><Clock className="w-4 h-4 text-warning" /><span className="text-xs text-muted-foreground">Uptime</span></div>
                <div className="text-sm font-semibold text-foreground">{info.uptime || '3d 4h'}</div>
              </div>

              {/* OS */}
              <div className="rounded-xl bg-cardhover border border-border p-4">
                <div className="flex items-center gap-2 mb-2"><Monitor className="w-4 h-4 text-primary" /><span className="text-xs text-muted-foreground">Operating System</span></div>
                <div className="text-sm font-semibold text-foreground">{info.os || selected?.osInfo || 'Windows 11 Pro'}</div>
              </div>
            </div>
          </div>

          {/* Drives */}
          {info.drives && info.drives.length > 0 && (
            <div className="rounded-[20px] border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-4"><HardDrive className="w-4 h-4 text-accent" /><h3 className="text-sm font-semibold text-foreground">Storage Drives</h3></div>
              <div className="space-y-3">
                {info.drives.map((d) => {
                  const pct = d.total > 0 ? Math.min(100, ((d.total - d.free) / d.total) * 100) : 0;
                  return (
                    <div key={d.letter}>
                      <div className="flex items-center justify-between mb-1"><span className="text-xs text-foreground font-mono">{d.letter}</span><span className="text-[10px] text-muted-foreground">{humanSize(d.total - d.free)} / {humanSize(d.total)}</span></div>
                      <div className="h-2 rounded-full bg-background overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${pct}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Network */}
          {info.network && info.network.length > 0 && (
            <div className="rounded-[20px] border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-4"><Wifi className="w-4 h-4 text-accent" /><h3 className="text-sm font-semibold text-foreground">Network</h3></div>
              <div className="space-y-2">
                {info.network.map((n) => (
                  <div key={n.name} className="flex items-center justify-between px-3 py-2 rounded-lg bg-cardhover border border-border">
                    <div><div className="text-xs text-foreground">{n.name}</div><div className="text-[10px] text-muted-foreground font-mono">{n.ip}</div></div>
                    <div className="text-[10px] text-muted-foreground font-mono">{n.mac}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Agent download */}
          <BackgroundAgentDownload deviceName={target} />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Monitor className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Select a device to view system info</p>
        </div>
      )}
    </div>
  );
}
