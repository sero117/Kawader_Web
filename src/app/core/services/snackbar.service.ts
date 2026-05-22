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
    const id = ++this.counter;
    this.messages.update(msgs => [...msgs, { id, message, type }]);
    setTimeout(() => this.dismiss(id), duration);
  }

  dismiss(id: number): void {
    this.messages.update(msgs => msgs.filter(m => m.id !== id));
  }
}
