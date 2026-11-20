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
