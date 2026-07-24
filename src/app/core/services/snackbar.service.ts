import { Injectable, signal } from '@angular/core';

export type SnackbarType = 'error' | 'success' | 'info';

export interface SnackbarMessage {
  id: number;
  message: string;
  type: SnackbarType;
}

@Injectable({ providedIn: 'root' })
export class SnackbarService {
  readonly messages = signal<SnackbarMessage[]>([]);
  private counter = 0;

  show(message: string, type: SnackbarType = 'error', duration = 4000): void {
    // Avoid stacking an identical toast twice (e.g. a request that fires more
    // than once in quick succession) — just let the existing one run its course.
    if (this.messages().some(m => m.message === message && m.type === type)) return;
    const id = ++this.counter;
    this.messages.update(msgs => [...msgs, { id, message, type }]);
    setTimeout(() => this.dismiss(id), duration);
  }

  dismiss(id: number): void {
    this.messages.update(msgs => msgs.filter(m => m.id !== id));
  }
}
