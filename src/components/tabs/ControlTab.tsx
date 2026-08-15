import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Globe,
  Lock,
  Monitor,
  Moon,
  Power,
  RefreshCw,
  RotateCw,
  Skull,
  X,
  Check,
  Loader2,
  CheckCircle2,
  Zap,
  Clipboard,
  MonitorSmartphone,
  ScrollText,
  Send,
  Save,
  Download,
  Trash2,
  Camera,
  Video,
} from 'lucide-react';
import {
  sendControl,
  remoteCall,
  remoteExecStart,
  fetchClipboardHistory,
  addClipboardEntry,
  pinClipboardEntry,
  deleteClipboardEntry,
  fetchAuditLogs,
  fetchScheduledTasks,
  addScheduledTask,
  cancelScheduledTask,
  type DeviceInfo,
  type Session,
} from '@/lib/linkClient';
import { addAudit, getAudit, subscribeAudit, clearAudit, exportCsv, download, type AuditEvent } from '@/lib/audit';

const POWER_ACTIONS = [
  { key: 'shutdown', label: 'Shutdown', icon: Power, tone: 'warning', destructive: true, desc: 'Power off the device completely' },
  { key: 'restart', label: 'Restart', icon: RotateCw, tone: 'primary', destructive: true, desc: 'Reboot the operating system' },
  { key: 'sleep', label: 'Sleep', icon: Moon, tone: 'accent', destructive: false, desc: 'Put the device into sleep mode' },
  { key: 'lock', label: 'Lock', icon: Lock, tone: 'muted', destructive: false, desc: 'Lock session (data preserved)' },
] as const;

const AGENT_ACTIONS = [
  { key: 'restartAgent', label: 'Restart Agent', icon: RefreshCw },
  { key: 'stopAgent', label: 'Stop Agent', icon: Skull },
  { key: 'flushDns', label: 'Flush DNS', icon: Globe },
] as const;

const SUB_TABS = ['Power', 'Agent', 'Copy/Paste', 'Display', 'Audit'] as const;
type SubTabKey = (typeof SUB_TABS)[number];

const toneRing: Record<string, string> = {
  warning: 'hover:border-warning hover:bg-warning/10',
  primary: 'hover:border-primary hover:bg-primary/10',
  accent: 'hover:border-accent hover:bg-accent/10',
  muted: 'hover:border-foreground hover:bg-cardhover',
};
const toneText: Record<string, string> = {
  warning: 'text-warning',
  primary: 'text-primary',
  accent: 'text-accent',
  muted: 'text-muted-foreground',
};

type Schedule = { command: string; label: string; targetDate: Date; deviceName: string };

