const PASSCODE = 'hube1848@';
const KEY = 'filelink.unlocked';

export function isUnlocked() {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(KEY) === '1';
}

export function tryUnlock(input: string) {
  if (input !== PASSCODE) return false;
  sessionStorage.setItem(KEY, '1');
  return true;
}

export function relock() {
  sessionStorage.removeItem(KEY);
}
