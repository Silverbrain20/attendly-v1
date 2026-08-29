/// <reference types="vite/client" />

export const isPWA = (): boolean => {
  if (typeof window === 'undefined') return false;

  // iOS Safari check
  const isIOSStandalone = (window.navigator as any).standalone === true;

  // Android / Chrome / General standalone display-mode check
  const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;

  return isIOSStandalone || isStandaloneMedia;
};

export const getDeviceId = (): string => {
  let id = localStorage.getItem('attendly_device_id');
  if (!id) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      id = crypto.randomUUID();
    } else {
      id = 'dev-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
    localStorage.setItem('attendly_device_id', id);
  }
  return id;
};