export function ControlTab({
  session,
  devices,
  target,
  onPick,
}: {
  session: Session | null;
  devices: DeviceInfo[];
  target: string;
  onPick?: () => void;
}) {
  const [subTab, setSubTab] = useState<SubTabKey>('Power');
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleAction, setScheduleAction] = useState<string>('shutdown');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [tasks, setTasks] = useState<any[]>([]);
  const [dontAskAgent, setDontAskAgent] = useState(false);
  const timerRef = useRef<number | null>(null);

  const selected = devices.find((d) => d.name === target);

  // Countdown for scheduled action
  const [countdown, setCountdown] = useState({ h: 0, m: 0, s: 0 });
  useEffect(() => {
    if (!schedule) { setCountdown({ h: 0, m: 0, s: 0 }); return; }
    const interval = setInterval(() => {
      const diff = schedule.targetDate.getTime() - Date.now();
      if (diff <= 0) { setCountdown({ h: 0, m: 0, s: 0 }); return; }
      const totalSecs = Math.floor(diff / 1000);
      setCountdown({ h: Math.floor(totalSecs / 3600), m: Math.floor((totalSecs % 3600) / 60), s: totalSecs % 60 });
    }, 1000);
    return () => clearInterval(interval);
  }, [schedule]);

  useEffect(() => {
    if (!schedule) { if (timerRef.current) clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      const diff = schedule.targetDate.getTime() - Date.now();
      if (diff <= 0) { execute(schedule.command, schedule.deviceName); setSchedule(null); }
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [schedule]);

  useEffect(() => {
    if (session) fetchScheduledTasks(session.deviceId).then(setTasks);
  }, [session]);

  async function execute(command: string, deviceName: string) {
    setBusy(command);
    setNote(null);
    const isPower = POWER_ACTIONS.some((a) => a.key === command) || command === 'cancelShutdown';
    try {
      await sendControl(session, deviceName, command);
      setNote(`${command} sent to ${deviceName}`);
      addAudit(isPower ? 'Power' : 'System', `${command} sent`, 'SUCCESS', deviceName);
    } catch (e) {
      setNote(`Failed: ${(e as Error).message}`);
      addAudit(isPower ? 'Power' : 'System', `${command} failed: ${(e as Error).message}`, 'ERROR', deviceName);
    }
    setBusy(null);
    setTimeout(() => setNote(null), 3000);
  }

  function run(command: string) {
    if (!target) return;
    const action = POWER_ACTIONS.find((a) => a.key === command);
    if (action?.destructive) { setConfirm(command); return; }
    void execute(command, target);
  }

  function handleSchedule() {
    if (!scheduleDate || !scheduleTime || !target) return;
    const dt = new Date(`${scheduleDate}T${scheduleTime}`);
    if (dt <= new Date()) dt.setDate(dt.getDate() + 1);
    setSchedule({ command: scheduleAction, label: scheduleAction, targetDate: dt, deviceName: target });
    if (session) addScheduledTask(session.deviceId, scheduleAction, dt.toISOString());
    setScheduleOpen(false);
    setScheduleDate('');
    setScheduleTime('');
  }

  const confirmAction = confirm ? POWER_ACTIONS.find((a) => a.key === confirm) : null;

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-border pb-px">
        {SUB_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`ios-btn shrink-0 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              subTab === t ? 'bg-primary text-primary-foreground' : 'border border-border bg-cardhover text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Toast */}
      {note && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-accent/10 border border-accent/20 backdrop-blur-xl animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-accent" />
          <span className="text-sm text-accent">{note}</span>
        </div>
      )}

      {/* POWER sub-tab */}
      {subTab === 'Power' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {POWER_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.key}
                  onClick={() => run(action.key)}
                  className={`ios-card-hover p-5 rounded-2xl bg-card border border-border flex flex-col items-center gap-3 ${toneRing[action.tone]}`}
                >
                  <Icon className={`w-7 h-7 ${toneText[action.tone]}`} strokeWidth={2} />
                  <span className="text-sm font-bold text-foreground">{action.label}</span>
                  <span className="text-[10px] text-muted-foreground text-center">{action.desc}</span>
                </button>
              );
            })}
          </div>

          {/* Active schedule */}
          <div className="rounded-2xl border border-border bg-card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Active Power Schedule</h3>
              {schedule ? (
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  <span className="capitalize text-foreground font-semibold">{schedule.label}</span> on <span className="text-primary">{schedule.deviceName}</span>
                  {' '}— countdown: <span className="text-primary font-bold">{countdown.h}h {countdown.m}m {countdown.s}s</span>
                </p>
              ) : (
                <p className="mt-1 font-mono text-xs text-muted-foreground">No pending scheduled power actions.</p>
              )}
            </div>
            {schedule && (
              <button onClick={() => setSchedule(null)} className="ios-btn px-4 py-2 rounded-xl bg-warning/15 border border-warning/30 text-xs font-semibold text-warning hover:bg-warning/25">Cancel</button>
            )}
          </div>

          {/* Schedule new */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-foreground flex items-center gap-2"><Clock className="w-4 h-4 text-accent" /> Scheduled Actions</h3>
              <button onClick={() => setScheduleOpen(!scheduleOpen)} className="text-xs text-primary hover:text-primary/80 font-medium">{scheduleOpen ? 'Cancel' : '+ New Schedule'}</button>
            </div>
            {scheduleOpen && (
              <div className="rounded-2xl border border-border bg-card p-4 mb-3 space-y-3 animate-fade-in">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Action</label>
                  <div className="grid grid-cols-4 gap-2">
                    {POWER_ACTIONS.map((a) => (
                      <button key={a.key} onClick={() => setScheduleAction(a.key)} className={`py-2 rounded-lg text-xs font-medium capitalize ios-btn ${scheduleAction === a.key ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-cardhover text-muted-foreground border border-transparent hover:border-border'}`}>{a.label}</button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs text-muted-foreground mb-1.5">Date</label><input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary [color-scheme:dark]" /></div>
                  <div><label className="block text-xs text-muted-foreground mb-1.5">Time</label><input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary [color-scheme:dark]" /></div>
                </div>
                <button onClick={handleSchedule} disabled={!scheduleDate || !scheduleTime} className="w-full py-2.5 rounded-lg bg-accent text-accent-foreground text-sm font-medium ios-btn disabled:opacity-40">Schedule & Apply to {target}</button>
              </div>
            )}
            <div className="space-y-1.5">
              {tasks.length === 0 ? <div className="text-center py-4 text-xs text-muted-foreground">No scheduled actions</div> : tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-card border border-border">
                  <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><Clock className="w-4 h-4 text-primary" /></div><div><div className="text-sm text-foreground capitalize">{task.action}</div><div className="text-[10px] text-muted-foreground">{new Date(task.scheduled_for).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div></div></div>
                  <button onClick={async () => { await cancelScheduledTask(task.id); if (session) fetchScheduledTasks(session.deviceId).then(setTasks); }} className="p-1.5 rounded-lg hover:bg-destructive/10 ios-btn"><X className="w-4 h-4 text-muted-foreground hover:text-destructive" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AGENT sub-tab */}
      {subTab === 'Agent' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-4 mb-5">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center"><Zap className="w-7 h-7 text-primary" strokeWidth={1.5} /></div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-card ${selected?.online ? 'bg-accent' : 'bg-muted-foreground'}`} />
              </div>
              <div className="flex-1"><h3 className="text-base font-bold text-foreground">PC Control Agent</h3><p className="text-xs text-muted-foreground">Version 2.4.1 · {selected?.online ? 'Running' : 'Stopped'}</p></div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[{ l: 'CPU', v: '12%', i: Monitor, c: 'text-primary' }, { l: 'Memory', v: '4.2 GB', i: Monitor, c: 'text-accent' }, { l: 'Disk', v: '234 GB', i: Monitor, c: 'text-accent' }, { l: 'Network', v: '1.2 MB/s', i: Globe, c: 'text-warning' }].map((s) => (
                <div key={s.l} className="px-3 py-3 rounded-xl bg-cardhover border border-border"><div className="flex items-center gap-2 mb-1"><s.i className={`w-4 h-4 ${s.c}`} /><span className="text-[11px] text-muted-foreground">{s.l}</span></div><div className="text-sm font-semibold text-foreground">{s.v}</div></div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground mb-3">Agent Action Controls</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {AGENT_ACTIONS.map((a) => {
                const Icon = a.icon;
                const isStop = a.key === 'stopAgent';
                return (
                  <button key={a.key} onClick={() => { if (isStop && dontAskAgent) { execute(a.key, target); } else { setConfirm(a.key); } }} disabled={!selected?.online}
                    className={`ios-card-hover p-4 rounded-2xl bg-card border border-border flex flex-col items-start gap-2 disabled:opacity-40 ${isStop ? 'hover:border-warning hover:bg-warning/10' : 'hover:border-primary hover:bg-primary/10'}`}>
                    <div className={`w-9 h-9 rounded-xl bg-cardhover flex items-center justify-center ${isStop ? 'text-warning' : 'text-primary'}`}><Icon className="w-5 h-5" strokeWidth={2} /></div>
                    <span className="text-sm font-bold text-foreground">{a.label}</span>
                    <span className="text-[10px] text-muted-foreground">{isStop ? 'Terminates agent & purges temp files' : a.key === 'flushDns' ? 'Flush DNS resolver cache' : 'Restarts agent daemon'}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {/* Confirmation modal for destructive agent actions */}
          {confirm && (confirm === 'stopAgent' || confirm === 'restartAgent') && (
            <DestructiveModal
              title={confirm === 'stopAgent' ? 'Confirm Agent Stop & Cleanup' : 'Confirm Agent Restart'}
              icon={confirm === 'stopAgent' ? Skull : RefreshCw}
              tone={confirm === 'stopAgent' ? 'warning' : 'primary'}
              warning={confirm === 'stopAgent' ? 'Terminates node.exe/wscript.exe, deletes FileLinkAgent.lnk startup shortcut, purges %APPDATA%\\FileLinkAgent directory.' : 'The agent will restart. Connection will be briefly interrupted.'}
              dontAsk={dontAskAgent}
              setDontAsk={setDontAskAgent}
              showDontAsk={confirm === 'stopAgent'}
              busy={busy === confirm}
              onCancel={() => setConfirm(null)}
              onConfirm={() => { execute(confirm, target); setConfirm(null); }}
            />
          )}
        </div>
      )}

      {/* COPY/PASTE sub-tab */}
      {subTab === 'Copy/Paste' && <ClipboardPanel session={session} target={target} />}

      {/* DISPLAY sub-tab */}
      {subTab === 'Display' && <DisplayHub session={session} target={target} onPick={onPick} />}

      {/* AUDIT sub-tab */}
      {subTab === 'Audit' && <AuditTrailPanel deviceId={session?.deviceId || ''} />}

      {/* Power confirmation modal */}
      {confirm && POWER_ACTIONS.some((a) => a.key === confirm) && confirmAction && (
        <DestructiveModal
          title={`Confirm ${confirmAction.label}`}
          icon={confirmAction.icon}
          tone={confirmAction.tone}
          warning={confirmAction.key === 'shutdown' ? 'The device will power off completely. You will need physical access to turn it back on.' : confirmAction.key === 'restart' ? 'The device will reboot. Connection will be temporarily lost.' : confirmAction.key === 'sleep' ? 'The device will enter sleep mode. It can be woken remotely if Wake-on-LAN is enabled.' : 'The session will be locked. All data and running programs stay preserved.'}
          busy={busy === confirm}
          onCancel={() => setConfirm(null)}
          onConfirm={() => { execute(confirm, target); setConfirm(null); }}
        />
      )}
    </div>
  );
}

function DestructiveModal({ title, icon: Icon, tone, warning, dontAsk, setDontAsk, showDontAsk, busy, onCancel, onConfirm }: {
  title: string; icon: typeof Power; tone: string; warning: string; dontAsk?: boolean; setDontAsk?: (v: boolean) => void; showDontAsk?: boolean; busy: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => !busy && onCancel()}>
      <div className="glass rounded-3xl p-6 max-w-md w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tone === 'warning' ? 'bg-warning/20 text-warning' : 'bg-primary/20 text-primary'}`}><Icon className="w-5 h-5" strokeWidth={2.5} /></div>
            <div><h3 className="text-base font-bold text-foreground">{title}</h3><p className="text-xs text-muted-foreground">Remote host command dispatch</p></div>
          </div>
          <button onClick={() => !busy && onCancel()} className="w-8 h-8 rounded-full bg-cardhover hover:bg-muted flex items-center justify-center ios-btn"><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className={`p-3.5 rounded-2xl border flex items-start gap-3 mb-5 ${tone === 'warning' ? 'bg-warning/10 border-warning/30' : 'bg-primary/10 border-primary/20'}`}>
          <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${tone === 'warning' ? 'text-warning' : 'text-primary'}`} />
          <p className={`text-xs leading-relaxed ${tone === 'warning' ? 'text-warning' : 'text-primary'}`}><strong>Warning:</strong> {warning}</p>
        </div>
        {showDontAsk && setDontAsk && (
          <label className="flex items-center gap-3 mb-6 cursor-pointer group">
            <div className="relative"><input type="checkbox" checked={dontAsk || false} onChange={(e) => setDontAsk(e.target.checked)} className="sr-only peer" />
              <div className="w-6 h-6 rounded-lg border-2 border-border bg-cardhover peer-checked:border-primary peer-checked:bg-primary/20 transition-all flex items-center justify-center">{dontAsk && <div className="w-4 h-4 rounded-md bg-gradient-to-br from-primary to-accent flex items-center justify-center animate-scale-in"><Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} /></div>}</div>
            </div>
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Don't ask me again for this session</span>
          </label>
        )}
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={busy} className="flex-1 py-3 rounded-xl bg-cardhover border border-border text-sm font-semibold text-foreground hover:bg-muted ios-btn disabled:opacity-50">Cancel</button>
          <button onClick={onConfirm} disabled={busy} className={`flex-1 py-3 rounded-xl text-sm font-semibold ios-btn disabled:opacity-50 flex items-center justify-center gap-2 ${tone === 'warning' ? 'bg-warning text-warning-foreground shadow-lg shadow-warning/30' : 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'}`}>
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <span>Confirm & Execute</span>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Clipboard Panel ----
function ClipboardPanel({ session, target }: { session: Session | null; target: string }) {
  const [history, setHistory] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => { fetchClipboardHistory().then(setHistory); }, []);

  async function sync() {
    if (!text.trim() || !session) return;
    setBusy(true);
    await addClipboardEntry(session.deviceId, text.trim());
    await remoteExecStart(session, target, `clip ${text.trim()}`);
    setText('');
    fetchClipboardHistory().then(setHistory);
    setNote('Clipboard synced');
    setTimeout(() => setNote(null), 2000);
    setBusy(false);
  }

  return (
    <div className="rounded-[20px] border border-border bg-card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center"><Clipboard className="w-5 h-5 text-primary" /></div>
        <div><h3 className="text-base font-bold text-foreground">Clipboard Sync</h3><p className="text-xs text-muted-foreground">Send text to {target}'s clipboard</p></div>
      </div>
      <div className="flex gap-2 mb-4">
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Type text to sync..." rows={3} className="flex-1 px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none" />
        <button onClick={sync} disabled={busy || !text.trim()} className="ios-btn self-end px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-40 flex items-center gap-1.5"><Send className="w-4 h-4" /> Sync</button>
      </div>
      {note && <div className="mb-3 text-xs text-accent">{note}</div>}
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {history.length === 0 ? <div className="text-center py-4 text-xs text-muted-foreground">No clipboard history</div> : history.map((e: any) => (
          <div key={e.id} className="group flex items-center gap-2 px-3 py-2 rounded-lg bg-cardhover border border-border hover:border-primary/20">
            <button onClick={async () => { await pinClipboardEntry(e.id, !e.pinned); fetchClipboardHistory().then(setHistory); }} className="shrink-0"><RefreshCw className={`w-3.5 h-3.5 ${e.pinned ? 'text-accent' : 'text-muted-foreground'}`} /></button>
            <span className="text-xs text-foreground truncate flex-1">{e.content}</span>
            <button onClick={async () => { await deleteClipboardEntry(e.id); fetchClipboardHistory().then(setHistory); }} className="shrink-0 opacity-0 group-hover:opacity-100"><Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Display Hub ----
function DisplayHub({ session, target, onPick }: { session: Session | null; target: string; onPick?: () => void }) {
  const [mode, setMode] = useState<'screenshot' | 'record' | 'camscreenshot' | 'camrecord'>('screenshot');
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const MODES = [
    { key: 'screenshot' as const, label: 'Screen Shot', folder: 'screenshoot document', icon: Camera },
    { key: 'record' as const, label: 'Screen Record', folder: 'record', icon: Video },
    { key: 'camscreenshot' as const, label: 'Camera Shot', folder: 'room image', icon: Camera },
    { key: 'camrecord' as const, label: 'Camera Record', folder: 'vedio', icon: Video },
  ];
  const cfg = MODES.find((m) => m.key === mode)!;

  async function capture() {
    if (!target) { setNote('Pick a target PC first.'); return; }
    setBusy(true); setNote(null);
    try {
      await remoteCall(session, target, 'screenshot');
      setImage(`data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="100%" height="100%" fill="#1a1a2e"/><text x="50%" y="50%" fill="#6366f1" font-size="20" text-anchor="middle" dy=".3em">Screenshot captured</text></svg>')}`);
      addAudit('Display', `${cfg.label}: captured frame`, 'SUCCESS', target);
    } catch (e) { setNote(`Failed: ${(e as Error).message}`); }
    setBusy(false);
  }

  function toggleRecord() {
    if (!target) { setNote('Pick a target PC first.'); return; }
    if (!live) { setLive(true); void capture(); timerRef.current = window.setInterval(() => void capture(), 2000); }
    else { setLive(false); if (timerRef.current) clearInterval(timerRef.current); }
  }

  return (
    <div className="rounded-[20px] border border-border bg-card p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center"><MonitorSmartphone className="w-5 h-5 text-primary" /></div><div><h3 className="text-base font-bold text-foreground">Display & Capture Hub</h3><p className="text-xs text-muted-foreground">Screen mirroring & webcam feeds for {target || 'target host'}</p></div></div>
        <button onClick={onPick} className="ios-btn flex items-center gap-2 rounded-xl border border-border bg-cardhover px-4 py-2 text-xs font-semibold text-foreground hover:text-primary"><Monitor className="w-4 h-4 text-primary" />{target || 'Select Target PC'}</button>
      </div>
      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
        {MODES.map((m) => (
          <button key={m.key} onClick={() => { setMode(m.key); setImage(null); if (live) toggleRecord(); }} className={`ios-btn shrink-0 rounded-xl px-4 py-2 text-xs font-semibold ${mode === m.key ? 'bg-primary text-primary-foreground' : 'border border-border bg-cardhover text-muted-foreground hover:text-foreground'}`}><m.icon className="mr-1.5 inline w-4 h-4" />{m.label}</button>
        ))}
      </div>
      <div className="relative flex min-h-[240px] items-center justify-center overflow-hidden rounded-2xl border border-border bg-black">
        {image ? <img src={image} alt="capture" className="max-h-[420px] w-full object-contain" /> : <div className="p-10 text-center text-xs text-muted-foreground"><div className="mx-auto mb-3 w-12 h-12 rounded-2xl border border-border flex items-center justify-center"><cfg.icon className="w-5 h-5 text-primary" /></div>{target ? `Ready to route into "${cfg.folder}"` : 'Select a device to begin.'}</div>}
        {live && <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-warning/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-warning"><span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" /> LIVE</span>}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button disabled={!target || busy} onClick={() => (mode === 'record' || mode === 'camrecord' ? toggleRecord() : void capture())} className="ios-btn flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"><cfg.icon className="w-4 h-4" />{mode === 'record' || mode === 'camrecord' ? (live ? 'Stop' : cfg.label) : busy ? 'Capturing...' : cfg.label}</button>
        <button disabled={!image} onClick={() => { if (image) { const a = document.createElement('a'); a.href = image; a.download = `capture-${Date.now()}.jpg`; a.click(); } }} className="ios-btn flex items-center gap-2 rounded-xl border border-border bg-cardhover px-4 py-2.5 text-xs font-semibold text-foreground hover:text-primary disabled:opacity-40"><Download className="w-4 h-4" /> Download</button>
        <button disabled={!image} onClick={() => setImage(null)} className="ios-btn flex items-center gap-2 rounded-xl border border-border bg-cardhover px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:text-destructive disabled:opacity-40"><Trash2 className="w-4 h-4" /> Clear</button>
      </div>
      {note && <p className="mt-4 font-mono text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

// ---- Audit Trail Panel ----
function AuditTrailPanel({ deviceId }: { deviceId: string }) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [dbLogs, setDbLogs] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>('All Events');
  const [query, setQuery] = useState('');

  const FILTERS = ['All Events', 'Clipboard', 'Command', 'Power', 'File/Link', 'Display', 'System'];

  useEffect(() => {
    setEvents(getAudit());
    return subscribeAudit(() => setEvents(getAudit()));
  }, []);

  useEffect(() => {
    if (deviceId) fetchAuditLogs(deviceId).then(setDbLogs);
  }, [deviceId]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => (filter === 'All Events' || e.category === filter) && (!q || e.details.toLowerCase().includes(q) || e.device.toLowerCase().includes(q)));
  }, [events, filter, query]);

  const statusTone: Record<string, string> = { SUCCESS: 'bg-accent/15 text-accent', INFO: 'bg-primary/15 text-primary', WARN: 'bg-warning/15 text-warning', ERROR: 'bg-destructive/15 text-destructive' };

  return (
    <div className="rounded-[20px] border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center"><ScrollText className="w-5 h-5 text-primary" /></div><div><h3 className="text-base font-bold text-foreground">System Activity & Audit Trail</h3><p className="text-xs text-muted-foreground">{events.length} local events · {dbLogs.length} database logs</p></div></div>
        <div className="flex gap-2">
          <button onClick={() => download('audit_trail.csv', 'text/csv', exportCsv(shown))} className="ios-btn flex items-center gap-1.5 rounded-lg border border-border bg-cardhover px-3 py-2 text-xs font-semibold text-foreground hover:text-primary"><Download className="w-3.5 h-3.5" /> Export</button>
          <button onClick={() => { clearAudit(); setEvents([]); }} className="ios-btn flex items-center gap-1.5 rounded-lg border border-border bg-cardhover px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /> Clear</button>
        </div>
      </div>
      <div className="mb-3 flex gap-2">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search events..." className="w-full pl-9 pr-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary" /></div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none">{FILTERS.map((f) => <option key={f}>{f}</option>)}</select>
      </div>
      <div className="space-y-1.5 max-h-96 overflow-y-auto">
        {shown.length === 0 && dbLogs.length === 0 ? <div className="text-center py-6 text-xs text-muted-foreground">No events recorded</div> : (
          <>
            {shown.map((e) => (
              <div key={e.id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-cardhover border border-border">
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${statusTone[e.status] || 'bg-muted text-muted-foreground'}`}>{e.status}</span>
                <div className="min-w-0 flex-1"><div className="text-xs text-foreground">{e.details}</div><div className="text-[10px] text-muted-foreground">{e.category} · {e.device} · {new Date(e.ts).toLocaleTimeString()}</div></div>
              </div>
            ))}
            {dbLogs.map((l: any) => (
              <div key={l.id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-cardhover border border-border">
                <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide bg-primary/15 text-primary">{l.status}</span>
                <div className="min-w-0 flex-1"><div className="text-xs text-foreground">{l.output_summary || l.command}</div><div className="text-[10px] text-muted-foreground">{l.command} · {new Date(l.created_at).toLocaleString()}</div></div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
