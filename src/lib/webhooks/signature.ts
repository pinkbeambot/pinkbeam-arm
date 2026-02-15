/**
 * Webhook HMAC-SHA256 Signature Generation & Verification
 *
 * Each outbound webhook includes:
 *   X-Webhook-Id: <event_id>
 *   X-Webhook-Timestamp: <unix_seconds>
 *   X-Webhook-Signature: v1=<hex_hmac>
 *
 * Signed message = `${event_id}.${timestamp}.${body}`
 */

import { createHmac, timingSafeEqual } from 'crypto';

const SIGNATURE_VERSION = 'v1';
const TOLERANCE_SECONDS = 300; // 5 minutes

export function signPayload(
  eventId: string,
  timestamp: number,
  body: string,
  secret: string
): string {
  const signedContent = `${eventId}.${timestamp}.${body}`;
  const hmac = createHmac('sha256', secret).update(signedContent).digest('hex');
  return `${SIGNATURE_VERSION}=${hmac}`;
}

export function verifySignature(
  eventId: string,
  timestamp: number,
  body: string,
  secret: string,
  signature: string
): boolean {
  // Check timestamp tolerance
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > TOLERANCE_SECONDS) {
    return false;
  }

  const expected = signPayload(eventId, timestamp, body, secret);

  // Timing-safe comparison
  try {
    const expectedBuf = Buffer.from(expected, 'utf-8');
    const receivedBuf = Buffer.from(signature, 'utf-8');
    if (expectedBuf.length !== receivedBuf.length) return false;
    return timingSafeEqual(expectedBuf, receivedBuf);
  } catch {
    return false;
  }
}

export function generateHeaders(
  eventId: string,
  body: string,
  secret: string
): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signPayload(eventId, timestamp, body, secret);

  return {
    'X-Webhook-Id': eventId,
    'X-Webhook-Timestamp': String(timestamp),
    'X-Webhook-Signature': signature,
    'Content-Type': 'application/json',
    'User-Agent': 'PinkBeam-ARM/1.0',
  };
}
