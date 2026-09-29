/**
 * The transport the league protocol runs over (D-003): a host opens a room under a room code
 * and guests join it, each over one reliable, ordered text link (a star, D-013). PeerJS is one
 * implementation (`peerNetwork.ts`); unit tests use the in-memory one (`memoryNetwork.ts`).
 */

import type { Result } from '../core';
import type { RoomCode } from './roomCode';

/** One open connection between the host and a guest. Messages arrive in order. */
export interface Link {
  send(text: string): void;
  /** Closes the link; the other end sees it close too. */
  close(): void;
  /**
   * Messages are handed out asynchronously and in order; those that arrive while nobody
   * listens are kept for the next listener.
   */
  onMessage(listener: (text: string) => void): () => void;
  /** Called once when the link closes, from either end. */
  onClose(listener: () => void): () => void;
  isOpen(): boolean;
}

/** A room a host opened: guests arrive through it until it is closed. */
export interface HostRoom {
  readonly code: RoomCode;
  onGuest(listener: (link: Link) => void): () => void;
  /** Called once if the room loses the signalling server; open links may still work. */
  onLost(listener: () => void): () => void;
  /** Closes the room and every guest link. */
  close(): void;
}

/** Why hosting or joining failed. */
export type NetError =
  /** The signalling server can't be reached. */
  | 'serverUnreachable'
  /** Another room already uses the code. */
  | 'codeTaken'
  /** No room has the code. */
  | 'noSuchRoom'
  | 'timeout';

export interface Network {
  host(code: RoomCode): Promise<Result<HostRoom, NetError>>;
  join(code: RoomCode): Promise<Result<Link, NetError>>;
}

/** The two halves of a link, for implementations: `end` for users, the rest for the driver. */
export interface LinkDriver {
  readonly link: Link;
  /** Hands an incoming message to the listeners (or keeps it until one subscribes). */
  receive(text: string): void;
  /** Marks the link closed and tells the listeners, once. */
  closed(): void;
}

/**
 * A link whose sending and closing are done by `transport`; the implementation calls
 * `receive` and `closed` on the driver as things happen.
 */
export function createLinkDriver(transport: {
  readonly send: (text: string) => void;
  readonly close: () => void;
}): LinkDriver {
  let open = true;
  let drainQueued = false;
  // Every message waits here and is handed out a microtask later, in order, so a listener
  // that unsubscribes while it handles one message leaves the rest for the next listener.
  const pending: string[] = [];
  const messageListeners = new Set<(text: string) => void>();
  const closeListeners = new Set<() => void>();

  const drain = (): void => {
    drainQueued = false;
    while (pending.length > 0 && messageListeners.size > 0) {
      const text = pending.shift();
      if (text === undefined) break;
      for (const listener of [...messageListeners]) listener(text);
    }
  };
  const queueDrain = (): void => {
    if (drainQueued || messageListeners.size === 0) return;
    drainQueued = true;
    queueMicrotask(drain);
  };
  const closed = (): void => {
    if (!open) return;
    open = false;
    // Messages that arrived before the close are still handed out first.
    drain();
    for (const listener of [...closeListeners]) listener();
    closeListeners.clear();
  };
  const link: Link = {
    send: (text) => {
      if (open) transport.send(text);
    },
    close: () => {
      if (!open) return;
      transport.close();
      closed();
    },
    onMessage: (listener) => {
      messageListeners.add(listener);
      if (pending.length > 0) queueDrain();
      return () => messageListeners.delete(listener);
    },
    onClose: (listener) => {
      if (!open) {
        listener();
        return () => undefined;
      }
      closeListeners.add(listener);
      return () => closeListeners.delete(listener);
    },
    isOpen: () => open,
  };
  return {
    link,
    receive: (text) => {
      if (!open) return;
      pending.push(text);
      queueDrain();
    },
    closed,
  };
}
