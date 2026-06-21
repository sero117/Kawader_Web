import { Component, signal, computed, Input, Output, EventEmitter } from '@angular/core';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

export interface WelcomeAction {
  path: string;
  labelKey: string;
  iconD: string;
}

@Component({
  selector: 'app-welcome-overlay',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './welcome-overlay.component.html',
})
export class WelcomeOverlayComponent {
  @Input() userName = '';
  @Input() userId: number | null = null;
  @Input() lastVisitText: string | null = null;
  @Input() actions: WelcomeAction[] = [];
  @Output() dismissed = new EventEmitter<void>();
  @Output() navigate  = new EventEmitter<string>();

  closing = signal(false);

  readonly isMorning = (() => {
    const h = new Date().getHours();
    return h >= 5 && h < 12;
  })();

  greetingKey = computed(() =>
    this.isMorning ? 'manager.welcomeScreen.morning' : 'manager.welcomeScreen.evening'
  );

  readonly sparkles = [
    { top: '8%',  left: '88%', size: '18px', duration: '3.2s', delay: '0s'   },
    { top: '14%', left: '6%',  size: '12px', duration: '2.7s', delay: '0.6s' },
    { top: '76%', left: '90%', size: '14px', duration: '3.6s', delay: '1.4s' },
    { top: '82%', left: '8%',  size: '10px', duration: '3.0s', delay: '0.9s' },
    { top: '45%', left: '4%',  size: '8px',  duration: '4.1s', delay: '1.8s' },
    { top: '38%', left: '94%', size: '9px',  duration: '2.5s', delay: '0.3s' },
  ];

  readonly blobs = [
    { top: '-6%',  left: '30%',  width: '500px', height: '200px', rot: '38deg',  delay: '0s',   duration: '10s' },
    { top: '70%',  left: '-8%',  width: '320px', height: '220px', rot: '-14deg', delay: '1.2s', duration: '11s' },
    { top: '58%',  left: '62%',  width: '380px', height: '150px', rot: '20deg',  delay: '0.6s', duration: '9s'  },
  ];

  close(): void {
    if (this.closing()) return;
    this.closing.set(true);
    setTimeout(() => this.dismissed.emit(), 280);
  }

  go(path: string): void {
    if (this.closing()) return;
    this.closing.set(true);
    setTimeout(() => this.navigate.emit(path), 280);
  }
}
