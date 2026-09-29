/**
 * The zod schema of the league state (§7 League state and hosting, D-031). Saves and the
 * league state the host sends after each round are checked against it, so malformed data
 * can't crash a peer (Q-012). Each schema is typed against the core type it checks, so the
 * compiler catches a field that one of them is missing.
 */

import { z } from 'zod';
import type { League, Member } from '../league';
import {
  ABILITY_IDS,
  LOGO_IDS,
  MAIN_COLOUR_IDS,
  MC_ARCHETYPE_IDS,
  SUPPORT_ARCHETYPE_IDS,
  TRIM_ONLY_COLOUR_IDS,
  type Crew,
  type CrewIdentity,
  type LearnedAbility,
  type McUnit,
  type SupportUnit,
  type Unit,
  type UnitAbilities,
  type UnitRecord,
} from '../model';
import { TUNABLES } from '../tunables';

const count = z.number().int().nonnegative();
const seed = z
  .number()
  .int()
  .min(0)
  .max(2 ** 32 - 1);
const id = z.string().min(1);

const learnedAbility: z.ZodType<LearnedAbility> = z.object({
  id: z.enum(ABILITY_IDS),
  power: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

const unitAbilities: z.ZodType<UnitAbilities> = z.union([
  z.tuple([learnedAbility]).readonly(),
  z.tuple([learnedAbility, learnedAbility]).readonly(),
]);

const unitRecord: z.ZodType<UnitRecord> = z.object({
  battles: count,
  barsLanded: count,
  chokes: count,
  wins: count,
  crews: z.array(z.object({ crewId: id, battles: count, seasons: count })),
});

const unitBase = {
  id,
  abilities: unitAbilities,
  xp: count,
  age: count,
  salary: count,
  look: seed,
  stageName: z.string().min(1),
  record: unitRecord,
};

const mcUnit: z.ZodType<McUnit> = z.object({
  ...unitBase,
  role: z.literal('mc'),
  archetype: z.enum(MC_ARCHETYPE_IDS),
  flow: count,
  confidence: count,
});

const supportUnit: z.ZodType<SupportUnit> = z.object({
  ...unitBase,
  role: z.literal('support'),
  archetype: z.enum(SUPPORT_ARCHETYPE_IDS),
});

const unit: z.ZodType<Unit> = z.union([mcUnit, supportUnit]);

/** A crew's name, colours and logo; the network protocol checks them with it too. */
export const crewIdentitySchema: z.ZodType<CrewIdentity> = z.object({
  name: z.string().min(1),
  mainColour: z.enum(MAIN_COLOUR_IDS),
  trimColour: z.enum([...MAIN_COLOUR_IDS, ...TRIM_ONLY_COLOUR_IDS]),
  logo: z.enum(LOGO_IDS),
});

const crew: z.ZodType<Crew> = z.object({
  id,
  identity: crewIdentitySchema,
  mcSlots: z.tuple([mcUnit.nullable(), mcUnit.nullable(), mcUnit.nullable()]).readonly(),
  supportSlots: z.tuple([supportUnit.nullable(), supportUnit.nullable()]).readonly(),
  bench: z.array(unit).max(TUNABLES.BENCH_SIZE),
  wallet: count,
  hallOfFame: z.array(z.object({ unit, retiredAfterSeason: count })),
  record: z.object({
    titles: z.array(
      z.object({ kind: z.enum(['champion', 'division']), season: count, division: count }),
    ),
    seasons: z.array(
      z.object({
        season: count,
        division: count,
        position: count,
        wins: count,
        losses: count,
        points: count,
      }),
    ),
  }),
});

const member: z.ZodType<Member> = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('player'), crewId: id, playerName: z.string() }),
  z.object({ kind: z.literal('bot'), crewId: id }),
]);

const pairing = z.object({ a: count, b: count });

export const leagueSchema: z.ZodType<League> = z.object({
  seed,
  members: z.array(member),
  crews: z.array(crew),
  market: z.object({ publicList: z.array(unit), nextUnitNumber: count }),
  season: z.object({
    number: count,
    divisions: z.array(z.object({ crewIds: z.array(id) })),
    schedule: z.array(z.array(z.array(pairing))),
    results: z.array(
      z.object({
        seasonRound: count,
        division: count,
        a: count,
        b: count,
        winner: z.enum(['a', 'b']),
        margin: count,
      }),
    ),
  }),
  completedRounds: count,
  lastRoundWinners: z.array(id),
  freshCrews: z.array(id),
  waiting: z.array(id),
  nextCrewNumber: count,
});
