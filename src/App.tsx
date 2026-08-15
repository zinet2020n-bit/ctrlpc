import { useState, useEffect, useCallback } from 'react';
import { loadSession, saveSession, fetchDevices, type DeviceInfo, type Session } from '@/lib/linkClient';
import { SplashScreen } from '@/components/SplashScreen';
import { ControlCenter } from '@/components/ControlCenter';

export default function App() {
  const [phase, setPhase] = useState<'splash' | 'main'>('splash');
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [session, setSession] = useState<Session | null>(null);

  const refreshDevices = useCallback(async () => {
    const list = await fetchDevices();
    setDevices(list);
    if (list.length > 0 && !session) {
      const s = { deviceId: list[0].id, deviceName: list[0].name };
      setSession(s);
      saveSession(s);
    }
  }, [session]);

  useEffect(() => {
    const existing = loadSession();
    if (existing) setSession(existing);

    const timer = setTimeout(async () => {
      await refreshDevices();
      setPhase('main');
    }, 2200);
    return () => clearTimeout(timer);
  }, [refreshDevices]);

  useEffect(() => {
    if (phase === 'main') {
      refreshDevices();
      const interval = setInterval(refreshDevices, 10000);
      return () => clearInterval(interval);
    }
  }, [phase, refreshDevices]);

  if (phase === 'splash') {
    return <SplashScreen />;
  }

  return (
    <ControlCenter
      devices={devices}
      session={session}
      onRefreshDevices={refreshDevices}
      onSessionChange={(s) => {
        setSession(s);
        saveSession(s);
      }}
    />
  );
}
