export type FontSize = 'small' | 'medium' | 'large';
export type ThemeMode = 'dark' | 'light';

export interface UserPreferences {
  fontSize: FontSize;
  theme: ThemeMode;
  soundEnabled: boolean;
  drafts: Record<string, string>;
  trickNewChat: boolean;
}

const PREFERENCES_KEY = 'ren_preferences';

const DEFAULT_PREFERENCES: UserPreferences = {
  fontSize: 'medium',
  theme: 'dark',
  soundEnabled: false,
  drafts: {},
  trickNewChat: true,
};

export const fontSizes = {
  small: '14px',
  medium: '16px',
  large: '18px',
};

export class PreferencesManager {
  static getPreferences(): UserPreferences {
    if (typeof window === 'undefined') return { ...DEFAULT_PREFERENCES };
    try {
      const prefsJson = sessionStorage.getItem(PREFERENCES_KEY);
      if (!prefsJson) return { ...DEFAULT_PREFERENCES };
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(prefsJson) };
    } catch {
      return { ...DEFAULT_PREFERENCES };
    }
  }

  static updatePreferences(updates: Partial<UserPreferences>): void {
    if (typeof window === 'undefined') return;
    const current = this.getPreferences();
    const updated = { ...current, ...updates };
    try {
      sessionStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
    } catch { /* sessionStorage might be full */ }
  }

  static setTheme(theme: ThemeMode): void {
    this.updatePreferences({ theme });
    this.applyTheme(theme);
  }

  static applyTheme(theme: ThemeMode): void {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0a0a0c' : '#f8fafc');
  }

  static setFontSize(size: FontSize): void {
    this.updatePreferences({ fontSize: size });
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--base-font-size', fontSizes[size]);
    }
  }

  static setSoundEnabled(enabled: boolean): void {
    this.updatePreferences({ soundEnabled: enabled });
  }

  static setTrickNewChat(enabled: boolean): void {
    this.updatePreferences({ trickNewChat: enabled });
  }

  static saveDraft(sessionId: string, text: string): void {
    const prefs = this.getPreferences();
    prefs.drafts[sessionId] = text;
    this.updatePreferences({ drafts: prefs.drafts });
  }

  static getDraft(sessionId: string): string {
    const prefs = this.getPreferences();
    return prefs.drafts[sessionId] || '';
  }

  static clearDraft(sessionId: string): void {
    const prefs = this.getPreferences();
    delete prefs.drafts[sessionId];
    this.updatePreferences({ drafts: prefs.drafts });
  }

  static clearAll(): void {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.removeItem(PREFERENCES_KEY);
      sessionStorage.removeItem('ren_guest');
    } catch {}
  }

  static playNotificationSound(): void {
    const prefs = this.getPreferences();
    if (!prefs.soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch {}
  }
}
