/**
 * Type definitions for YouTube integration module.
 */

export type ParseError =
  | 'EMPTY_INPUT'
  | 'INVALID_URL'
  | 'INVALID_ID'
  | 'UNSUPPORTED_HOST'
  | 'MIX_NOT_SUPPORTED';

export type ParseResult =
  | { success: true; playlistId: string }
  | { success: false; error: ParseError; messageKey: string };

export type WarningKind =
  | 'unavailable'      // Deleted or private video
  | 'live'             // Live stream, premiere, or 0s duration
  | 'not_embeddable'   // embeddable === false
  | 'duplicate'        // Duplicate video in playlist
  | 'very_short'       // Duration < 5 minutes
  | 'over_cap';        // Exceeds max playlist limit

export interface VideoWarning {
  kind: WarningKind;
  videoId: string;
  messageKey: string;
  count?: number;
}

export interface PlaylistItemPreview {
  videoId: string;
  position: number;
  title: string;
  channelId: string;
  channelTitle: string;
  durationSec: number;
  durationFormatted: string;
  thumbnailUrl: string;
  embeddable: boolean;
  privacyStatus: string;
  isUnavailable: boolean;
  unavailableReason?: string;
  isLive: boolean;
  warnings: VideoWarning[];
}

export interface PlaylistPreview {
  playlistId: string;
  title: string;
  channelId: string;
  channelTitle: string;
  itemCount: number;
  totalDurationSec: number;
  totalDurationFormatted: string;
  items: PlaylistItemPreview[];
  warnings: VideoWarning[];
  order: {
    isSequential: boolean;
    status: 'sequential' | 'out_of_order' | 'no_numbering';
    messageKey: string;
  };
  cached: boolean;
  quotaUnitsUsed: number;
}
