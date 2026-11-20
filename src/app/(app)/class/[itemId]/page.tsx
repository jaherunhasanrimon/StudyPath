'use client';

import { useState, useEffect, use } from 'react';
import { PlanItemRow, WatchProgressRow } from '@/modules/plans/types';
import { ClassClient } from '@/components/class/ClassClient';

interface ClassPageProps {
  params: Promise<{ itemId: string }>;
}

export default function ClassPage({ params }: ClassPageProps) {
  const { itemId } = use(params);
  const [data, setData] = useState<{
    item: PlanItemRow;
    planId: string;
    progress: WatchProgressRow | null;
    note: string | null;
    nextItemId: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/class/${itemId}`)
      .then((res) => res.json())
      .then((d) => {
        if (d.item) {
          setData(d);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [itemId]);

  if (loading || !data) {
    return (
      <main id="main-content" className="max-w-[850px] mx-auto px-4 py-8 space-y-6">
        <div className="h-6 w-32 bg-mist/40 rounded-sheet animate-pulse" />
        <div className="aspect-video w-full bg-mist/20 rounded-sheet animate-pulse" />
      </main>
    );
  }

  return (
    <ClassClient
      item={data.item}
      planId={data.planId}
      initialProgress={data.progress}
      initialNote={data.note}
      nextItemId={data.nextItemId}
    />
  );
}
