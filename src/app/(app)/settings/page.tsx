'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { PushToggle } from '@/components/settings/PushToggle';
import { QuietHoursPicker } from '@/components/settings/QuietHoursPicker';
import { StreakToggle } from '@/components/settings/StreakToggle';

export default function SettingsPage() {
  const t = useTranslations();

  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [leadMinutes, setLeadMinutes] = useState(30);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('07:00');
  const [streakEnabled, setStreakEnabled] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  useEffect(() => {
    async function loadPreferences() {
      try {
        const res = await fetch('/api/notifications/preferences');
        if (res.ok) {
          const json = await res.json();
          setPushEnabled(json.pushEnabled ?? true);
          setEmailEnabled(json.emailEnabled ?? true);
          setLeadMinutes(json.leadMinutes ?? 30);
          setQuietHoursStart(json.quietHoursStart ?? '22:00');
          setQuietHoursEnd(json.quietHoursEnd ?? '07:00');
          setStreakEnabled(json.streakEnabled ?? false);
        }
      } catch (err) {
        console.error('Failed to load preferences', err);
      } finally {
        setLoading(false);
      }
    }
    loadPreferences();
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pushEnabled,
          emailEnabled,
          leadMinutes,
          quietHoursStart,
          quietHoursEnd,
          streakEnabled,
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save preferences', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleSendTest() {
    setTestSending(true);
    setTestStatus(null);
    try {
      const res = await fetch('/api/notifications/test', { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.success) {
        setTestStatus(`${t('settings.testSent')} (${json.channel})`);
      } else {
        setTestStatus(json.details?.pushError || 'টেস্ট পাঠানো সম্ভব হয়নি');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'টেস্ট পাঠানো সম্ভব হয়নি';
      setTestStatus(msg);
    } finally {
      setTestSending(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8 space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-40 animate-pulse rounded-xl bg-card border border-border" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('settings.title')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('settings.notifications')}</p>
      </div>

      <div className="space-y-4">
        {/* Push Notification Toggle */}
        <PushToggle
          enabled={pushEnabled}
          onChange={setPushEnabled}
          labels={{
            title: t('settings.pushNotifications'),
            description: t('settings.pushDesc'),
          }}
        />

        {/* Email Notification Toggle */}
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xs">
          <div>
            <h4 className="text-base font-semibold">{t('settings.emailNotifications')}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">{t('settings.emailDesc')}</p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={emailEnabled}
            onClick={() => setEmailEnabled(!emailEnabled)}
            className={`relative inline-flex h-6 w-11 min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary ${
              emailEnabled ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform ${
                emailEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Reminder Lead Time */}
        <div className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xs">
          <h4 className="text-base font-semibold">{t('settings.leadTime')}</h4>
          <div className="mt-3 flex flex-wrap gap-2">
            {[15, 30, 60].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setLeadMinutes(m)}
                className={`min-h-[44px] px-4 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                  leadMinutes === m
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-foreground hover:bg-muted'
                }`}
              >
                {t('settings.minutesBefore', { m })}
              </button>
            ))}
          </div>
        </div>

        {/* Quiet Hours */}
        <QuietHoursPicker
          start={quietHoursStart}
          end={quietHoursEnd}
          onStartChange={setQuietHoursStart}
          onEndChange={setQuietHoursEnd}
          labels={{
            title: t('settings.quietHours'),
            description: t('settings.quietHoursDesc'),
            from: t('settings.from'),
            to: t('settings.to'),
          }}
        />

        {/* Optional Streak Counter Toggle */}
        <StreakToggle
          enabled={streakEnabled}
          onChange={setStreakEnabled}
          labels={{
            title: t('settings.streakToggle'),
            description: t('settings.streakToggleDesc'),
          }}
        />

        {/* Test Notification Button */}
        <div className="rounded-xl border border-dashed border-border p-5 text-center">
          <button
            type="button"
            disabled={testSending}
            onClick={handleSendTest}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            {testSending ? 'পাঠানো হচ্ছে...' : t('settings.sendTest')}
          </button>
          {testStatus && (
            <p className="mt-2 text-xs text-primary font-medium">{testStatus}</p>
          )}
        </div>

        {/* Save Preferences Button */}
        <div className="pt-2 flex items-center justify-end gap-3">
          {saveSuccess && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              ✓ {t('settings.saved')}
            </span>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'সংরক্ষণ হচ্ছে...' : t('settings.saveChanges')}
          </button>
        </div>
      </div>
    </main>
  );
}
