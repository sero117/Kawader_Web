import { Component, inject } from '@angular/core';
import { SnackbarService, SnackbarType } from '../../services/snackbar.service';

@Component({
  selector: 'app-snackbar',
  standalone: true,
  template: `
    <div class="fixed top-5 end-5 z-[9999] flex flex-col gap-2 pointer-events-none" style="min-width:300px;max-width:380px;">
      @for (msg of snackbar.messages(); track msg.id) {
        <div class="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm pointer-events-auto snack-in"
          style="background: var(--bg-surface-2); border: 1px solid var(--border);
                 box-shadow: 0 8px 32px rgba(0,0,0,0.18); backdrop-filter: blur(12px);">

          <!-- Icon -->
          <div class="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            [style.background]="iconBg(msg.type)">
            @switch (msg.type) {
              @case ('success') {
                <svg class="w-4 h-4" style="color:#10b981;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                </svg>
              }
              @case ('error') {
                <svg class="w-4 h-4" style="color:rgba(239,68,68,0.9);" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
                </svg>
              }
              @default {
                <svg class="w-4 h-4" style="color:rgba(99,102,241,0.9);" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/>
                </svg>
              }
            }
          </div>

          <span class="flex-1 leading-snug font-medium" style="color: var(--text-base);">{{ msg.message }}</span>

          <button type="button" (click)="snackbar.dismiss(msg.id)"
            class="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-opacity opacity-40 hover:opacity-80"
            style="color: var(--text-base);">
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes snack-in {
      from { opacity: 0; transform: translateY(-12px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0)    scale(1);    }
    }
    .snack-in { animation: snack-in 0.22s cubic-bezier(0.16,1,0.3,1); }
  `],
})
export class SnackbarComponent {
  protected readonly snackbar = inject(SnackbarService);

  iconBg(type: SnackbarType): string {
    switch (type) {
      case 'success': return 'rgba(16,185,129,0.12)';
      case 'error':   return 'rgba(239,68,68,0.1)';
      default:        return 'rgba(99,102,241,0.1)';
    }
  }
}
