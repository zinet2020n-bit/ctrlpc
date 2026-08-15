import { useState, useEffect, useCallback } from 'react';
import {
  Monitor,
  Power,
  Bot,
  Copy,
  TerminalSquare,
  FolderSync,
  MonitorSmartphone,
  Search,
  ChevronDown,
  RefreshCw,
  ChevronRight,
  ArrowLeft,
  Plus,
  X,
  HardDrive,
  Inbox,
  Send,
  Settings,
  Menu,
  Activity,
  Server,
  Cpu,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  fetchDevices,
  addDevice,
  removeDevice,
  roomUsage,
  fetchSentFiles,
  type DeviceInfo,
  type FileRow,
  type Session,
} from '@/lib/linkClient';
import { humanSize } from '@/lib/utils';
import { ControlTab } from '@/components/tabs/ControlTab';
import { TerminalTab } from '@/components/tabs/TerminalTab';
import { FileExplorerTab } from '@/components/tabs/FileExplorerTab';
import { TasksTab } from '@/components/tabs/TasksTab';
import { PcInfoTab } from '@/components/tabs/PcInfoTab';

type MainTab = 'control' | 'terminal' | 'files' | 'tasks' | 'info';

const MAIN_TABS: { id: MainTab; label: string; icon: typeof Power; desc: string }[] = [
  { id: 'control', label: 'Control', icon: Power, desc: 'Power, agent, clipboard, display & audit' },
  { id: 'terminal', label: 'Terminal', icon: TerminalSquare, desc: 'Run commands on remote PCs' },
  { id: 'files', label: 'Files', icon: FolderSync, desc: 'Browse and transfer files between PCs' },
  { id: 'tasks', label: 'Tasks', icon: Activity, desc: 'Manage running processes remotely' },
  { id: 'info', label: 'PC Info', icon: Server, desc: 'System information for each device' },
];

