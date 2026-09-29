/**
 * Room codes: what a host reads out and guests type in to join a sitting. Four letters from an
 * alphabet without look-alikes (no I or O), so about 330 000 codes.
 */

declare const roomCodeBrand: unique symbol;
export type RoomCode = string & { readonly [roomCodeBrand]: true };

/** A to Z without I and O. */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export const ROOM_CODE_LENGTH = 4;

/** The PeerJS id a room is registered under on the signalling server. */
const PEER_ID_PREFIX = 'mic-drop-league-';

/** A new code, from `random` (uniform in [0, 1), e.g. `Math.random`). */
export function newRoomCode(random: () => number): RoomCode {
  let code = '';
  for (let index = 0; index < ROOM_CODE_LENGTH; index++) {
    const letter = Math.floor(random() * ROOM_CODE_ALPHABET.length);
    code += ROOM_CODE_ALPHABET.charAt(Math.min(letter, ROOM_CODE_ALPHABET.length - 1));
  }
  return code as RoomCode;
}

/** A typed code, ignoring case and spaces, or `null` if it can't be a room code. */
export function parseRoomCode(input: string): RoomCode | null {
  const code = input.replace(/\s+/g, '').toUpperCase();
  if (code.length !== ROOM_CODE_LENGTH) return null;
  return /^[A-Z]+$/.test(code) && !/[IO]/.test(code) ? (code as RoomCode) : null;
}

export function roomPeerId(code: RoomCode): string {
  return `${PEER_ID_PREFIX}${code.toLowerCase()}`;
}
