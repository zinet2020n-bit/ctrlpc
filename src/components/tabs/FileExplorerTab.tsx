import { useState } from 'react';
import { Search, Folder, FileText, ChevronRight, ChevronDown, HardDrive, Monitor } from 'lucide-react';
import { type DeviceInfo, type Session } from '@/lib/linkClient';
import { humanSize } from '@/lib/utils';

type FileNode = {
  name: string;
  type: 'folder' | 'file';
  size?: number;
  children?: FileNode[];
};

const SAMPLE_FILES: FileNode[] = [
  { name: 'Documents', type: 'folder', children: [
    { name: 'Reports', type: 'folder', children: [{ name: 'Q1-2026.pdf', type: 'file', size: 2456789 }, { name: 'Q2-2026.pdf', type: 'file', size: 3124567 }] },
    { name: 'resume.docx', type: 'file', size: 45678 },
    { name: 'notes.txt', type: 'file', size: 2345 },
  ]},
  { name: 'Downloads', type: 'folder', children: [
    { name: 'installer.exe', type: 'file', size: 56789012 },
    { name: 'photo.jpg', type: 'file', size: 2345678 },
  ]},
  { name: 'Projects', type: 'folder', children: [
    { name: 'pcctrn', type: 'folder', children: [{ name: 'index.ts', type: 'file', size: 4567 }, { name: 'README.md', type: 'file', size: 12345 }] },
    { name: 'config.json', type: 'file', size: 678 },
  ]},
  { name: 'screenshot.png', type: 'file', size: 1234567 },
];

export function FileExplorerTab({ session, devices }: { session: Session | null; devices: DeviceInfo[] }) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['Documents', 'Documents/Reports']));
  const [selectedDevice, setSelectedDevice] = useState<string>('');

  function toggle(path: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  }

  function renderTree(nodes: FileNode[], prefix: string): React.ReactNode {
    return nodes
      .filter((n) => !query || n.name.toLowerCase().includes(query.toLowerCase()))
      .map((node) => {
        const path = prefix ? `${prefix}/${node.name}` : node.name;
        const isOpen = expanded.has(path);
        return (
          <div key={path}>
            <div
              className={`group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-cardhover cursor-pointer transition-colors ${selectedDevice === path ? 'bg-primary/10' : ''}`}
              onClick={() => node.type === 'folder' && toggle(path)}
            >
              {node.type === 'folder' ? (
                <>
                  {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                  <Folder className="w-4 h-4 text-primary flex-shrink-0" />
                </>
              ) : (
                <>
                  <div className="w-4 flex-shrink-0" />
                  <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </>
              )}
              <span className="text-sm text-foreground flex-1 truncate">{node.name}</span>
              {node.type === 'file' && node.size !== undefined && (
                <span className="text-[10px] text-muted-foreground flex-shrink-0">{humanSize(node.size)}</span>
              )}
            </div>
            {node.type === 'folder' && isOpen && node.children && (
              <div className="ml-4 border-l border-border pl-1">
                {renderTree(node.children, path)}
              </div>
            )}
          </div>
        );
      });
  }

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Device picker */}
      <div className="flex items-center gap-2">
        <Monitor className="w-4 h-4 text-primary" />
        <select
          value={selectedDevice}
          onChange={(e) => setSelectedDevice(e.target.value)}
          className="px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground focus:outline-none focus:border-primary"
        >
          <option value="">Browse local room</option>
          {devices.map((d) => (
            <option key={d.id} value={d.name}>@{d.name} {d.online ? '(online)' : '(offline)'}</option>
          ))}
        </select>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search files and folders..."
          className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-mono"
        />
      </div>

      {/* File tree */}
      <div className="flex-1 min-h-[300px] overflow-y-auto rounded-2xl border border-border bg-card p-3">
        <div className="flex items-center gap-2 mb-2 px-2 py-1 text-xs font-semibold text-muted-foreground">
          <HardDrive className="w-4 h-4" />
          {selectedDevice ? `@${selectedDevice}` : 'Room / Shared'}
        </div>
        {renderTree(SAMPLE_FILES, '')}
      </div>
    </div>
  );
}
