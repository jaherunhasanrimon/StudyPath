import { Suspense } from 'react';
import { PlaylistForm } from './playlist-form';

/**
 * /new route — Plan creation flow.
 * Phase 1 implements Step 1: Playlist Import & Preview.
 */
export default function NewPlanPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-[800px] px-4 py-8 animate-pulse" />}>
      <PlaylistForm />
    </Suspense>
  );
}
