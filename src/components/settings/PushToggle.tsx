'use client';

import React, { useState } from 'react';
import { urlBase64ToUint8Array } from '@/modules/notifications/client-utils';

interface PushToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  labels: {
    title: string;
    description: string;
  };
}

export function PushToggle({ enabled, onChange, labels }: PushToggleProps) {
  const [loading, setLoading] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  async function handleToggle() {
    setPermissionError(null);
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPermissionError('আপনার ব্রাউজার পুশ নোটিফিকেশন সমর্থন করে না।');
      return;
    }

    setLoading(true);
    try {
      if (!enabled) {
        // Request browser permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setPermissionError('নোটিফিকেশন পারমিশন দেওয়া হয়নি।');
          setLoading(false);
          return;
        }

        // Register service worker
        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!publicKey) {
          throw new Error('VAPID public key not found');
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as ArrayBuffer,
        });

        // Save to backend
        const res = await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription.toJSON()),
        });

        if (!res.ok) {
          throw new Error('Failed to register subscription on server');
        }

        onChange(true);
      } else {
        // Unsubscribe
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            await fetch('/api/notifications/unsubscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ endpoint: subscription.endpoint }),
            });
            await subscription.unsubscribe();
          }
        }
        onChange(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'পুশ নোটিফিকেশন সেটআপে সমস্যা হয়েছে';
      setPermissionError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xs">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h4 className="text-base font-semibold">{labels.title}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">{labels.description}</p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={loading}
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary ${
            enabled ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {permissionError && (
        <p className="text-xs text-destructive mt-1">{permissionError}</p>
      )}
    </div>
  );
}
