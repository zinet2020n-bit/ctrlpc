import { useState } from 'react';
import { Download, Copy, Check, Terminal } from 'lucide-react';

const AGENT_SCRIPT = `@echo off
powershell -Command "irm https://your-project.supabase.co/functions/v1/agent | iex"`;

export function BackgroundAgentDownload({ deviceName }: { deviceName: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard?.writeText(AGENT_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-[20px] border border-border bg-card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center">
          <Download className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-bold text-foreground">Install Background Agent</h3>
          <p className="text-xs text-muted-foreground">Run this script on {deviceName} to connect it</p>
        </div>
      </div>
      <div className="relative rounded-xl bg-black border border-border p-4 font-mono text-xs text-foreground overflow-x-auto">
        <button onClick={copy} className="absolute right-3 top-3 ios-btn p-2 rounded-lg bg-cardhover border border-border hover:border-primary">
          {copied ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
        </button>
        <pre className="pr-10 whitespace-pre-wrap break-all">{AGENT_SCRIPT}</pre>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Terminal className="w-3 h-3" />
        Run as Administrator on the target PC. The agent will start automatically on boot.
      </p>
    </div>
  );
}
