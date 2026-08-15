import { Monitor, Shield } from 'lucide-react';

export function SplashScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--primary)_8%,transparent),transparent_60%)]" />
      <div className="relative flex flex-col items-center gap-6 animate-fade-in">
        <div className="relative">
          <div className="absolute inset-0 blur-2xl bg-primary/20 rounded-3xl animate-pulse" />
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-2xl animate-scale-up">
            <Monitor className="w-10 h-10 text-primary-foreground" strokeWidth={1.5} />
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">FileLink</h1>
          <p className="text-sm text-muted-foreground mt-1">Send files PC to PC from the command prompt</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="w-3.5 h-3.5" />
          <span>Secured by end-to-end encryption</span>
        </div>
        <div className="w-32 h-1 rounded-full bg-card overflow-hidden">
          <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-primary to-accent animate-pulse" />
        </div>
      </div>
    </div>
  );
}
