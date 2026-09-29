/**
 * Networking layer (M6): the transport (PeerJS, or in memory for tests), room codes, and the
 * league protocol. May depend on `core/` only.
 */

export { createLinkDriver } from './link';
export type { HostRoom, Link, LinkDriver, NetError, Network } from './link';
export { framedLink, MAX_FRAME } from './frames';
export { createMemoryNetwork, linkedPair } from './memoryNetwork';
export type { MemoryNetwork } from './memoryNetwork';
export { createPeerNetwork } from './peerNetwork';
export { peerServerFrom } from './peerServer';
export type { PeerServer } from './peerServer';
export { newRoomCode, parseRoomCode, ROOM_CODE_LENGTH } from './roomCode';
export type { RoomCode } from './roomCode';
export { awaitHello, greetHost, HANDSHAKE_TIMEOUT_MS } from './handshake';
export type { GuestHandshakeError, HostHandshakeError } from './handshake';
export { connectLeagueClient } from './leagueClient';
export type {
  ClientEvent,
  ClientOptions,
  ClientPlayed,
  ClientRound,
  LeagueClient,
} from './leagueClient';
export { createLeagueHost, MAX_GUESTS, NUDGE_GAP_MS } from './leagueHost';
export type { LeagueHost, LeagueHostOptions, StartError } from './leagueHost';
export { randomNonce } from './nonce';
export { agreedSeeds, applyOp, commitOf, opFor, sealedFor, seedsFrom } from './ops';
export type {
  BattleSeed,
  CrewBids,
  CrewNonce,
  OpApplied,
  PlayerAction,
  RoundOp,
  ShopAction,
} from './ops';
export { sha256Hex } from './sha256';
export {
  decodeGuestMessage,
  decodeHostMessage,
  encodeMessage,
  GAME_ID,
  helloFor,
  PROTOCOL_VERSION,
} from './protocol';
export type {
  GuestMessage,
  Hello,
  HostMessage,
  NoticeReason,
  RefusalReason,
  SavedLeagueInfo,
  SeatInfo,
  ShopTimer,
} from './protocol';
