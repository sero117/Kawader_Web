import { Component, inject } from '@angular/core';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  template: `
    <div class="lang-track">
      <button class="lang-btn" [class.active]="lang.current() === 'ar'" (click)="lang.setLanguage('ar')" title="العربية">AR</button>
      <button class="lang-btn" [class.active]="lang.current() === 'en'" (click)="lang.setLanguage('en')" title="English">EN</button>
    </div>
    <button class="lang-compact" (click)="toggle()" [title]="lang.current() === 'ar' ? 'English' : 'العربية'">
      {{ lang.current() === 'ar' ? 'AR' : 'EN' }}
    </button>
  `,
  styles: [`
    .lang-track {
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 3px;
      border-radius: 10px;
      background: var(--bg-subtle-md);
      border: 1px solid var(--border);
    }
    .lang-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 28px;
      border-radius: 7px;
      border: none;
      cursor: pointer;
      background: transparent;
      color: var(--text-faint);
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      transition: color 0.15s, background 0.15s, box-shadow 0.15s;
    }
    .lang-btn:hover:not(.active) { color: var(--text-muted); }
    .lang-btn.active {
      background: var(--nav-active-bg);
      color: var(--nav-active-text);
    }
    .lang-compact {
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
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      transition: background 0.15s;
    }
    .lang-compact:hover { background: var(--bg-subtle-sm); }
    :host-context(.sidebar-collapsed) .lang-track { display: none; }
    :host-context(.sidebar-collapsed) .lang-compact { display: flex; }
  `],
})
export class LanguageSwitcherComponent {
  protected readonly lang = inject(LanguageService);
  toggle() {
    this.lang.setLanguage(this.lang.current() === 'ar' ? 'en' : 'ar');
  }
}
