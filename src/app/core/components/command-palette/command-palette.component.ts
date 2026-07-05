import {
  Component, inject, signal, computed, output,
  AfterViewInit, ViewChild, ElementRef, effect,
} from '@angular/core';
import { Router } from '@angular/router';

interface Command {
  labelAr: string;
  labelEn: string;
  keywords: string[];
  route: string;
  iconPath: string;
}

const COMMANDS: Command[] = [
  {
    labelAr: 'الرئيسية', labelEn: 'Overview',
    keywords: ['home', 'dashboard', 'رئيسية', 'overview'],
    route: '/dashboard/manager',
    iconPath: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z',
  },
  {
    labelAr: 'الفروع', labelEn: 'Branches',
    keywords: ['branches', 'فروع', 'فرع', 'branch'],
    route: '/dashboard/manager/branches',
    iconPath: 'M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21',
  },
  {
    labelAr: 'الورديات', labelEn: 'Shifts',
    keywords: ['shifts', 'ورديات', 'وردية', 'shift'],
    route: '/dashboard/manager/shifts',
    iconPath: 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  },
  {
    labelAr: 'أنظمة الدوام', labelEn: 'Shift Systems',
    keywords: ['shift systems', 'أنظمة', 'دوام', 'نظام دوام'],
    route: '/dashboard/manager/shift-systems',
    iconPath: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  },
  {
    labelAr: 'سجلات الحضور', labelEn: 'Attendance Logs',
    keywords: ['attendance', 'حضور', 'سجلات', 'shift logs', 'غياب'],
    route: '/dashboard/manager/shift-logs',
    iconPath: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z',
  },
  {
    labelAr: 'سجلات البصمة', labelEn: 'ADMS Logs',
    keywords: ['adms', 'بصمة', 'fingerprint', 'logs', 'سجلات بصمة'],
    route: '/dashboard/manager/adms-logs',
    iconPath: 'M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a7.464 7.464 0 01-1.15 3.993m1.989 3.559A11.209 11.209 0 008.25 10.5a3.75 3.75 0 117.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 01-3.6 9.75m6.633-4.596a18.666 18.666 0 01-2.485 5.33',
  },
  {
    labelAr: 'العطل الرسمية', labelEn: 'Holidays',
    keywords: ['holidays', 'عطل', 'عطلة', 'إجازة', 'اجازة'],
    route: '/dashboard/manager/company-holidays',
    iconPath: 'M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z',
  },
  {
    labelAr: 'الرواتب', labelEn: 'Payroll',
    keywords: ['payroll', 'رواتب', 'راتب', 'salary', 'مرتبات'],
    route: '/dashboard/manager/payroll',
    iconPath: 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z',
  },
  {
    labelAr: 'إدارة الأجهزة', labelEn: 'Devices',
    keywords: ['devices', 'أجهزة', 'جهاز', 'device', 'بصمة'],
    route: '/dashboard/manager/devices',
    iconPath: 'M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z',
  },
];

