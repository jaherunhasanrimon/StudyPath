'use client';

import { useState, useEffect } from 'react';
import { TodayResponse } from '@/modules/plans/types';
import { TodayClient } from '@/components/today/TodayClient';

export default function TodayPage() {
  const [data, setData] = useState<TodayResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/today')
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading || !data) {
    return (
      <main id="main-content" className="max-w-[720px] mx-auto px-4 py-8 space-y-6">
        <div className="h-10 w-48 bg-mist/40 rounded-sheet animate-pulse" />
        <div className="h-40 bg-mist/20 rounded-sheet animate-pulse" />
      </main>
    );
  }

  return <TodayClient initialData={data} />;
}
