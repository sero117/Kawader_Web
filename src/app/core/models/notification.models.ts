export type NotificationStatus = 'Success' | 'Failed' | 'Message';

export type NotificationDirect = 'Payroll';

export interface NotificationPayload {
  title: string;
  body: string;
  type: NotificationStatus;
  direct: NotificationDirect;
  data: string;
}

export interface PayrollNotificationData {
  PayrollRunId: number;
}

export function parsePayrollNotificationData(data: string): PayrollNotificationData | null {
  try {
    const parsed = JSON.parse(data);
    if (parsed && typeof parsed.PayrollRunId === 'number') return parsed;
    return null;
  } catch {
    return null;
  }
}