@Component({
  selector: 'app-command-palette',
  standalone: true,
  template: `
    <div class="cp-backdrop" (click)="closed.emit()"></div>

    <div class="cp-panel" role="dialog" aria-modal="true">

      <div class="cp-input-row">
        <svg class="cp-search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
        </svg>
        <input
          #inp
          class="cp-input"
          type="text"
          placeholder="ابحث عن صفحة... أو اكتب بالإنجليزي"
          [value]="query()"
          (input)="onInput($event)"
          (keydown)="onKey($event)"
          autocomplete="off"
          spellcheck="false"
        />
        <kbd class="cp-esc-badge" (click)="closed.emit()">ESC</kbd>
      </div>

      <div class="cp-divider"></div>

      <div class="cp-list">
        @if (filtered().length === 0) {
          <div class="cp-empty">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" style="width:32px;height:32px;opacity:.3">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
            </svg>
            <span>لا توجد نتائج لـ "{{ query() }}"</span>
          </div>
        }
        @for (cmd of filtered(); track cmd.route; let i = $index) {
          <button
            class="cp-item"
            [class.cp-item-active]="activeIdx() === i"
            (click)="navigate(cmd)"
            (mousemove)="activeIdx.set(i)"
          >
            <span class="cp-item-icon">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7">
                <path stroke-linecap="round" stroke-linejoin="round" [attr.d]="cmd.iconPath"/>
              </svg>
            </span>
            <span class="cp-item-labels">
              <span class="cp-item-ar">{{ cmd.labelAr }}</span>
              <span class="cp-item-en">{{ cmd.labelEn }}</span>
            </span>
            @if (activeIdx() === i) {
              <kbd class="cp-enter-badge">↵</kbd>
            }
          </button>
        }
      </div>

      <div class="cp-footer">
        <span class="cp-hint"><kbd>↑↓</kbd> للتنقل</span>
        <span class="cp-hint"><kbd>↵</kbd> للانتقال</span>
        <span class="cp-hint"><kbd>ESC</kbd> للإغلاق</span>
        <span class="cp-hint cp-hint-right"><kbd>Ctrl K</kbd> في أي وقت</span>
      </div>

    </div>
  `,
  styles: [`
    .cp-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(3px);
      z-index: 200;
    }
    .cp-panel {
      position: fixed;
      top: 18%;
      left: 50%;
      transform: translateX(-50%);
      width: min(580px, 94vw);
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: 18px;
      box-shadow: 0 32px 80px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.04);
      z-index: 201;
      overflow: hidden;
      animation: cp-in 0.17s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }
    @keyframes cp-in {
      from { opacity: 0; transform: translateX(-50%) scale(0.94) translateY(-12px); }
      to   { opacity: 1; transform: translateX(-50%) scale(1)    translateY(0); }
    }
    .cp-input-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 16px;
    }
    .cp-search-icon {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      color: var(--text-faint);
    }
    .cp-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      font-size: 1rem;
      color: var(--text-base);
      font-family: inherit;
      direction: rtl;
    }
    .cp-input::placeholder { color: var(--text-very-faint); }
    .cp-esc-badge {
      font-size: 0.6rem;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 5px;
      background: var(--bg-subtle-md);
      color: var(--text-faint);
      border: 1px solid var(--border);
      cursor: pointer;
      font-family: inherit;
      flex-shrink: 0;
    }
    .cp-divider { height: 1px; background: var(--border); }
    .cp-list {
      max-height: 320px;
      overflow-y: auto;
      padding: 6px;
      scrollbar-width: thin;
    }
    .cp-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 36px 16px;
      color: var(--text-faint);
      font-size: 0.875rem;
    }
    .cp-item {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: none;
      background: transparent;
      cursor: pointer;
      text-align: start;
      transition: background 0.1s;
    }
    .cp-item-active {
      background: var(--bg-subtle-sm);
    }
    .cp-item-icon {
      width: 34px;
      height: 34px;
      border-radius: 9px;
      background: var(--bg-subtle-md);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: var(--nav-accent);
      transition: background 0.1s;
    }
    .cp-item-active .cp-item-icon {
      background: color-mix(in srgb, var(--nav-accent) 12%, var(--bg-surface));
    }
    .cp-item-icon svg { width: 16px; height: 16px; }
    .cp-item-labels {
      display: flex;
      flex-direction: column;
      gap: 1px;
      flex: 1;
      min-width: 0;
    }
    .cp-item-ar {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-base);
      white-space: nowrap;
    }
    .cp-item-en {
      font-size: 0.7rem;
      color: var(--text-faint);
      white-space: nowrap;
    }
    .cp-enter-badge {
      font-size: 0.65rem;
      padding: 2px 6px;
      border-radius: 5px;
      background: var(--nav-accent);
      color: #fff;
      border: none;
      font-family: inherit;
      flex-shrink: 0;
      opacity: 0.85;
    }
    .cp-footer {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 8px 16px;
      border-top: 1px solid var(--border);
      background: var(--bg-subtle-sm);
    }
    .cp-hint {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.65rem;
      color: var(--text-faint);
    }
    .cp-hint-right { margin-inline-start: auto; }
    .cp-hint kbd {
      font-size: 0.6rem;
      padding: 1px 5px;
      border-radius: 4px;
      background: var(--bg-subtle-md);
      border: 1px solid var(--border);
      color: var(--text-muted);
      font-family: inherit;
    }
  `],
})
export class CommandPaletteComponent implements AfterViewInit {
  @ViewChild('inp') inp!: ElementRef<HTMLInputElement>;

  private readonly router = inject(Router);

  readonly closed = output<void>();

  query     = signal('');
  activeIdx = signal(0);

  filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter(c =>
      c.labelAr.includes(q) ||
      c.labelEn.toLowerCase().includes(q) ||
      c.keywords.some(k => k.includes(q))
    );
  });

  constructor() {
    effect(() => {
      this.filtered(); // rerun when filtered changes
      this.activeIdx.set(0);
    });
  }

  ngAfterViewInit(): void {
    this.inp.nativeElement.focus();
  }

  onInput(e: Event): void {
    this.query.set((e.target as HTMLInputElement).value);
  }

  onKey(e: KeyboardEvent): void {
    const len = this.filtered().length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.activeIdx.update(i => (i + 1) % len);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.activeIdx.update(i => (i - 1 + len) % len);
    } else if (e.key === 'Enter') {
      const cmd = this.filtered()[this.activeIdx()];
      if (cmd) this.navigate(cmd);
    } else if (e.key === 'Escape') {
      this.closed.emit();
    }
  }

  navigate(cmd: Command): void {
    this.router.navigate([cmd.route]);
    this.closed.emit();
  }
}
