import { Component, inject, signal } from '@angular/core';
import { AccentService, AccentColor } from '../../services/accent.service';

@Component({
  selector: 'app-accent-picker',
  standalone: true,
  host: { style: 'position:relative;flex-shrink:0;' },
  template: `
    @if (open()) {
      <div class="ap-bd" (click)="open.set(false)"></div>
    }

    <button class="notif-bell-btn" (click)="toggle()" title="لون النظام">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z"/>
      </svg>
      <span class="ap-cur" [style.background]="accent.current().swatch"></span>
    </button>

    @if (open()) {
      <div class="ap-popup">
        @for (c of accent.colors; track c.id) {
          <button
            class="ap-dot"
            [class.ap-active]="accent.current().id === c.id"
            [style.background]="c.swatch"
            [title]="c.label"
            (click)="pick(c)"
          ></button>
        }
      </div>
    }
  `,
  styles: [`
    .ap-bd {
      position: fixed;
      inset: 0;
      z-index: 58;
    }
    .ap-cur {
      position: absolute;
      bottom: 6px;
      inset-inline-end: 6px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      border: 1.5px solid rgba(255,255,255,0.7);
      pointer-events: none;
    }
    .ap-popup {
      position: absolute;
      top: calc(100% + 8px);
      inset-inline-end: 0;
      display: flex;
      gap: 8px;
      align-items: center;
      padding: 10px 12px;
      border-radius: 14px;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      box-shadow: 0 8px 28px var(--card-shadow);
      z-index: 59;
      white-space: nowrap;
    }
    .ap-dot {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2.5px solid transparent;
      cursor: pointer;
      flex-shrink: 0;
      transition: transform 0.13s ease, box-shadow 0.13s ease;
    }
    .ap-dot:hover { transform: scale(1.22); }
    .ap-active {
      border-color: var(--text-muted);
      box-shadow: 0 0 0 2px var(--bg-surface), 0 0 0 4px var(--text-faint);
    }
  `],
})
export class AccentPickerComponent {
  protected readonly accent = inject(AccentService);
  readonly open = signal(false);

  toggle(): void { this.open.update(v => !v); }

  pick(c: AccentColor): void {
    this.accent.set(c);
    this.open.set(false);
  }
}
