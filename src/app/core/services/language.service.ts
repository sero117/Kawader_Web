import { Injectable, signal } from '@angular/core';
import ar from '../i18n/ar.json';
import en from '../i18n/en.json';

export type AppLanguage = 'ar' | 'en';
export type TranslationDict = typeof en;

const translations: Record<AppLanguage, TranslationDict> = { ar, en };

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly STORAGE_KEY = 'kawader_language';

  readonly current = signal<AppLanguage>(this.loadLanguage());

  private loadLanguage(): AppLanguage {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored === 'en' ? 'en' : 'ar';
  }

  getLanguage(): AppLanguage {
    return this.current();
  }

  setLanguage(lang: AppLanguage): void {
    localStorage.setItem(this.STORAGE_KEY, lang);
    this.current.set(lang);
  }

  /** Translate a dot-separated key, e.g. t('errors.unexpected') */
  t(key: string): string {
    const dict = translations[this.current()] as Record<string, unknown>;
    const parts = key.split('.');
    let node: unknown = dict;
    for (const part of parts) {
      if (typeof node !== 'object' || node === null) return key;
      node = (node as Record<string, unknown>)[part];
    }
    return typeof node === 'string' ? node : key;
  }
}
