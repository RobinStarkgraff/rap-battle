/**
 * The hub's league tab (§11 Screens): the division tables, the player's fixtures and a look
 * at any other crew with its units, as the league stood at the start of the round.
 */

import Phaser from 'phaser';
import {
  ABILITIES,
  allUnits,
  divisionStandings,
  winnerSlot,
  type Crew,
  type CrewId,
  type League,
  type Unit,
} from '../../core';
import { drawLogo } from '../art/logos';
import { circle } from '../art/pen';
import { CREW_COLOUR_HEX, INK, UI } from '../palette';
import { addBody, addHeading, addPanel, fitWidth } from '../ui/panel';
import { registerTarget } from '../ui/targets';
import { CONTENT, type TabContext } from './tab';
import { divisionOf } from './view';

const ROW = 26;
const TABLE_WIDTH = 700;
const COLUMNS = [
  { label: '#', x: 12 },
  { label: 'CREW', x: 70 },
  { label: 'P', x: 430 },
  { label: 'W', x: 480 },
  { label: 'L', x: 530 },
  { label: 'PTS', x: 580 },
  { label: 'MC±', x: 640 },
] as const;

/** The league tab's own view state, kept by the hub scene. */
export interface LeagueUi {
  /** The crew shown in the side panel; the player's own until another row is clicked. */
  selected: CrewId | null;
}

export function createLeagueUi(): LeagueUi {
  return { selected: null };
}

export function renderLeagueTab(context: TabContext, ui: LeagueUi): void {
  const { scene, layer, state } = context;
  const { league } = state;
  layer.add(
    addPanel(scene, CONTENT.left, CONTENT.top, TABLE_WIDTH + 20, CONTENT.bottom - CONTENT.top),
  );
  let y = CONTENT.top + 12;
  league.season.divisions.forEach((_, division) => {
    layer.add(
      addHeading(
        scene,
        CONTENT.left + 16,
        y,
        `DIVISION ${String(division + 1)}${division === 0 ? ' · TOP' : ''}`,
        18,
        UI.textGold,
      ),
    );
    y += 28;
    COLUMNS.forEach((column) => {
      layer.add(
        addBody(
          scene,
          CONTENT.left + 10 + column.x,
          y,
          column.label,
          12,
          UI.textMuted,
        ).setFontStyle('bold'),
      );
    });
    y += 20;
    divisionStandings(league, division).forEach((row, index) => {
      const crew = league.crews.find((candidate) => candidate.id === row.crewId);
      if (crew === undefined) return;
      drawRow(
        context,
        ui,
        crew,
        [
          String(index + 1),
          '',
          String(row.played),
          String(row.wins),
          String(row.losses),
          String(row.points),
          String(row.margin),
        ],
        y,
      );
      y += ROW;
    });
    y += 10;
  });
  const shown = league.crews.find((crew) => crew.id === (ui.selected ?? state.crewId)) ?? null;
  const panelLeft = CONTENT.left + TABLE_WIDTH + 36;
  layer.add(
    addPanel(
      scene,
      panelLeft,
      CONTENT.top,
      CONTENT.right - panelLeft,
      CONTENT.bottom - CONTENT.top,
    ),
  );
  if (shown !== null) drawCrewPanel(context, shown, panelLeft + 16, CONTENT.right - panelLeft - 32);
}

