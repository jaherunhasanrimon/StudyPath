/**
 * Web Push Delivery Module (architecture.md §11 & phases.md §1 Phase 5)
 * Dispatches web push notifications using VAPID keys.
 * Handles 410 Gone / 404 Not Found as subscription expiration.
 */
import webpush from 'web-push';
import {
  PushSubscriptionPayload,
  NotificationPayload,
  PushSendResult,
} from './types';

let vapidConfigured = false;

function configureVapid(): boolean {
  if (vapidConfigured) return true;

  const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:support@dishari.app';

  if (!publicKey || !privateKey) {
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

/**
 * Sends a Web Push notification to a student's browser.
 */
export async function sendPushNotification(
  subscription: PushSubscriptionPayload,
  payload: NotificationPayload
): Promise<PushSendResult> {
  const isConfigured = configureVapid();
  if (!isConfigured) {
    return {
      success: false,
      error: 'VAPID keys not configured in environment.',
    };
  }

  try {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    };

    const payloadString = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || '/today',
      tag: payload.tag || 'dishari-reminder',
      icon: payload.icon || '/favicon.ico',
    });

    const response = await webpush.sendNotification(pushSubscription, payloadString);

    return {
      success: true,
      statusCode: response.statusCode,
    };
  } catch (err: any) {
    const statusCode = err?.statusCode;
    // 404 Not Found or 410 Gone indicates the browser unsubscribed or subscription expired
    const expired = statusCode === 404 || statusCode === 410;

    return {
      success: false,
      statusCode,
      error: err?.message || 'Unknown Web Push error',
      expired,
    };
  }
}

/**
 * Utility for client-side registration: converts urlBase64 string to Uint8Array for PushManager.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  if (typeof window === 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
