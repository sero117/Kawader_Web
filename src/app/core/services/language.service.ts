import { Injectable, signal } from '@angular/core';

export type AppLanguage = 'ar' | 'en';

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
}
