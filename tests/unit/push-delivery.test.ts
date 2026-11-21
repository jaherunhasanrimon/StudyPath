import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendNotification } from 'web-push';
import {
  sendPushNotification,
  urlBase64ToUint8Array,
} from '@/modules/notifications/push';
import { PushSubscriptionPayload, NotificationPayload } from '@/modules/notifications/types';

vi.mock('web-push', () => {
  return {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  };
});

describe('Web Push Delivery (architecture.md §11)', () => {
  const mockSubscription: PushSubscriptionPayload = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/fake-endpoint',
    keys: {
      p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9Q0sv4q',
      auth: 'tBHItJI5svbpez7KI4CCXg',
    },
  };

  const mockPayload: NotificationPayload = {
    title: 'গণিত ক্লাস শুরু',
    body: 'আজকের নির্ধারিত ক্লাসটি সম্পন্ন করুন।',
    url: '/class/item-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VAPID_PUBLIC_KEY = 'mock-public-key';
    process.env.VAPID_PRIVATE_KEY = 'mock-private-key';
    process.env.VAPID_SUBJECT = 'mailto:support@dishari.app';
  });

  it('successfully delivers web push notification', async () => {
    vi.mocked(sendNotification).mockResolvedValueOnce({
      statusCode: 201,
      body: '',
      headers: {},
    });

    const result = await sendPushNotification(mockSubscription, mockPayload);
    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(201);
    expect(sendNotification).toHaveBeenCalledTimes(1);
  });

  it('detects 410 Gone / 404 as expired subscription', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const error: any = new Error('Subscription expired');
    error.statusCode = 410;
    vi.mocked(sendNotification).mockRejectedValueOnce(error);

    const result = await sendPushNotification(mockSubscription, mockPayload);
    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(410);
    expect(result.expired).toBe(true);
  });

  it('converts urlBase64 VAPID key to Uint8Array', () => {
    const rawKey = 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9Q0sv4q';
    const uint8 = urlBase64ToUint8Array(rawKey);
    expect(uint8).toBeInstanceOf(Uint8Array);
    expect(uint8.length).toBeGreaterThan(0);
  });
});
