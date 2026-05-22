import { Component, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { SnackbarService } from '../../services/snackbar.service';

@Component({
  selector: 'app-snackbar',
  standalone: true,
  imports: [NgClass],
  template: `
    <div class="fixed bottom-5 end-5 z-[9999] flex flex-col gap-2">
      @for (msg of snackbar.messages(); track msg.id) {
        <div
          class="flex items-start gap-3 min-w-72 max-w-sm rounded-lg px-4 py-3 shadow-lg text-white text-sm animate-fade-in"
          [ngClass]="{
            'bg-red-600':   msg.type === 'error',
            'bg-green-600': msg.type === 'success',
            'bg-gray-600':  msg.type === 'info'
          }"
        >
          <span class="flex-1 leading-snug">{{ msg.message }}</span>
          <button
            type="button"
            class="opacity-70 hover:opacity-100 transition-opacity text-lg leading-none mt-px"
            (click)="snackbar.dismiss(msg.id)"
          >&#x2715;</button>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in { animation: fade-in 0.2s ease-out; }
  `],
})
export class SnackbarComponent {
  protected readonly snackbar = inject(SnackbarService);
}
