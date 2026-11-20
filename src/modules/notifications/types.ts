/**
 * Notification Types (architecture.md §11 & phases.md §1 Phase 5)
 */

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: PushSubscriptionKeys;
}

export interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
}

export interface PushSendResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  expired?: boolean;
}

export interface NotificationPreferences {
  userId: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
  leadMinutes: number; // e.g. 15, 30, 60
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string; // "07:00"
  streakEnabled: boolean;
  unsubscribeToken: string;
}

export interface ReminderRecord {
  id: string;
  userId: string;
  planItemId: string;
  channel: 'push' | 'email';
  sendAt: string; // ISO
  status: 'pending' | 'sent' | 'cancelled' | 'skipped_quiet_hours' | 'failed';
  error?: string | null;
  sentAt?: string | null;
}
