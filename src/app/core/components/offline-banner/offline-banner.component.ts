import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-offline-banner',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    @if (!isOnline()) {
      <div class="offline-banner">
        <svg class="offline-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M3 3l18 18M8.111 8.111A5.5 5.5 0 0 0 6.5 12H5a7 7 0 0 0 2.222 5.127M10.5 5.024A7 7 0 0 1 19 12h-1.5a5.5 5.5 0 0 0-6.97-5.295M12 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"/>
        </svg>
        <div class="offline-text">
          <span class="offline-title">{{ 'common.offlineTitle' | translate }}</span>
          <span class="offline-hint">{{ 'common.offlineHint' | translate }}</span>
        </div>
      </div>
    }
    @if (justReconnected()) {
      <div class="online-banner">
        <svg class="online-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
        </svg>
        <span class="online-title">{{ 'common.backOnline' | translate }}</span>
      </div>
    }
  `,
})
export class OfflineBannerComponent implements OnInit, OnDestroy {
  isOnline        = signal(navigator.onLine);
  justReconnected = signal(false);

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly handleOnline = (): void => {
    this.isOnline.set(true);
    this.justReconnected.set(true);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.justReconnected.set(false), 3000);
  };

  private readonly handleOffline = (): void => {
    this.isOnline.set(false);
    this.justReconnected.set(false);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
  };

  ngOnInit(): void {
    window.addEventListener('online',  this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  ngOnDestroy(): void {
    window.removeEventListener('online',  this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
  }
}
