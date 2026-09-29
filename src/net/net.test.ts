import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDeframer, framedLink, toFrames } from './frames';
import type { Link } from './link';
import { createMemoryNetwork, linkedPair } from './memoryNetwork';
import { peerServerFrom } from './peerServer';
import { newRoomCode, parseRoomCode, roomPeerId, type RoomCode } from './roomCode';

/** Lets every queued delivery of the memory network happen. */
async function settle(): Promise<void> {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

function collect(link: Link): string[] {
  const received: string[] = [];
  link.onMessage((text) => received.push(text));
  return received;
}

describe('room codes', () => {
  it('draws four letters from the alphabet', () => {
    const values = [0, 0.5, 0.99, 0.999999];
    let index = 0;
    const code = newRoomCode(() => values[index++] ?? 0);
    expect(code).toBe('ANZZ');
    expect(parseRoomCode(code)).toBe(code);
  });

  it('parses typed codes, ignoring case and spaces', () => {
    expect(parseRoomCode(' ab cd ')).toBe('ABCD');
    expect(parseRoomCode('abc')).toBeNull();
    expect(parseRoomCode('abcde')).toBeNull();
    // I and O are left out, because they look like 1 and 0.
    expect(parseRoomCode('ABCO')).toBeNull();
    expect(parseRoomCode('AB1D')).toBeNull();
  });

  it('names the room peer after the code', () => {
    expect(roomPeerId('WXYZ' as RoomCode)).toBe('mic-drop-league-wxyz');
  });
});

describe('peer server option', () => {
  it('is the public server without the parameter', () => {
    expect(peerServerFrom('')).toBeNull();
    expect(peerServerFrom('?seed=4')).toBeNull();
  });

  it('reads host, port and path; local hosts are not secure', () => {
    expect(peerServerFrom('?peer=localhost:9000')).toEqual({
      host: 'localhost',
      port: 9000,
      path: '/',
      secure: false,
    });
    expect(peerServerFrom('?peer=peers.example.com:443/myapp')).toEqual({
      host: 'peers.example.com',
      port: 443,
      path: '/myapp',
      secure: true,
    });
  });

  it('ignores values that are not a server', () => {
    expect(peerServerFrom('?peer=nonsense')).toBeNull();
    expect(peerServerFrom('?peer=host:99999')).toBeNull();
  });
});

describe('frames', () => {
  it('sends short messages whole', () => {
    expect(toFrames('hello', 100, 0)).toEqual(['Whello']);
  });

  it('splits long messages into parts that fit and joins them again', () => {
    const text = 'x'.repeat(250) + 'é'.repeat(250);
    const frames = toFrames(text, 64, 7);
    expect(frames.length).toBeGreaterThan(1);
    expect(frames.every((frame) => frame.length <= 64)).toBe(true);
    const deframe = createDeframer();
    const joined = frames.map(deframe);
    expect(joined.slice(0, -1).every((part) => part === null)).toBe(true);
    expect(joined.at(-1)).toBe(text);
  });

  it('drops parts that arrive out of order or malformed', () => {
    const deframe = createDeframer();
    const frames = toFrames('y'.repeat(300), 64, 1);
    expect(deframe(frames[1] ?? '')).toBeNull();
    expect(deframe('garbage')).toBeNull();
    // A fresh message still gets through afterwards.
    expect(frames.map(deframe).at(-1)).toBe('y'.repeat(300));
  });

  it('carries long and short messages in order over a framed link', async () => {
    const [a, b] = linkedPair();
    const sender = framedLink(a, 50);
    const received = collect(framedLink(b, 50));
    const long = 'league '.repeat(100);
    sender.send('first');
    sender.send(long);
    sender.send('last');
    await settle();
    expect(received).toEqual(['first', long, 'last']);
  });
});

describe('keep-alive', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps a link open while both ends beat, and closes it after a silence', async () => {
    vi.useFakeTimers();
    const keepAlive = { intervalMs: 100, timeoutMs: 350 };
    const [a, b] = linkedPair();
    const alive = framedLink(a, 50, keepAlive);
    const other = framedLink(b, 50, keepAlive);
    const received = collect(other);
    for (let step = 0; step < 10; step++) {
      vi.advanceTimersByTime(100);
      await settle();
    }
    expect(alive.isOpen()).toBe(true);
    expect(other.isOpen()).toBe(true);
    // Heartbeats never reach the listeners.
    expect(received).toEqual([]);

    const [c] = linkedPair();
    // The other end of `c` never answers, as when the network is gone.
    const lonely = framedLink(c, 50, keepAlive);
    for (let step = 0; step < 5; step++) {
      vi.advanceTimersByTime(100);
      await settle();
    }
    expect(lonely.isOpen()).toBe(false);
  });
});

describe('memory network', () => {
  it('connects a guest to a host by code, both ways', async () => {
    const network = createMemoryNetwork();
    const code = 'ABCD' as RoomCode;
    const hosted = await network.host(code);
    if (!hosted.ok) throw new Error(hosted.error);
    const hostLinks: Link[] = [];
    hosted.value.onGuest((link) => hostLinks.push(link));
    const joined = await network.join(code);
    if (!joined.ok) throw new Error(joined.error);
    await settle();
    const [hostEnd] = hostLinks;
    if (hostEnd === undefined) throw new Error('no guest arrived');
    const atHost = collect(hostEnd);
    const atGuest = collect(joined.value);
    joined.value.send('hello host');
    hostEnd.send('hello guest');
    await settle();
    expect(atHost).toEqual(['hello host']);
    expect(atGuest).toEqual(['hello guest']);
  });

  it('keeps messages that arrive before anyone listens', async () => {
    const [a, b] = linkedPair();
    a.send('early');
    a.send('second');
    await settle();
    const first: string[] = [];
    // A listener that leaves after one message leaves the rest for the next one.
    const stop = b.onMessage((text) => {
      first.push(text);
      stop();
    });
    await settle();
    const rest = collect(b);
    await settle();
    expect(first).toEqual(['early']);
    expect(rest).toEqual(['second']);
  });

  it('refuses a taken code and an unknown room', async () => {
    const network = createMemoryNetwork();
    const code = 'ABCD' as RoomCode;
    await network.host(code);
    expect(await network.host(code)).toEqual({ ok: false, error: 'codeTaken' });
    expect(await network.join('WXYZ' as RoomCode)).toEqual({ ok: false, error: 'noSuchRoom' });
  });

  it('tells both ends when a link closes, and closing the room closes its links', async () => {
    const network = createMemoryNetwork();
    const code = 'ABCD' as RoomCode;
    const hosted = await network.host(code);
    if (!hosted.ok) throw new Error(hosted.error);
    const joined = await network.join(code);
    if (!joined.ok) throw new Error(joined.error);
    let guestClosed = 0;
    joined.value.onClose(() => guestClosed++);
    hosted.value.close();
    await settle();
    expect(guestClosed).toBe(1);
    expect(joined.value.isOpen()).toBe(false);
    joined.value.send('into the void');
    let late = 0;
    joined.value.onClose(() => late++);
    expect(late).toBe(1);
  });

  it('reports a lost room to its host', async () => {
    const network = createMemoryNetwork();
    const code = 'ABCD' as RoomCode;
    const hosted = await network.host(code);
    if (!hosted.ok) throw new Error(hosted.error);
    let lost = 0;
    hosted.value.onLost(() => lost++);
    network.loseRoom(code);
    expect(lost).toBe(1);
    expect(await network.join(code)).toEqual({ ok: false, error: 'noSuchRoom' });
  });
});
