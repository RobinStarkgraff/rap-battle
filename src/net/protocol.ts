/**
 * The league protocol's messages (D-031, D-040): each is JSON text checked against its zod
 * schema on arrival, so malformed or foreign data is dropped instead of crashing a peer (Q-012).
 * A link starts with the handshake: the guest's `hello`, then the host's `welcome` or `refused`.
 */

import { z } from 'zod';
import {
  crewIdentitySchema,
  fail,
  ok,
  type Bid,
  type CrewId,
  type CrewIdentity,
  type Place,
  type Result,
} from '../core';
import type { CrewNonce, RoundOp, ShopAction } from './ops';

/** Marks the game's messages. */
export const GAME_ID = 'mic-drop-league';

/**
 * The protocol version. Both ends must speak the same one; bump it with every change to a
 * message's shape once the game is released.
 */
export const PROTOCOL_VERSION = 1;

const count = z.number().int().nonnegative();
const seed = z
  .number()
  .int()
  .min(0)
  .max(2 ** 32 - 1);
const id = z.string().min(1).max(64);

/** What a guest knows about the league it saved, so the host can match it (D-031, D-079). */
export interface SavedLeagueInfo {
  readonly seed: number;
  readonly completedRounds: number;
  /** The guest's own crew in that league, if it has one. */
  readonly crewId: string | null;
}

const savedLeagueInfo: z.ZodType<SavedLeagueInfo> = z.object({
  seed,
  completedRounds: count,
  crewId: id.nullable(),
});

export interface Hello {
  readonly type: 'hello';
  readonly game: typeof GAME_ID;
  readonly protocol: number;
  readonly league: SavedLeagueInfo | null;
}

/** Why the host turned a guest away. */
export const REFUSALS = ['protocolMismatch', 'sittingFull'] as const;
export type RefusalReason = (typeof REFUSALS)[number];

/**
 * `playerLeft`: the player dropped out mid-round, so their lineup was locked in (§7);
 * `outOfSync`: the player's result differed, and they now use the host's league.
 */
export const NOTICES = ['playerLeft', 'outOfSync'] as const;
export type NoticeReason = (typeof NOTICES)[number];

/** A running shop timer: what it runs for and how long it has left. */
export interface ShopTimer {
  readonly phase: 'bidding' | 'lineup';
  readonly remainingMs: number;
}

/** One person at the sitting, as everyone sees them. */
export interface SeatInfo {
  readonly seat: number;
  /** The crew they play, once they have one. */
  readonly crewId: CrewId | null;
  readonly crew: CrewIdentity | null;
  readonly isHost: boolean;
}

export type GuestMessage =
  | Hello
  /** A shop action for the guest's own crew. */
  | { readonly type: 'act'; readonly action: ShopAction }
  /** A newcomer founds a crew and joins the league (§7 Joining and leaving, D-080). */
  | { readonly type: 'found'; readonly identity: CrewIdentity }
  /** The guest's saved league, which the host asked for because it is newer (D-079). */
  | { readonly type: 'offerLeague'; readonly save: string }
  /** The secret behind the guest's seed commitment, once everyone has locked in (D-084). */
  | { readonly type: 'nonce'; readonly nonce: string }
  /** The guest's copy of the round broke: send the round again (D-085). */
  | { readonly type: 'resync' }
  /** The guest's result of the round differs from the host's league (D-085). */
  | { readonly type: 'outOfSync'; readonly round: number }
  /** A friendly poke for a player who is still shopping (§7 Slow players). */
  | { readonly type: 'nudge'; readonly crewId: CrewId };

export type HostMessage =
  | { readonly type: 'welcome'; readonly protocol: number; readonly seat: number }
  | { readonly type: 'refused'; readonly reason: RefusalReason }
  | { readonly type: 'seats'; readonly seats: readonly SeatInfo[] }
  /**
   * The sitting's league, as the save text, with the crew the guest plays in it and the
   * SHA-256 of its canonical JSON, to check the round's result against (D-085).
   */
  | {
      readonly type: 'league';
      readonly save: string;
      readonly you: CrewId | null;
      readonly hash: string;
    }
  | { readonly type: 'requestLeague' }
  /** Why the host didn't do what the guest asked, as a reason code. */
  | { readonly type: 'refusedAction'; readonly reason: string }
  /** The next round starts from the league everyone has; `humans` shop for themselves. */
  | { readonly type: 'roundStart'; readonly round: number; readonly humans: readonly CrewId[] }
  | { readonly type: 'op'; readonly seq: number; readonly op: RoundOp }
  /** Something happened to another player's crew that everyone should know. */
  | { readonly type: 'notice'; readonly reason: NoticeReason; readonly crewId: CrewId }
  /** Another player nudged this one. */
  | { readonly type: 'nudged'; readonly from: CrewId }
  /** The host's shop timer for the sitting, in seconds, or `null` when it is off (D-032). */
  | { readonly type: 'settings'; readonly timerSeconds: number | null }
  /**
   * The shop timer runs for the open bidding round or the lineup; the time left is sent rather
   * than a clock time, because the peers' clocks differ. `null` when no timer runs.
   */
  | { readonly type: 'timer'; readonly timer: ShopTimer | null }
  /** Everyone has locked in: reveal your nonce. */
  | { readonly type: 'revealNonce' }
  /** Every crew's nonce: the round's battles are played with the seeds they agree. */
  | { readonly type: 'play'; readonly nonces: readonly CrewNonce[] };

const hello: z.ZodType<Hello> = z.object({
  type: z.literal('hello'),
  game: z.literal(GAME_ID),
  protocol: z.number().int(),
  league: savedLeagueInfo.nullable(),
});

