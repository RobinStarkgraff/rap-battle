/**
 * Splits long messages into frames and joins them again. A data channel limits the size of one
 * message (Chrome takes about 256 KB), and a league state snapshot can pass that, so every
 * message is sent as one whole frame (`W…`) or as numbered parts (`P<id>:<index>:<count>:…`).
 * A lone `H` is a heartbeat.
 */

import { createLinkDriver, type Link } from './link';

/** The longest frame sent, in UTF-16 code units: well under every browser's message limit. */
export const MAX_FRAME = 16_000;

const PART = /^P(\d+):(\d+):(\d+):/s;

/** Frames for one message, in order. */
export function toFrames(text: string, maxFrame: number, messageId: number): string[] {
  if (text.length + 1 <= maxFrame) return [`W${text}`];
  const header = (index: number, count: number): string =>
    `P${String(messageId)}:${String(index)}:${String(count)}:`;
  // The header is at most this long for any count the message can need.
  const room = maxFrame - header(text.length, text.length).length;
  const count = Math.ceil(text.length / room);
  return Array.from(
    { length: count },
    (_, index) => header(index, count) + text.slice(index * room, (index + 1) * room),
  );
}

/** Joins incoming frames into messages. Frames that don't fit the format are dropped. */
export function createDeframer(): (frame: string) => string | null {
  let current: { id: string; count: number; parts: string[] } | null = null;
  return (frame) => {
    if (frame.startsWith('W')) {
      current = null;
      return frame.slice(1);
    }
    const match = PART.exec(frame);
    if (match === null) return null;
    const [header, id = '', indexText = '', countText = ''] = match;
    const index = Number(indexText);
    const count = Number(countText);
    if (index === 0) current = { id, count, parts: [] };
    if (current?.id !== id || current.count !== count || current.parts.length !== index) {
      current = null;
      return null;
    }
    current.parts.push(frame.slice(header.length));
    if (current.parts.length < count) return null;
    const text = current.parts.join('');
    current = null;
    return text;
  };
}

/** A heartbeat frame: keeps the link alive and carries no message. */
const HEARTBEAT = 'H';

export interface KeepAlive {
  /** How often a heartbeat is sent. */
  readonly intervalMs: number;
  /** How long the link may be silent before it counts as lost and is closed. */
  readonly timeoutMs: number;
}

/**
 * A data channel can take a long time to notice that the network between two peers is gone,
 * so the PeerJS links send a heartbeat and close themselves after a silence (D-085). The
 * timeout is long because a hidden tab's timers may run only rarely; a closing tab says goodbye
 * itself (`pagehide`), so this only matters when the network is gone.
 */
export const PEER_KEEP_ALIVE: KeepAlive = { intervalMs: 5_000, timeoutMs: 45_000 };

/**
 * A link that frames what it sends and joins what it receives over `raw`, optionally with
 * heartbeats that close it when the other end goes silent.
 */
export function framedLink(
  raw: Link,
  maxFrame: number = MAX_FRAME,
  keepAlive: KeepAlive | null = null,
): Link {
  let nextId = 0;
  const deframe = createDeframer();
  const stops: (() => void)[] = [];
  const driver = createLinkDriver({
    send: (text) => {
      for (const frame of toFrames(text, maxFrame, nextId)) raw.send(frame);
      nextId++;
    },
    close: () => {
      for (const stop of stops) stop();
      raw.close();
    },
  });
  let lastHeard = Date.now();
  raw.onMessage((frame) => {
    lastHeard = Date.now();
    if (frame === HEARTBEAT) return;
    const text = deframe(frame);
    if (text !== null) driver.receive(text);
  });
  raw.onClose(() => {
    for (const stop of stops) stop();
    driver.closed();
  });
  if (keepAlive !== null) {
    const timer = setInterval(() => {
      if (Date.now() - lastHeard > keepAlive.timeoutMs) {
        driver.link.close();
        return;
      }
      raw.send(HEARTBEAT);
    }, keepAlive.intervalMs);
    stops.push(() => {
      clearInterval(timer);
    });
  }
  return driver.link;
}
