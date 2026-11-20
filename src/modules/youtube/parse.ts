/**
 * Pure function: YouTube playlist URL and ID parser.
 * Source of truth: docs/architecture.md §6.1.
 *
 * Hostname allow-list: youtube.com, www.youtube.com, m.youtube.com, youtu.be.
 * Bare ID regex: ^[A-Za-z0-9_-]{10,64}$
 * Rejects: IDs starting with RD (mixes), empty, unsupported hosts, non-http(s) schemes.
 */
import { ParseResult } from './types';

const ALLOWED_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
]);

const PLAYLIST_ID_REGEX = /^[A-Za-z0-9_-]{10,64}$/;

/**
 * Validates and extracts a YouTube playlist ID from raw user input.
 * Can be a full URL, protocol-less URL, or a bare playlist ID.
 */
export function parsePlaylistInput(rawInput: string): ParseResult {
  if (!rawInput) {
    return {
      success: false,
      error: 'EMPTY_INPUT',
      messageKey: 'error.emptyInput',
    };
  }

  const trimmed = rawInput.trim();
  if (trimmed.length === 0) {
    return {
      success: false,
      error: 'EMPTY_INPUT',
      messageKey: 'error.emptyInput',
    };
  }

  // Safety: Reject excessive string length
  if (trimmed.length > 2048) {
    return {
      success: false,
      error: 'INVALID_ID',
      messageKey: 'error.invalidUrl',
    };
  }

  // Check if it's already a bare playlist ID
  if (!trimmed.includes('/') && !trimmed.includes(':') && !trimmed.includes('.')) {
    return validatePlaylistId(trimmed);
  }

  // Attempt to parse as URL
  let parsedUrl: URL;
  try {
    // If it starts with dangerous schemes, reject immediately
    const lower = trimmed.toLowerCase();
    if (
      lower.startsWith('javascript:') ||
      lower.startsWith('data:') ||
      lower.startsWith('file:') ||
      lower.startsWith('vbscript:')
    ) {
      return {
        success: false,
        error: 'INVALID_URL',
        messageKey: 'error.invalidUrl',
      };
    }

    // Add https:// protocol if missing
    let urlString = trimmed;
    if (urlString.startsWith('//')) {
      urlString = `https:${urlString}`;
    } else if (!urlString.startsWith('http://') && !urlString.startsWith('https://')) {
      urlString = `https://${urlString}`;
    }

    parsedUrl = new URL(urlString);
  } catch {
    return {
      success: false,
      error: 'INVALID_URL',
      messageKey: 'error.invalidUrl',
    };
  }

  // Hostname allow-list check
  // Note: parsedUrl.hostname normalizes to lower case and punycode
  const host = parsedUrl.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(host)) {
    return {
      success: false,
      error: 'UNSUPPORTED_HOST',
      messageKey: 'error.invalidUrl',
    };
  }

  // Extract 'list' query parameter
  const listParam = parsedUrl.searchParams.get('list');
  if (!listParam) {
    return {
      success: false,
      error: 'INVALID_URL',
      messageKey: 'error.invalidUrl',
    };
  }

  return validatePlaylistId(listParam);
}

/**
 * Validates that an extracted ID satisfies YouTube format constraints and is not a mix.
 */
function validatePlaylistId(id: string): ParseResult {
  // Rejection: Mix playlists (RD...)
  if (id.startsWith('RD')) {
    return {
      success: false,
      error: 'MIX_NOT_SUPPORTED',
      messageKey: 'error.mixNotSupported',
    };
  }

  // Must match standard ID pattern (10-64 chars of A-Za-z0-9_-)
  if (!PLAYLIST_ID_REGEX.test(id)) {
    return {
      success: false,
      error: 'INVALID_ID',
      messageKey: 'error.invalidUrl',
    };
  }

  return {
    success: true,
    playlistId: id,
  };
}
