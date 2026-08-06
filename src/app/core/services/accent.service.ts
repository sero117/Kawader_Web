import { Injectable, signal } from '@angular/core';

export interface AccentColor {
  id: string;
  label: string;
  light: string;
  dark: string;
  swatch: string;
}

const STORAGE_KEY = 'kawader_accent';

export const ACCENT_COLORS: AccentColor[] = [
  // 'indigo' used to live here, but it and 'navy' below read as almost the
  // same blue in the picker's dots — swapped for a calmer, clearly distinct
  // olive-green instead of two near-duplicate blues.
  { id: 'olive',    label: 'الزيتوني',  light: '#5F6E48', dark: '#8DA36A', swatch: '#5F6E48' },
  { id: 'navy',     label: 'البحري',   light: '#1D4ED8', dark: '#60A5FA', swatch: '#1D4ED8' },
  { id: 'burgundy', label: 'الخمري',   light: '#9F1239', dark: '#C1394E', swatch: '#9F1239' },
  { id: 'brown',    label: 'البني',    light: '#92400E', dark: '#C6873F', swatch: '#92400E' },
  { id: 'slate',    label: 'الرصاصي',  light: '#374151', dark: '#9CA3AF', swatch: '#374151' },
];

@Injectable({ providedIn: 'root' })
export class AccentService {
  readonly current = signal<AccentColor>(ACCENT_COLORS[0]);
  readonly colors = ACCENT_COLORS;

  init(): void {
    const saved = localStorage.getItem(STORAGE_KEY);
    this._apply(ACCENT_COLORS.find(c => c.id === saved) ?? ACCENT_COLORS[0]);
  }

  set(color: AccentColor): void {
    localStorage.setItem(STORAGE_KEY, color.id);
    this._apply(color);
  }

  private _apply(color: AccentColor): void {
    this.current.set(color);
    const root = document.documentElement;
    root.style.setProperty('--accent-light', color.light);
    root.style.setProperty('--accent-dark', color.dark);
  }

  /** Clears any inline accent override so the element falls back to the
   *  brand-default color from styles.css. `set()`/`init()` write inline
   *  styles onto <html> (a global, unscoped element), which otherwise
   *  survive client-side navigation into public pages that never call
   *  `init()` — a signed-in user's personal dashboard accent would keep
   *  showing on the public landing/plans/auth pages instead of the fixed
   *  brand color. Call this from those pages' constructors. */
  resetToBrandDefault(): void {
    const root = document.documentElement;
    root.style.removeProperty('--accent-light');
    root.style.removeProperty('--accent-dark');
  }
}
