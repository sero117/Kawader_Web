import { Injectable, inject } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { SnackbarService, SnackbarType } from './snackbar.service';
import { NotificationPayload, NotificationStatus } from '../models/notification.models';

const TOAST_TYPE: Record<NotificationStatus, SnackbarType> = {
  Success: 'success',
  Failed:  'error',
  Message: 'info',
};

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly auth     = inject(AuthService);
  private readonly snackbar = inject(SnackbarService);

  readonly notifications$ = new Subject<NotificationPayload>();

  private connection: HubConnection | null = null;

  /** Idempotent — safe to call from every "just logged in" site without checking state first. */
  connect(): void {
    if (this.connection) return;
    const token = this.auth.getAccessToken();
    if (!token) return;

    this.connection = new HubConnectionBuilder()
      .withUrl(`${environment.signalRHubUrl}?access_token=${encodeURIComponent(token)}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        withCredentials: false,
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    this.connection.on('ReceiveNotification', (payload: NotificationPayload) => {
      this.notifications$.next(payload);
      this.snackbar.show(payload.title, TOAST_TYPE[payload.type] ?? 'info');
    });

    this.connection.start().catch(() => {
      // withAutomaticReconnect handles drops after a successful start; a failed
      // initial start just means no live notifications until the next connect() call.
    });
  }

  disconnect(): void {
    const conn = this.connection;
    this.connection = null;
    if (conn && conn.state !== HubConnectionState.Disconnected) {
      conn.stop().catch(() => {});
    }
  }
}
