/** New crews (§2 Crew identity, §3): founded by players or generated for bots (D-052). */

import { BOT_CREW_ADJECTIVES, BOT_CREW_NOUNS } from '../data';
import {
  LOGO_IDS,
  MAIN_COLOUR_IDS,
  TRIM_ONLY_COLOUR_IDS,
  type Crew,
  type CrewId,
  type CrewIdentity,
  type TrimColourId,
} from '../model';
import { uniqueName, type NameSet } from '../names';
import { createRng, deriveSeed } from '../rng';
import { TUNABLES } from '../tunables';

/** The id of the `number`-th crew of a league. */
export function crewId(number: number): CrewId {
  return `c${String(number)}`;
}

/** A brand new crew: no units and `STARTING_GOLD` (§3). */
export function foundCrew(id: CrewId, identity: CrewIdentity): Crew {
  return {
    id,
    identity,
    mcSlots: [null, null, null],
    supportSlots: [null, null],
    bench: [],
    wallet: TUNABLES.STARTING_GOLD,
    hallOfFame: [],
    record: { titles: [], seasons: [] },
  };
}

export type CrewNameError = 'empty' | 'tooLong' | 'taken';

/** Why a typed crew name can't be used, or `null`: 1 to `CREW_NAME_MAX` characters, unique. */
export function crewNameProblem(name: string, taken: NameSet): CrewNameError | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return 'empty';
  if (trimmed.length > TUNABLES.CREW_NAME_MAX) return 'tooLong';
  return taken.has(trimmed) ? 'taken' : null;
}

/**
 * A bot's identity: *The ⟨adjective⟩ ⟨noun⟩*, unique in the league, two different random
 * colours (the trim may be black or white) and a random logo, seeded by the bot's crew number.
 */
export function botIdentity(leagueSeed: number, number: number, taken: NameSet): CrewIdentity {
  const rng = createRng(deriveSeed(leagueSeed, 'bot', number));
  const name = uniqueName(
    () => `The ${rng.pick(BOT_CREW_ADJECTIVES)} ${rng.pick(BOT_CREW_NOUNS)}`,
    taken,
  );
  const mainColour = rng.pick(MAIN_COLOUR_IDS);
  const trims: TrimColourId[] = [...MAIN_COLOUR_IDS, ...TRIM_ONLY_COLOUR_IDS].filter(
    (colour) => colour !== mainColour,
  );
  return { name, mainColour, trimColour: rng.pick(trims), logo: rng.pick(LOGO_IDS) };
}
