import { Component, inject } from '@angular/core';
import { ThemeService, Theme } from '../../services/theme.service';

@Component({
  selector: 'app-theme-switcher',
  standalone: true,
  template: `
    <div class="theme-track">
      <button class="theme-btn" [class.active]="themeService.current() === 'system'" (click)="themeService.set('system')" title="System">
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
        </svg>
      </button>
      <button class="theme-btn" [class.active]="themeService.current() === 'light'" (click)="themeService.set('light')" title="Light">
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
        </svg>
      </button>
      <button class="theme-btn" [class.active]="themeService.current() === 'dark'" (click)="themeService.set('dark')" title="Dark">
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
        </svg>
      </button>
    </div>

    <button class="theme-compact" (click)="cycle()" [title]="themeService.current()">
      @if (themeService.current() === 'light') {
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
        </svg>
      } @else if (themeService.current() === 'dark') {
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
        </svg>
      } @else {
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
        </svg>
      }
    </button>
  `,
  styles: [`
    .theme-track {
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 3px;
      border-radius: 10px;
      background: var(--bg-subtle-md);
      border: 1px solid var(--border);
    }
    .theme-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 7px;
      border: none;
      cursor: pointer;
      background: transparent;
      color: var(--text-faint);
      transition: color 0.15s, background 0.15s;
    }
    .theme-btn:hover:not(.active) { color: var(--text-muted); }
    .theme-btn.active {
      background: var(--nav-active-bg);
      color: var(--nav-active-text);
    }
    .theme-compact {
      display: none;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 9px;
      border: 1px solid var(--border);
      cursor: pointer;
      background: var(--bg-subtle-md);
      color: var(--nav-active-text);
      transition: background 0.15s;
    }
    .theme-compact:hover { background: var(--bg-subtle-sm); }
    :host-context(.sidebar-collapsed) .theme-track { display: none; }
    :host-context(.sidebar-collapsed) .theme-compact { display: flex; }
  `],
})
export class ThemeSwitcherComponent {
  protected readonly themeService = inject(ThemeService);
  cycle() {
    const themes: Theme[] = ['system', 'light', 'dark'];
    const idx = themes.indexOf(this.themeService.current());
    this.themeService.set(themes[(idx + 1) % 3]);
  }
}
