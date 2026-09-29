/**
 * The start of every link (D-081): the guest says `hello` with its protocol version and what
 * it knows about its saved league, and the host answers `welcome` with the guest's seat, or
 * `refused`. Either end closes a link whose other end speaks another protocol version.
 */

import { fail, ok, type Result } from '../core';
import type { Link } from './link';
import {
  decodeHello,
  decodeHostMessage,
  encodeMessage,
  helloFor,
  PROTOCOL_VERSION,
  type Hello,
  type RefusalReason,
  type SavedLeagueInfo,
} from './protocol';

/** How long either end waits for the other's handshake message. */
export const HANDSHAKE_TIMEOUT_MS = 10_000;

export type GuestHandshakeError = RefusalReason | 'noAnswer' | 'hostLeft';
export type HostHandshakeError = 'protocolMismatch' | 'noHello' | 'guestLeft';

/**
 * Waits for the first message that `accept` takes (`undefined` skips a message), the link to
 * close, or the timeout, and stops listening then.
 */
function firstMessage<T, E extends string>(
  link: Link,
  accept: (text: string) => Result<T, E> | undefined,
  closed: E,
  timedOut: E,
  timeoutMs: number,
): Promise<Result<T, E>> {
  return new Promise((resolve) => {
    let done = false;
    const stops: (() => void)[] = [];
    const finish = (result: Result<T, E>): void => {
      if (done) return;
      done = true;
      for (const stop of stops) stop();
      if (!result.ok && result.error !== closed) link.close();
      resolve(result);
    };
    const timer = setTimeout(() => {
      finish(fail(timedOut));
    }, timeoutMs);
    stops.push(() => {
      clearTimeout(timer);
    });
    stops.push(
      link.onClose(() => {
        finish(fail(closed));
      }),
    );
    stops.push(
      link.onMessage((text) => {
        const accepted = accept(text);
        if (accepted !== undefined) finish(accepted);
      }),
    );
  });
}

/** The guest's side: says hello and waits for its seat. */
export function greetHost(
  link: Link,
  league: SavedLeagueInfo | null,
  timeoutMs: number = HANDSHAKE_TIMEOUT_MS,
): Promise<Result<{ readonly seat: number }, GuestHandshakeError>> {
  const answer = firstMessage<{ readonly seat: number }, GuestHandshakeError>(
    link,
    (text) => {
      const message = decodeHostMessage(text);
      if (!message.ok) return undefined;
      if (message.value.type === 'welcome') {
        return message.value.protocol === PROTOCOL_VERSION
          ? ok({ seat: message.value.seat })
          : fail('protocolMismatch');
      }
      // Anything else before the welcome is ignored.
      return message.value.type === 'refused' ? fail(message.value.reason) : undefined;
    },
    'hostLeft',
    'noAnswer',
    timeoutMs,
  );
  link.send(encodeMessage(helloFor(league)));
  return answer;
}

/** The host's side: waits for a guest's hello and turns away other protocol versions. */
export function awaitHello(
  link: Link,
  timeoutMs: number = HANDSHAKE_TIMEOUT_MS,
): Promise<Result<Hello, HostHandshakeError>> {
  return firstMessage<Hello, HostHandshakeError>(
    link,
    (text) => {
      const hello = decodeHello(text);
      if (!hello.ok) return undefined;
      if (hello.value.protocol === PROTOCOL_VERSION) return ok(hello.value);
      link.send(encodeMessage({ type: 'refused', reason: 'protocolMismatch' }));
      return fail('protocolMismatch');
    },
    'guestLeft',
    'noHello',
    timeoutMs,
  );
}

/** The host seats a guest that said hello. */
export function welcomeGuest(link: Link, seat: number): void {
  link.send(encodeMessage({ type: 'welcome', protocol: PROTOCOL_VERSION, seat }));
}

/** The host turns a guest away and closes the link. */
export function refuseGuest(link: Link, reason: RefusalReason): void {
  link.send(encodeMessage({ type: 'refused', reason }));
  link.close();
}
