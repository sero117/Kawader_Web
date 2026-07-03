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
  { id: 'indigo',   label: 'الليلي',   light: '#4F46E5', dark: '#818CF8', swatch: '#4F46E5' },
  { id: 'navy',     label: 'البحري',   light: '#1D4ED8', dark: '#60A5FA', swatch: '#1D4ED8' },
  { id: 'burgundy', label: 'الخمري',   light: '#9F1239', dark: '#FB7185', swatch: '#9F1239' },
  { id: 'brown',    label: 'البني',    light: '#92400E', dark: '#F59E0B', swatch: '#92400E' },
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
}
