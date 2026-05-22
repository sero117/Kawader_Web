import { Injectable, signal } from '@angular/core';

export type Theme = 'system' | 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'kawader_theme';
  private readonly mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  readonly current = signal<Theme>(this.loadTheme());

  constructor() {
    this.apply(this.current());
    this.mediaQuery.addEventListener('change', () => {
      if (this.current() === 'system') this.apply('system');
    });
  }

  set(theme: Theme): void {
    localStorage.setItem(this.STORAGE_KEY, theme);
    this.current.set(theme);
    this.apply(theme);
  }

  private loadTheme(): Theme {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  }

  private apply(theme: Theme): void {
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && this.mediaQuery.matches);
    document.documentElement.classList.toggle('dark', isDark);
  }
}
