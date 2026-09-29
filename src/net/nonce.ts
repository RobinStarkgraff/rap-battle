/** Secret nonces for battle seed commitments (D-084). */

/** 128 random bits as hex, from the browser's (or Node's) secure random numbers. */
export function randomNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
