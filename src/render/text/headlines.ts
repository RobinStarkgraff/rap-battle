/**
 * Tabloid headlines for the result screen (§11 Result screen, D-050), filled with the winner's
 * and loser's names: `{mvp}` is the battle's MVP, `{target}` the losing crew's top MC and
 * `{winner}` / `{loser}` the crews. Headlines are shown in capitals. Crew names can be singular
 * or plural, so no verb follows a crew's name.
 */

import { createRng, deriveSeed, type EndReason } from '../../core';
import { pickLine, type SlotValues } from './template';

export type HeadlineKind = 'blowout' | 'close' | 'crowd' | 'decision' | 'forfeit' | 'standard';

export const HEADLINES: Readonly<Record<HeadlineKind, readonly string[]>> = {
  blowout: [
    '{mvp} ROASTS {target}!',
    'BLOCK PARTY MASSACRE! {loser} FLATTENED BY {winner}!',
    'NOT EVEN CLOSE: {mvp} SENDS {loser} HOME!',
    '{target} LOSES THEIR DIGNITY TO {winner}!',
  ],
  close: [
    'NAIL-BITER! {loser} EDGED OUT BY {winner}!',
    'BY A WHISKER: {mvp} SAVES {winner}!',
    '{target} SO CLOSE, YET SO SPEECHLESS!',
    'PHOTO FINISH ON THE BLOCK: VICTORY FOR {winner}!',
  ],
  crowd: [
    'THE CROWD HAS SPOKEN: VICTORY FOR {winner}!',
    'BY POPULAR DEMAND: {loser} VOTED OFF THE BLOCK!',
    '{mvp} WINS THE CROWD, {target} WINS NOTHING!',
    'LOUDER IS BETTER: {loser} OUT-HYPED BY {winner}!',
  ],
  decision: [
    'JUDGES’ DECISION! {loser} OUTLASTED BY {winner}!',
    'MARATHON BATTLE ENDS WITH {winner} ON TOP!',
    'NOBODY CHOKED, EVERYBODY SWEATED: VICTORY FOR {winner}!',
  ],
  forfeit: ['NO-SHOW! NO MCS FOR {loser}!', 'EMPTY STAGE SHOCKER: NO BARS NEEDED FOR {winner}!'],
  standard: [
    '{mvp} SERVES {target} A SIDE OF SHAME!',
    '{loser} OUT-RHYMED BY {winner}!',
    '{mvp} DROPS THE MIC ON {loser}!',
    'BLOCK PARTY BELONGS TO {winner}!',
    '{target} LEFT SPEECHLESS BY {mvp}!',
  ],
};

/** Which kind of headline a battle end gets: its reason, and the winner's MCs left. */
export function headlineKind(reason: EndReason, margin: number): HeadlineKind {
  switch (reason) {
    case 'noMcs':
      return 'forfeit';
    case 'turnLimit':
      return 'decision';
    case 'crowdVote':
      return 'crowd';
    case 'wipeout':
      if (margin >= 3) return 'blowout';
      return margin <= 1 ? 'close' : 'standard';
  }
}

export interface HeadlineNames {
  readonly winner: string;
  readonly loser: string;
  /** Missing when nobody dealt damage; the headline then names only the crews. */
  readonly mvp?: string;
  readonly target?: string;
}

/**
 * The battle's headline, in capitals, picked with a seed derived from the battle seed so
 * every peer prints the same one.
 */
export function headline(
  battleSeed: number,
  reason: EndReason,
  margin: number,
  names: HeadlineNames,
): string {
  const rng = createRng(deriveSeed(battleSeed, 'headline'));
  const hasMcs = names.mvp !== undefined && names.target !== undefined;
  const kind = headlineKind(reason, margin);
  const templates = hasMcs ? HEADLINES[kind] : HEADLINES[kind].filter(namesCrewsOnly);
  const values: SlotValues = names;
  return pickLine(rng, templates.length > 0 ? templates : CREWS_ONLY, values).toUpperCase();
}

/** Headlines that need no MC names, for battles without an MVP. */
const CREWS_ONLY: readonly string[] = ['VICTORY FOR {winner} OVER {loser}!'];

function namesCrewsOnly(template: string): boolean {
  return !template.includes('{mvp}') && !template.includes('{target}');
}