function drawRow(
  context: TabContext,
  ui: LeagueUi,
  crew: Crew,
  cells: readonly string[],
  y: number,
): void {
  const { scene, layer, state } = context;
  const left = CONTENT.left + 10;
  const mine = crew.id === state.crewId;
  const chosen = crew.id === (ui.selected ?? state.crewId);
  const background = scene.add.graphics();
  background.fillStyle(
    mine ? 0x3a3a1c : chosen ? UI.panelLight : 0x000000,
    mine || chosen ? 1 : 0.001,
  );
  background.fillRoundedRect(left, y - 2, TABLE_WIDTH, ROW - 2, 6);
  layer.add(background);
  const hit = scene.add
    .zone(left + TABLE_WIDTH / 2, y + ROW / 2 - 2, TABLE_WIDTH, ROW - 2)
    .setInteractive({ useHandCursor: true });
  hit.on(Phaser.Input.Events.POINTER_UP, () => {
    ui.selected = crew.id;
    context.refresh();
  });
  registerTarget(`league-row-${crew.id}`, hit);
  layer.add(hit);
  const pen = scene.add.graphics();
  const main = CREW_COLOUR_HEX[crew.identity.mainColour];
  circle(pen, left + 52, y + 10, 10, INK);
  drawLogo(
    pen,
    crew.identity.logo,
    left + 52,
    y + 10,
    8,
    main,
    CREW_COLOUR_HEX[crew.identity.trimColour],
  );
  layer.add(pen);
  cells.forEach((cell, index) => {
    const column = COLUMNS[index];
    if (column === undefined) return;
    const text = index === 1 ? `${crew.identity.name}${mine ? '  (you)' : ''}` : cell;
    layer.add(
      addBody(scene, left + column.x, y + 2, text, 15, mine ? UI.textGold : UI.text).setFontStyle(
        index === 1 ? 'bold' : 'normal',
      ),
    );
  });
}

function drawCrewPanel(context: TabContext, crew: Crew, x: number, width: number): void {
  const { scene, layer, state } = context;
  let y = CONTENT.top + 14;
  layer.add(
    fitWidth(addHeading(scene, x, y, crew.identity.name.toUpperCase(), 20, UI.textGold), width),
  );
  y += 32;
  const member = state.league.members.find((candidate) => candidate.crewId === crew.id);
  const titles = crew.record.titles.length;
  layer.add(
    addBody(
      scene,
      x,
      y,
      `${member?.kind === 'bot' ? 'Bot crew' : 'Player crew'} · ${String(titles)} title${titles === 1 ? '' : 's'}`,
      14,
      UI.textMuted,
    ),
  );
  y += 26;
  const units = allUnits(crew);
  if (units.length === 0) {
    layer.add(addBody(scene, x, y, 'No units signed yet.', 15));
    y += 24;
  }
  for (const unit of units) {
    layer.add(addBody(scene, x, y, unitLine(unit), 14, UI.text, width));
    y += 21;
  }
  y += 12;
  layer.add(addHeading(scene, x, y, 'YOUR FIXTURES', 16, UI.textGold));
  y += 26;
  for (const line of fixtureLines(state.league, state.crewId, state.round.seasonRound)) {
    if (y > CONTENT.bottom - 24) break;
    layer.add(addBody(scene, x, y, line, 14, UI.text, width));
    y += 20;
  }
}

function unitLine(unit: Unit): string {
  const abilities = unit.abilities.map((learned) => ABILITIES[learned.id].name).join(', ');
  const stats =
    unit.role === 'mc'
      ? `${String(unit.flow)}/${String(unit.confidence)}`
      : `P${String(unit.abilities[0].power)}`;
  return `${unit.stageName} · ${stats} · ${abilities}`;
}

/** The player's games this season: results so far, then the rounds to come. */
export function fixtureLines(league: League, crewId: CrewId, currentRound: number): string[] {
  const division = divisionOf(league, crewId);
  if (division < 0) return ['You join a division at the next season start.'];
  const crewIds = league.season.divisions[division]?.crewIds ?? [];
  const slot = crewIds.indexOf(crewId);
  const name = (index: number): string =>
    league.crews.find((crew) => crew.id === crewIds[index])?.identity.name ?? '?';
  return (league.season.schedule[division] ?? []).flatMap((pairings, index) => {
    const pairing = pairings.find((candidate) => candidate.a === slot || candidate.b === slot);
    if (pairing === undefined) return [];
    const rival = pairing.a === slot ? pairing.b : pairing.a;
    const result = league.season.results.find(
      (candidate) =>
        candidate.division === division &&
        candidate.seasonRound === index + 1 &&
        (candidate.a === slot || candidate.b === slot),
    );
    const outcome =
      result === undefined
        ? index + 1 === currentRound
          ? 'next'
          : ''
        : winnerSlot(result) === slot
          ? 'won'
          : 'lost';
    return [`R${String(index + 1)}  vs ${name(rival)}${outcome === '' ? '' : `  · ${outcome}`}`];
  });
}
