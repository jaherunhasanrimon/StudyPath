/**
 * Web Push Delivery Module (architecture.md §11 & phases.md §1 Phase 5)
 * Dispatches web push notifications using VAPID keys.
 * Handles 410 Gone / 404 Not Found as subscription expiration.
 */
import { setVapidDetails, sendNotification } from 'web-push';
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

  setVapidDetails(subject, publicKey, privateKey);
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

    const response = await sendNotification(pushSubscription, payloadString);

    return {
      success: true,
      statusCode: response.statusCode,
    };
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    // 404 Not Found or 410 Gone indicates the browser unsubscribed or subscription expired
    const expired = statusCode === 404 || statusCode === 410;
    const errorMsg = err instanceof Error ? err.message : 'Unknown Web Push error';

    return {
      success: false,
      statusCode,
      error: errorMsg,
      expired,
    };
  }
}

import { urlBase64ToUint8Array } from './client-utils';
export { urlBase64ToUint8Array };