export function ControlCenter({
  devices,
  session,
  onRefreshDevices,
  onSessionChange,
}: {
  devices: DeviceInfo[];
  session: Session | null;
  onRefreshDevices: () => void;
  onSessionChange: (s: Session) => void;
}) {
  const [activeTab, setActiveTab] = useState<MainTab | null>(null);
  const [deviceMenuOpen, setDeviceMenuOpen] = useState(false);
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [modalSearch, setModalSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceOS, setNewDeviceOS] = useState('Windows 11 Pro');
  const [sent, setSent] = useState<FileRow[]>([]);
  const [usage, setUsage] = useState<{ used: number; quota: number; files: number } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const selectedDevice = devices.find((d) => d.id === session?.deviceId) || null;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await onRefreshDevices();
    setTimeout(() => setRefreshing(false), 600);
  }, [onRefreshDevices]);

  useEffect(() => {
    if (session) {
      fetchSentFiles(session.deviceId).then(setSent);
      roomUsage(session).then(setUsage).catch(() => setUsage(null));
    }
  }, [session, devices.length]);

  useEffect(() => {
    if (!isMobile && activeTab === null) setActiveTab('control');
  }, [isMobile, activeTab]);

  const filteredDevices = devices.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );
  const modalFilteredDevices = devices.filter((d) =>
    d.name.toLowerCase().includes(modalSearch.toLowerCase())
  );

  const handleAddDevice = async () => {
    if (!newDeviceName.trim()) return;
    const d = await addDevice(newDeviceName.trim(), newDeviceOS);
    if (d) {
      onRefreshDevices();
      onSessionChange({ deviceId: d.id, deviceName: d.name });
    }
    setNewDeviceName('');
    setDeviceModalOpen(false);
  };

  const handleDeleteDevice = async (id: string) => {
    if (devices.length <= 1) return;
    await removeDevice(id);
    const remaining = devices.filter((d) => d.id !== id);
    if (remaining.length > 0) onSessionChange({ deviceId: remaining[0].id, deviceName: remaining[0].name });
    onRefreshDevices();
  };

  const selectDevice = (d: DeviceInfo) => {
    onSessionChange({ deviceId: d.id, deviceName: d.name });
    setDeviceMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {isMobile && activeTab !== null ? (
              <button
                onClick={() => setActiveTab(null)}
                className="ios-btn flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-border bg-cardhover text-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-xs font-medium">Back</span>
              </button>
            ) : (
              <>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                  <Monitor className="w-5 h-5 text-primary-foreground" strokeWidth={1.5} />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-sm font-bold text-foreground leading-tight">FileLink</h1>
                  <p className="text-[10px] text-muted-foreground">Remote PC management</p>
                </div>
              </>
            )}
          </div>

          {isMobile && activeTab !== null && (
            <div className="flex-1 text-center">
              <h2 className="text-sm font-bold text-foreground">{MAIN_TABS.find((t) => t.id === activeTab)?.label}</h2>
            </div>
          )}

          {/* Device Selector */}
          <div className="relative flex-1 max-w-xs ml-auto">
            <button
              onClick={() => setDeviceMenuOpen(!deviceMenuOpen)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-border bg-cardhover ios-btn"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${selectedDevice?.online ? 'bg-accent shadow-[0_0_6px_var(--accent)]' : 'bg-muted-foreground'}`} />
                <span className="text-sm text-foreground truncate">{selectedDevice?.name || 'Select device'}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${deviceMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {deviceMenuOpen && (
              <div className="absolute top-full right-0 left-0 mt-2 glass rounded-xl shadow-terminal overflow-hidden animate-fade-in z-50 min-w-[260px]">
                <div className="p-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search devices..."
                      autoFocus
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredDevices.map((device) => (
                    <button
                      key={device.id}
                      onClick={() => selectDevice(device)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 hover:bg-cardhover transition-colors text-left ${selectedDevice?.id === device.id ? 'bg-primary/10' : ''}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${device.online ? 'bg-accent' : 'bg-muted-foreground'}`} />
                        <div className="min-w-0">
                          <div className="text-sm text-foreground truncate">{device.name}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{device.osInfo}</div>
                        </div>
                      </div>
                      {selectedDevice?.id === device.id && <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
                    </button>
                  ))}
                  {filteredDevices.length === 0 && <div className="px-3 py-4 text-center text-xs text-muted-foreground">No devices found</div>}
                </div>
                <div className="p-2 border-t border-border">
                  <button
                    onClick={() => { setDeviceMenuOpen(false); setDeviceModalOpen(true); }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary/15 border border-primary/30 hover:bg-primary/25 text-primary text-xs font-semibold ios-btn"
                  >
                    <Plus className="w-3.5 h-3.5" /> Device Registry
                  </button>
                </div>
              </div>
            )}
          </div>

          {!isMobile && (
            <button onClick={handleRefresh} className="p-2 rounded-lg hover:bg-cardhover ios-btn" title="Refresh">
              <RefreshCw className={`w-4 h-4 text-muted-foreground ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {/* Desktop sidebar tabs */}
        {!isMobile && (
          <div className="max-w-7xl mx-auto px-2 sm:px-6 pb-0">
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {MAIN_TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium transition-all whitespace-nowrap ios-btn ${
                      active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{tab.label}</span>
                    {active && <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Main layout: content + side panel */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-4 flex gap-6">
        {/* Main content */}
        <main className="flex-1 min-w-0">
          {selectedDevice ? (
            isMobile && activeTab === null ? (
              <div className="flex flex-col gap-2 animate-fade-in">
                <div className="mb-2">
                  <h2 className="text-lg font-bold text-foreground">Control Center</h2>
                  <p className="text-xs text-primary font-mono uppercase tracking-widest">Remote Host Management</p>
                </div>
                {MAIN_TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className="ios-card-hover group flex items-center justify-between px-5 py-4 rounded-2xl bg-card border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cardhover flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-all">
                          <Icon className="w-5 h-5" strokeWidth={1.5} />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-semibold text-foreground">{tab.label}</div>
                          <div className="text-[11px] text-muted-foreground">{tab.desc}</div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div key={activeTab} className="animate-fade-in">
                {activeTab === 'control' && <ControlTab session={session} devices={devices} target={selectedDevice.name} onPick={() => {}} />}
                {activeTab === 'terminal' && <TerminalTab session={session} devices={devices} target={selectedDevice.name} />}
                {activeTab === 'files' && <FileExplorerTab session={session} devices={devices} />}
                {activeTab === 'tasks' && <TasksTab session={session} devices={devices} target={selectedDevice.name} />}
                {activeTab === 'info' && <PcInfoTab session={session} devices={devices} />}
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Monitor className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Select a device to begin</p>
            </div>
          )}
        </main>

        {/* Side panel - desktop only */}
        {!isMobile && selectedDevice && (
          <aside className="w-72 flex-shrink-0 space-y-4">
            {/* Storage usage */}
            {usage && (
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <HardDrive className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-semibold text-foreground">Storage</h3>
                </div>
                <div className="h-2 rounded-full bg-cardhover overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                    style={{ width: `${Math.min(100, (usage.used / usage.quota) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{humanSize(usage.used)} used</span>
                  <span>{humanSize(usage.quota)} total</span>
                </div>
              </div>
            )}

            {/* Devices list */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-foreground">Devices ({devices.length})</h3>
                <button onClick={() => setDeviceModalOpen(true)} className="p-1 rounded hover:bg-cardhover ios-btn">
                  <Plus className="w-3.5 h-3.5 text-primary" />
                </button>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {devices.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => selectDevice(d)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors text-left ${
                      selectedDevice?.id === d.id ? 'bg-primary/10' : 'hover:bg-cardhover'
                    }`}
                  >
                    {d.online ? <Wifi className="w-3.5 h-3.5 text-accent flex-shrink-0" /> : <WifiOff className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                    <div className="min-w-0">
                      <div className="text-xs text-foreground truncate">{d.name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{d.osInfo}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent transfers */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Send className="w-4 h-4 text-accent" />
                <h3 className="text-xs font-semibold text-foreground">Recent Transfers</h3>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {sent.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground text-center py-4">No transfers yet</p>
                ) : (
                  sent.slice(0, 8).map((f) => (
                    <div key={f.id} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-cardhover">
                      <div className="min-w-0">
                        <div className="text-xs text-foreground truncate">{f.file_name}</div>
                        <div className="text-[10px] text-muted-foreground">{humanSize(f.size_bytes)}</div>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wide ${
                        f.status === 'received' ? 'bg-primary/15 text-primary' : f.status === 'pending' ? 'bg-warning/15 text-warning' : 'bg-accent/15 text-accent'
                      }`}>{f.status}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Device Registry Modal */}
      {deviceModalOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setDeviceModalOpen(false)}>
          <div className="glass rounded-3xl p-6 max-w-xl w-full animate-scale-in max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Device Registry Center</h3>
                  <p className="text-xs text-muted-foreground">Search, manage & register new connected nodes</p>
                </div>
              </div>
              <button onClick={() => setDeviceModalOpen(false)} className="w-8 h-8 rounded-full bg-cardhover hover:bg-muted flex items-center justify-center ios-btn">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="flex gap-2.5 mb-4">
              <input
                type="text"
                value={newDeviceName}
                onChange={(e) => setNewDeviceName(e.target.value)}
                placeholder="Enter new device name..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
              <select
                value={newDeviceOS}
                onChange={(e) => setNewDeviceOS(e.target.value)}
                className="px-3 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none"
              >
                <option>Windows 11 Pro</option>
                <option>Windows 10</option>
                <option>Ubuntu 24.04</option>
                <option>Ubuntu 22.04</option>
                <option>macOS Sonoma</option>
              </select>
              <button
                onClick={handleAddDevice}
                disabled={!newDeviceName.trim()}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold ios-btn disabled:opacity-40 flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                placeholder="Search devices by name..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar mb-4">
              {modalFilteredDevices.map((device) => (
                <div
                  key={device.id}
                  className={`group flex items-center justify-between px-4 py-3 rounded-xl border transition-all cursor-pointer ${
                    selectedDevice?.id === device.id ? 'bg-primary/15 border-primary/30' : 'bg-cardhover border-border hover:border-primary/20'
                  }`}
                  onClick={() => { selectDevice(device); setDeviceModalOpen(false); }}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${device.online ? 'bg-accent' : 'bg-muted-foreground'}`} />
                    <div>
                      <div className="text-sm font-medium text-foreground">{device.name}</div>
                      <div className="text-[10px] text-muted-foreground">{device.osInfo}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedDevice?.id === device.id && <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-lg font-bold">Selected</span>}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteDevice(device.id); }}
                      className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {modalFilteredDevices.length === 0 && <div className="text-center py-6 text-xs text-muted-foreground">No matching devices found</div>}
            </div>

            <div className="flex justify-between items-center border-t border-border pt-3">
              <span className="text-xs text-muted-foreground">Total Devices: {devices.length}</span>
              <button onClick={() => setDeviceModalOpen(false)} className="px-6 py-2 rounded-xl bg-cardhover border border-border text-xs font-semibold text-foreground ios-btn">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
