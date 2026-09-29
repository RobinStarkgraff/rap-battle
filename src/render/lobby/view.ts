/** What the lobby says, from its state. Pure, so it is unit-tested. */

import type { AwaySummary, Title } from '../../core';

function plural(count: number, word: string, words = `${word}s`): string {
  return `${String(count)} ${count === 1 ? word : words}`;
}

function ordinal(place: number): string {
  const tens = place % 100;
  if (tens >= 11 && tens <= 13) return `${String(place)}th`;
  return `${String(place)}${['th', 'st', 'nd', 'rd'][place % 10] ?? 'th'}`;
}

function titleLine(title: Title): string {
  return title.kind === 'champion'
    ? `Champions of season ${String(title.season)}!`
    : `Won division ${String(title.division + 1)} in season ${String(title.season)}!`;
}

function names(units: readonly { readonly stageName: string }[]): string {
  return units.map((unit) => unit.stageName).join(', ');
}

/** The "while you were away" summary (§7 AI managers) in a few short lines. */
export function awayLines(summary: AwaySummary): string[] {
  const lines = [
    `${plural(summary.rounds, 'round')} played: ${plural(summary.wins, 'win')}, ${plural(summary.losses, 'loss', 'losses')}.`,
  ];
  if (summary.seasonsEnded > 0) {
    lines.push(
      summary.seasonsEnded === 1
        ? 'A season ended.'
        : `${plural(summary.seasonsEnded, 'season')} ended.`,
    );
  }
  lines.push(...summary.titles.map(titleLine));
  lines.push(`Wallet: ${String(summary.walletBefore)} → ${String(summary.walletAfter)} gold.`);
  if (summary.signed.length > 0) lines.push(`Signed: ${names(summary.signed)}.`);
  if (summary.released.length > 0) lines.push(`Released: ${names(summary.released)}.`);
  if (summary.retired.length > 0) lines.push(`Retired: ${names(summary.retired)}.`);
  if (summary.standing !== null) {
    lines.push(
      `Now ${ordinal(summary.standing.position)} in division ${String(summary.standing.division + 1)}.`,
    );
  }
  return lines;
}
