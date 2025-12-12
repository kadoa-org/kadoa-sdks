/**
 * API related constants
 */

export const PUBLIC_API_URI =
  process.env.KADOA_PUBLIC_API_URI ?? "https://api.kadoa.com";

export const WSS_API_URI =
  process.env.KADOA_WSS_API_URI ?? "wss://realtime.kadoa.com";

export const WSS_NEO_API_URI =
  process.env.KADOA_WSS_NEO_API_URI ?? "wss://events.kadoa.com/events/ws";

export const REALTIME_API_URI =
  process.env.KADOA_REALTIME_API_URI ?? "https://realtime.kadoa.com";
