-- Migration 0002: YouTube tables
-- Phase 1 — playlists, videos, playlist_items
-- RLS: readable by authenticated users, written by the service role.

-----------------------------------------------------------
-- playlists
-----------------------------------------------------------
CREATE TABLE public.playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_playlist_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  channel_title TEXT NOT NULL,
  item_count INTEGER NOT NULL DEFAULT 0,
  total_duration_sec INTEGER NOT NULL DEFAULT 0,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '25 days'),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'private', 'deleted', 'unlisted', 'error'))
);

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read playlists"
  ON public.playlists FOR SELECT
  TO authenticated
  USING (TRUE);

-----------------------------------------------------------
-- videos
-----------------------------------------------------------
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_video_id TEXT NOT NULL UNIQUE,
  channel_id TEXT NOT NULL,
  channel_title TEXT NOT NULL,
  title TEXT NOT NULL,
  duration_sec INTEGER NOT NULL DEFAULT 0,
  embeddable BOOLEAN NOT NULL DEFAULT TRUE,
  privacy_status TEXT NOT NULL DEFAULT 'public',
  live_state TEXT NOT NULL DEFAULT 'none',
  thumbnail_url TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '25 days')
);

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read videos"
  ON public.videos FOR SELECT
  TO authenticated
  USING (TRUE);

-----------------------------------------------------------
-- playlist_items
-----------------------------------------------------------
CREATE TABLE public.playlist_items (
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  unavailable_reason TEXT,
  PRIMARY KEY (playlist_id, position)
);

ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read playlist_items"
  ON public.playlist_items FOR SELECT
  TO authenticated
  USING (TRUE);
