/**
 * An in-memory `Network` for unit tests: rooms and links live in one process, and messages
 * are delivered asynchronously (a microtask later) and in order, like a data channel.
 */

import { fail, ok } from '../core';
import { createLinkDriver, type HostRoom, type Link, type LinkDriver, type Network } from './link';
import type { RoomCode } from './roomCode';

export interface MemoryNetwork extends Network {
  /** Takes the room's signalling away, as when the host's server connection drops. */
  loseRoom(code: RoomCode): void;
}

interface Room {
  readonly guestListeners: Set<(link: Link) => void>;
  readonly lostListeners: Set<() => void>;
  readonly links: Set<Link>;
}

export function createMemoryNetwork(): MemoryNetwork {
  const rooms = new Map<RoomCode, Room>();

  function closeRoom(code: RoomCode): void {
    const room = rooms.get(code);
    if (room === undefined) return;
    rooms.delete(code);
    for (const link of [...room.links]) link.close();
  }

  return {
    host: (code) => {
      if (rooms.has(code)) return Promise.resolve(fail('codeTaken'));
      const room: Room = { guestListeners: new Set(), lostListeners: new Set(), links: new Set() };
      rooms.set(code, room);
      const hostRoom: HostRoom = {
        code,
        onGuest: (listener) => {
          room.guestListeners.add(listener);
          return () => room.guestListeners.delete(listener);
        },
        onLost: (listener) => {
          room.lostListeners.add(listener);
          return () => room.lostListeners.delete(listener);
        },
        close: () => {
          closeRoom(code);
        },
      };
      return Promise.resolve(ok(hostRoom));
    },
    join: (code) => {
      const room = rooms.get(code);
      if (room === undefined) return Promise.resolve(fail('noSuchRoom'));
      const [guestEnd, hostEnd] = linkedPair();
      room.links.add(hostEnd);
      hostEnd.onClose(() => room.links.delete(hostEnd));
      queueMicrotask(() => {
        for (const listener of [...room.guestListeners]) listener(hostEnd);
      });
      return Promise.resolve(ok(guestEnd));
    },
    loseRoom: (code) => {
      const room = rooms.get(code);
      if (room === undefined) return;
      rooms.delete(code);
      for (const listener of [...room.lostListeners]) listener();
    },
  };
}

/** Two link ends wired to each other. */
export function linkedPair(): readonly [Link, Link] {
  const ends: { a: LinkDriver | null; b: LinkDriver | null } = { a: null, b: null };
  const deliver = (to: () => LinkDriver | null, text: string): void => {
    queueMicrotask(() => to()?.receive(text));
  };
  const hangUp = (other: () => LinkDriver | null): void => {
    queueMicrotask(() => other()?.closed());
  };
  ends.a = createLinkDriver({
    send: (text) => {
      deliver(() => ends.b, text);
    },
    close: () => {
      hangUp(() => ends.b);
    },
  });
  ends.b = createLinkDriver({
    send: (text) => {
      deliver(() => ends.a, text);
    },
    close: () => {
      hangUp(() => ends.a);
    },
  });
  return [ends.a.link, ends.b.link];
}
