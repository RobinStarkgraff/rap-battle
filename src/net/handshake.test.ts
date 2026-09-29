import { describe, expect, it } from 'vitest';
import { awaitHello, greetHost, refuseGuest, welcomeGuest } from './handshake';
import type { Link } from './link';
import { linkedPair } from './memoryNetwork';
import {
  decodeGuestMessage,
  decodeHostMessage,
  encodeMessage,
  GAME_ID,
  helloFor,
  PROTOCOL_VERSION,
} from './protocol';

const LEAGUE = { seed: 99, completedRounds: 4, crewId: 'c2' };

function received(link: Link): string[] {
  const texts: string[] = [];
  link.onMessage((text) => texts.push(text));
  return texts;
}

describe('protocol messages', () => {
  it('round-trips a hello and the host messages', () => {
    const hello = helloFor(LEAGUE);
    expect(decodeGuestMessage(encodeMessage(hello))).toEqual({ ok: true, value: hello });
    const seats = {
      type: 'seats',
      seats: [
        {
          seat: 0,
          crewId: 'c1',
          isHost: true,
          crew: { name: 'Soggy Biscuits', mainColour: 'teal', trimColour: 'white', logo: 'crown' },
        },
        { seat: 1, crewId: null, isHost: false, crew: null },
      ],
    } as const;
    expect(decodeHostMessage(encodeMessage(seats))).toEqual({ ok: true, value: seats });
  });

  it('refuses text that is not JSON or not a message', () => {
    expect(decodeGuestMessage('{')).toEqual({ ok: false, error: 'notJson' });
    expect(decodeGuestMessage('{"type":"hello"}')).toEqual({ ok: false, error: 'invalid' });
    expect(decodeGuestMessage(JSON.stringify({ ...helloFor(null), game: 'another-game' }))).toEqual(
      { ok: false, error: 'invalid' },
    );
    expect(decodeHostMessage(JSON.stringify({ type: 'welcome', protocol: 1, seat: -1 }))).toEqual({
      ok: false,
      error: 'invalid',
    });
    expect(
      decodeHostMessage(
        JSON.stringify({
          type: 'seats',
          seats: [{ seat: 0, isHost: true, crew: { name: 'X', mainColour: 'mauve' } }],
        }),
      ),
    ).toEqual({ ok: false, error: 'invalid' });
  });
});

describe('handshake', () => {
  it('seats a guest that speaks the same protocol', async () => {
    const [guestEnd, hostEnd] = linkedPair();
    const greeting = greetHost(guestEnd, LEAGUE);
    const hello = await awaitHello(hostEnd);
    expect(hello).toEqual({
      ok: true,
      value: { type: 'hello', game: GAME_ID, protocol: PROTOCOL_VERSION, league: LEAGUE },
    });
    welcomeGuest(hostEnd, 3);
    expect(await greeting).toEqual({ ok: true, value: { seat: 3 } });
    expect(guestEnd.isOpen()).toBe(true);
  });

  it('leaves later messages for the next listener', async () => {
    const [guestEnd, hostEnd] = linkedPair();
    const greeting = greetHost(guestEnd, null);
    await awaitHello(hostEnd);
    welcomeGuest(hostEnd, 1);
    hostEnd.send(encodeMessage({ type: 'seats', seats: [] }));
    await greeting;
    const later = received(guestEnd);
    await Promise.resolve();
    await Promise.resolve();
    expect(later.map((text) => decodeHostMessage(text))).toEqual([
      { ok: true, value: { type: 'seats', seats: [] } },
    ]);
  });

  it('turns away another protocol version, on both ends', async () => {
    const [guestEnd, hostEnd] = linkedPair();
    const answer = received(guestEnd);
    guestEnd.send(encodeMessage({ ...helloFor(null), protocol: PROTOCOL_VERSION + 1 }));
    expect(await awaitHello(hostEnd)).toEqual({ ok: false, error: 'protocolMismatch' });
    expect(hostEnd.isOpen()).toBe(false);
    expect(answer.map((text) => decodeHostMessage(text))).toEqual([
      { ok: true, value: { type: 'refused', reason: 'protocolMismatch' } },
    ]);

    const [olderGuest, newerHost] = linkedPair();
    const greeting = greetHost(olderGuest, null);
    await awaitHello(newerHost);
    newerHost.send(encodeMessage({ type: 'welcome', protocol: PROTOCOL_VERSION + 1, seat: 1 }));
    expect(await greeting).toEqual({ ok: false, error: 'protocolMismatch' });
    expect(olderGuest.isOpen()).toBe(false);
  });

  it('reports a refusal, a silent host, and a host that leaves', async () => {
    const [guestEnd, hostEnd] = linkedPair();
    const greeting = greetHost(guestEnd, null);
    await awaitHello(hostEnd);
    refuseGuest(hostEnd, 'sittingFull');
    expect(await greeting).toEqual({ ok: false, error: 'sittingFull' });

    const [silentGuest] = linkedPair();
    expect(await greetHost(silentGuest, null, 5)).toEqual({ ok: false, error: 'noAnswer' });
    expect(silentGuest.isOpen()).toBe(false);

    const [leftGuest, leavingHost] = linkedPair();
    const left = greetHost(leftGuest, null);
    leavingHost.close();
    expect(await left).toEqual({ ok: false, error: 'hostLeft' });
  });

  it('closes links that never say hello, ignoring junk', async () => {
    const [guestEnd, hostEnd] = linkedPair();
    guestEnd.send('not json');
    guestEnd.send(JSON.stringify({ type: 'nope' }));
    expect(await awaitHello(hostEnd, 5)).toEqual({ ok: false, error: 'noHello' });
    expect(hostEnd.isOpen()).toBe(false);

    const [leaving, waiting] = linkedPair();
    leaving.close();
    expect(await awaitHello(waiting)).toEqual({ ok: false, error: 'guestLeft' });
  });
});
