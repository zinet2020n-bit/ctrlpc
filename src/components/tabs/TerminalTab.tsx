import { useEffect, useRef, useState } from 'react';
import {
  Loader2,
  ChevronRight,
  Lock,
  Unlock,
  Play,
} from 'lucide-react';
import { remoteExecStart, type DeviceInfo, type Session } from '@/lib/linkClient';
import { addAudit } from '@/lib/audit';
import { isUnlocked, tryUnlock, relock } from '@/lib/lock';

type Line = { kind: 'in' | 'out' | 'ok' | 'err' | 'dim' | 'warn'; text: string };

const HELP = `Commands
  ls                 list files
  cd <folder>        enter a folder (cd .., cd /)
  send --to <device> send a file to one PC
  devices            who is online / offline
  tasks              everything sent and received
  pwd    clear    help

Admin shell on a remote PC
  admin              type the passcode to unlock admin mode
  tasklist, dir      run native commands directly
  exit              leave admin mode`;

const VAULT_SCRIPTS = [
  { id: '1', label: 'System Info', command: 'systeminfo' },
  { id: '2', label: 'Task List', command: 'tasklist' },
  { id: '3', label: 'IP Config', command: 'ipconfig /all' },
  { id: '4', label: 'Disk Info', command: 'wmic logicaldisk get name,freespace,size' },
  { id: '5', label: 'Flush DNS', command: 'ipconfig /flushdns' },
  { id: '6', label: 'Whoami', command: 'whoami /groups' },
];

export function TerminalTab({ session, devices, target }: { session: Session | null; devices: DeviceInfo[]; target: string }) {
  const [lines, setLines] = useState<Line[]>([{ kind: 'dim', text: 'FileLink terminal — type "help" to see commands.' }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [admin, setAdmin] = useState(isUnlocked());
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwd, setPwd] = useState('');
  const [pwdErr, setPwdErr] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [lines]);

  function push(...l: Line[]) { setLines((prev) => [...prev, ...l]); }

  async function runCommand(raw: string) {
    const cmd = raw.trim();
    if (!cmd) return;
    push({ kind: 'in', text: `${admin ? '#' : '$'} ${cmd}` });
    setInput('');

    if (cmd === 'help') { push({ kind: 'out', text: HELP }); return; }
    if (cmd === 'clear') { setLines([]); return; }
    if (cmd === 'pwd') { push({ kind: 'out', text: '/room/shared' }); return; }
    if (cmd === 'devices') {
      devices.forEach((d) => push({ kind: d.online ? 'ok' : 'dim', text: `  ${d.name}  ${d.online ? 'online' : 'offline'}  ${d.osInfo || ''}` }));
      return;
    }
    if (cmd === 'admin') { setPwdOpen(true); return; }
    if (cmd === 'exit' && admin) { relock(); setAdmin(false); push({ kind: 'warn', text: 'Left admin mode.' }); return; }

    if (!target) { push({ kind: 'err', text: 'No device selected.' }); return; }

    setBusy(true);
    try {
      await remoteExecStart(session, target, cmd);
      push({ kind: 'ok', text: `executed on ${target}` });
      addAudit('Command', `${cmd} on ${target}`, 'SUCCESS', target);
    } catch (e) {
      push({ kind: 'err', text: `error: ${(e as Error).message}` });
      addAudit('Command', `${cmd} failed on ${target}`, 'ERROR', target);
    }
    setBusy(false);
  }

  function tryPwd() {
    if (tryUnlock(pwd)) { setAdmin(true); setPwdOpen(false); setPwd(''); setPwdErr(false); push({ kind: 'ok', text: 'Admin mode unlocked.' }); }
    else { setPwdErr(true); }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Script vault */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {VAULT_SCRIPTS.map((s) => (
          <button key={s.id} onClick={() => runCommand(s.command)} disabled={busy} className="ios-btn shrink-0 flex items-center gap-1.5 rounded-lg border border-border bg-cardhover px-3 py-1.5 text-xs font-mono text-muted-foreground hover:text-primary disabled:opacity-40">
            <Play className="w-3 h-3" /> {s.label}
          </button>
        ))}
      </div>

      {/* Admin badge */}
      <div className="flex items-center gap-2">
        {admin ? (
          <button onClick={() => { relock(); setAdmin(false); }} className="ios-btn flex items-center gap-1.5 rounded-lg bg-warning/15 border border-warning/30 px-3 py-1.5 text-xs font-semibold text-warning"><Unlock className="w-3.5 h-3.5" /> Admin Mode</button>
        ) : (
          <button onClick={() => setPwdOpen(true)} className="ios-btn flex items-center gap-1.5 rounded-lg bg-cardhover border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"><Lock className="w-3.5 h-3.5" /> Unlock Admin</button>
        )}
      </div>

      {/* Terminal output */}
      <div ref={scrollRef} className="flex-1 min-h-[300px] max-h-[500px] overflow-y-auto rounded-2xl border border-border bg-black p-4 font-mono text-sm shadow-terminal">
        {lines.map((l, i) => (
          <div key={i} className={
            l.kind === 'in' ? 'text-primary' :
            l.kind === 'out' ? 'text-foreground' :
            l.kind === 'ok' ? 'text-accent' :
            l.kind === 'err' ? 'text-destructive' :
            l.kind === 'warn' ? 'text-warning' :
            'text-muted-foreground'
          }>{l.text}</div>
        ))}
        {busy && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> executing...</div>}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
        <ChevronRight className="w-4 h-4 text-primary flex-shrink-0" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !busy && runCommand(input)}
          placeholder="Type a command..."
          disabled={busy}
          className="flex-1 bg-transparent font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      {/* Password dialog */}
      {pwdOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setPwdOpen(false)}>
          <div className="glass rounded-3xl p-6 max-w-sm w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2.5 mb-4"><Lock className="w-5 h-5 text-warning" /><h3 className="text-base font-bold text-foreground">Admin Unlock</h3></div>
            <input type="password" value={pwd} onChange={(e) => { setPwd(e.target.value); setPwdErr(false); }} onKeyDown={(e) => e.key === 'Enter' && tryPwd()} placeholder="Enter passcode..." autoFocus className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary mb-2" />
            {pwdErr && <p className="text-xs text-destructive mb-2">Incorrect passcode</p>}
            <div className="flex gap-3">
              <button onClick={() => setPwdOpen(false)} className="flex-1 py-2.5 rounded-xl bg-cardhover border border-border text-sm font-semibold text-foreground ios-btn">Cancel</button>
              <button onClick={tryPwd} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold ios-btn">Unlock</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
