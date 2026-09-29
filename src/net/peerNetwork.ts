/**
 * The PeerJS `Network` (D-003): a host registers its room code's peer id on the signalling
 * server, and guests open a reliable data channel to it. Messages are raw strings in frames
 * (`frames.ts`), so no PeerJS serializer or chunker is involved.
 */

import Peer, { type DataConnection, type PeerOptions } from 'peerjs';
import { fail, ok, type Result } from '../core';
import { framedLink, MAX_FRAME, PEER_KEEP_ALIVE } from './frames';
import { createLinkDriver, type HostRoom, type Link, type NetError, type Network } from './link';
import type { PeerServer } from './peerServer';
import { roomPeerId, type RoomCode } from './roomCode';

/** How long hosting or joining may take before it counts as failed. */
const CONNECT_TIMEOUT_MS = 15_000;

export function createPeerNetwork(server: PeerServer | null): Network {
  const options = peerOptions(server);
  return {
    host: (code) => hostRoom(code, options),
    join: (code) => joinRoom(code, options),
  };
}

function peerOptions(server: PeerServer | null): PeerOptions {
  if (server === null) return {};
  // A local server means a local test or LAN game, so no STUN server is needed (or reachable).
  const local = !server.secure;
  return {
    host: server.host,
    port: server.port,
    path: server.path,
    secure: server.secure,
    ...(local ? { config: { iceServers: [] } } : {}),
  };
}

function hostRoom(code: RoomCode, options: PeerOptions): Promise<Result<HostRoom, NetError>> {
  return new Promise((resolve) => {
    const peer = new Peer(roomPeerId(code), options);
    const guestListeners = new Set<(link: Link) => void>();
    const lostListeners = new Set<() => void>();
    const links = new Set<Link>();
    let settled = false;
    const settle = (result: Result<HostRoom, NetError>): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (!result.ok) peer.destroy();
      resolve(result);
    };
    const timer = setTimeout(() => {
      settle(fail('timeout'));
    }, CONNECT_TIMEOUT_MS);
    const room: HostRoom = {
      code,
      onGuest: (listener) => {
        guestListeners.add(listener);
        return () => guestListeners.delete(listener);
      },
      onLost: (listener) => {
        lostListeners.add(listener);
        return () => lostListeners.delete(listener);
      },
      close: () => {
        for (const link of [...links]) link.close();
        peer.destroy();
      },
    };
    peer.on('open', () => {
      settle(ok(room));
    });
    peer.on('connection', (connection) => {
      connection.on('open', () => {
        const link = connectionLink(connection);
        links.add(link);
        link.onClose(() => links.delete(link));
        for (const listener of [...guestListeners]) listener(link);
      });
    });
    peer.on('disconnected', () => {
      for (const listener of [...lostListeners]) listener();
    });
    peer.on('error', (error) => {
      if (!settled)
        settle(fail(error.type === 'unavailable-id' ? 'codeTaken' : 'serverUnreachable'));
    });
  });
}

function joinRoom(code: RoomCode, options: PeerOptions): Promise<Result<Link, NetError>> {
  return new Promise((resolve) => {
    const peer = new Peer(options);
    let settled = false;
    const settle = (result: Result<Link, NetError>): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (!result.ok) peer.destroy();
      resolve(result);
    };
    const timer = setTimeout(() => {
      settle(fail('timeout'));
    }, CONNECT_TIMEOUT_MS);
    peer.on('open', () => {
      const connection = peer.connect(roomPeerId(code), { reliable: true, serialization: 'raw' });
      connection.on('open', () => {
        const link = connectionLink(connection);
        // The guest's peer only exists for this link.
        link.onClose(() => {
          peer.destroy();
        });
        settle(ok(link));
      });
    });
    peer.on('error', (error) => {
      if (!settled)
        settle(fail(error.type === 'peer-unavailable' ? 'noSuchRoom' : 'serverUnreachable'));
    });
  });
}

/** A framed link over an open PeerJS data connection. */
function connectionLink(connection: DataConnection): Link {
  const driver = createLinkDriver({
    send: (text) => {
      void connection.send(text);
    },
    close: () => {
      connection.close();
    },
  });
  connection.on('data', (data) => {
    if (typeof data === 'string') driver.receive(data);
  });
  connection.on('close', () => {
    driver.closed();
  });
  connection.on('error', () => {
    driver.closed();
  });
  return framedLink(driver.link, MAX_FRAME, PEER_KEEP_ALIVE);
}