/** A SHA-256 as hex, and a seed nonce: 128 random bits as hex. */
const hash = z.string().regex(/^[0-9a-f]{64}$/);
const nonce = z.string().regex(/^[0-9a-f]{32}$/);

const place: z.ZodType<Place> = z.discriminatedUnion('area', [
  z.object({ area: z.literal('mc'), index: z.union([z.literal(0), z.literal(1), z.literal(2)]) }),
  z.object({ area: z.literal('support'), index: z.union([z.literal(0), z.literal(1)]) }),
  z.object({ area: z.literal('bench'), index: count }),
]);

const bids: z.ZodType<readonly Bid[]> = z
  .array(z.object({ unitId: id, amount: count }))
  .max(64)
  .readonly();

const shopAction: z.ZodType<ShopAction> = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('scout') }),
  z.object({ kind: z.literal('signScouted'), unitId: id }),
  z.object({ kind: z.literal('release'), unitId: id }),
  z.object({ kind: z.literal('move'), unitId: id, to: place }),
  z.object({ kind: z.literal('bid'), bids }),
  z.object({ kind: z.literal('lockIn'), commit: hash }),
]);

const roundOp: z.ZodType<RoundOp> = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('scout'), crewId: id }),
  z.object({ kind: z.literal('signScouted'), crewId: id, unitId: id }),
  z.object({ kind: z.literal('release'), crewId: id, unitId: id }),
  z.object({ kind: z.literal('move'), crewId: id, unitId: id, to: place }),
  z.object({ kind: z.literal('bidPlaced'), crewId: id, bids: bids.nullable() }),
  z.object({
    kind: z.literal('reveal'),
    bids: z.array(z.object({ crewId: id, bids })).max(64),
  }),
  z.object({ kind: z.literal('lockIn'), crewId: id, commit: hash }),
  z.object({ kind: z.literal('forceLockIn'), crewId: id, commit: hash }),
  z.object({ kind: z.literal('aiBid'), crewId: id }),
  z.object({ kind: z.literal('aiLineup'), crewId: id, commit: hash }),
]);

const seatInfo: z.ZodType<SeatInfo> = z.object({
  seat: count,
  crewId: id.nullable(),
  crew: crewIdentitySchema.nullable(),
  isHost: z.boolean(),
});

/** A league save; its own schema checks it when it is parsed. */
const saveText = z.string().min(2).max(5_000_000);
const reason = z.string().min(1).max(64);

const guestMessage: z.ZodType<GuestMessage> = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('hello'),
    game: z.literal(GAME_ID),
    protocol: z.number().int(),
    league: savedLeagueInfo.nullable(),
  }),
  z.object({ type: z.literal('act'), action: shopAction }),
  z.object({ type: z.literal('found'), identity: crewIdentitySchema }),
  z.object({ type: z.literal('offerLeague'), save: saveText }),
  z.object({ type: z.literal('nonce'), nonce }),
  z.object({ type: z.literal('resync') }),
  z.object({ type: z.literal('outOfSync'), round: count }),
  z.object({ type: z.literal('nudge'), crewId: id }),
]);

const hostMessage: z.ZodType<HostMessage> = z.discriminatedUnion('type', [
  z.object({ type: z.literal('welcome'), protocol: z.number().int(), seat: count }),
  z.object({ type: z.literal('refused'), reason: z.enum(REFUSALS) }),
  z.object({ type: z.literal('seats'), seats: z.array(seatInfo).max(64) }),
  z.object({ type: z.literal('league'), save: saveText, you: id.nullable(), hash }),
  z.object({ type: z.literal('notice'), reason: z.enum(NOTICES), crewId: id }),
  z.object({ type: z.literal('requestLeague') }),
  z.object({ type: z.literal('refusedAction'), reason }),
  z.object({
    type: z.literal('roundStart'),
    round: count,
    humans: z.array(id).max(64),
  }),
  z.object({ type: z.literal('op'), seq: count, op: roundOp }),
  z.object({ type: z.literal('nudged'), from: id }),
  z.object({
    type: z.literal('settings'),
    timerSeconds: z.number().int().min(10).max(3600).nullable(),
  }),
  z.object({
    type: z.literal('timer'),
    timer: z
      .object({
        phase: z.enum(['bidding', 'lineup']),
        remainingMs: z.number().int().min(0).max(3_600_000),
      })
      .nullable(),
  }),
  z.object({ type: z.literal('revealNonce') }),
  z.object({
    type: z.literal('play'),
    nonces: z.array(z.object({ crewId: id, nonce, replaced: z.boolean() })).max(64),
  }),
]);

export type DecodeError = 'notJson' | 'invalid';

function decode<T>(schema: z.ZodType<T>, text: string): Result<T, DecodeError> {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return fail('notJson');
  }
  const parsed = schema.safeParse(data);
  return parsed.success ? ok(parsed.data) : fail('invalid');
}

export function decodeGuestMessage(text: string): Result<GuestMessage, DecodeError> {
  return decode(guestMessage, text);
}

/** The first message on every link. */
export function decodeHello(text: string): Result<Hello, DecodeError> {
  return decode(hello, text);
}

export function decodeHostMessage(text: string): Result<HostMessage, DecodeError> {
  return decode(hostMessage, text);
}

export function encodeMessage(message: GuestMessage | HostMessage): string {
  return JSON.stringify(message);
}

export function helloFor(league: SavedLeagueInfo | null): Hello {
  return { type: 'hello', game: GAME_ID, protocol: PROTOCOL_VERSION, league };
}
