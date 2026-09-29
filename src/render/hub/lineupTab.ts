/**
 * The hub's lineup tab (§2 Crew, §4 Arrange, §11 Screens: Lineup): drag units between the
 * three MC slots, the two support slots and the bench, or onto the release bin. A unit can also
 * be picked with a click and put down by clicking a place, and released from its detail panel.
 */

import Phaser from 'phaser';
import {
  ABILITIES,
  ARCHETYPES,
  benchSalary,
  MC_SLOTS,
  seasonsLeft,
  TUNABLES,
  type Crew,
  type Place,
  type Unit,
  type UnitId,
} from '../../core';
import { addUnitFigure } from '../art/unitFigure';
import { crewOutfit, UI } from '../palette';
import { problemText } from '../text';
import { addButton } from '../ui/button';
import { addBody, addHeading, addPanel, fitWidth } from '../ui/panel';
import { registerTarget } from '../ui/targets';
import { abilityText, statsText } from './marketView';
import { CONTENT, type TabContext } from './tab';
import { playerShop, walletView } from './view';

/** The lineup tab's own view state, kept by the hub scene across redraws. */
export interface LineupUi {
  selected: UnitId | null;
  /** The unit whose release waits for a second click. */
  confirmRelease: UnitId | null;
}

export function createLineupUi(): LineupUi {
  return { selected: null, confirmRelease: null };
}

const BOX = { width: 140, height: 240 };
const STAGE_Y = CONTENT.top + 34;
const BENCH_Y = CONTENT.top + 306;
const DETAIL_LEFT = 880;

interface Spot {
  readonly place: Place | 'release';
  readonly x: number;
  readonly y: number;
  readonly label: string;
  /** Names the spot for browser tests: `lineup-place-<key>`. */
  readonly key: string;
}

function spots(crew: Crew): Spot[] {
  const list: Spot[] = [
    ...([0, 1, 2] as const).map((index) => ({
      place: { area: 'mc', index } as const,
      x: 40 + index * 155,
      y: STAGE_Y,
      label: MC_SLOTS[index].toUpperCase(),
      key: `mc-${String(index)}`,
    })),
    {
      place: { area: 'support', index: 0 },
      x: 530,
      y: STAGE_Y,
      label: 'SUPPORT 1',
      key: 'support-0',
    },
    {
      place: { area: 'support', index: 1 },
      x: 685,
      y: STAGE_Y,
      label: 'SUPPORT 2',
      key: 'support-1',
    },
  ];
  for (let index = 0; index < TUNABLES.BENCH_SIZE; index++) {
    // The bench has no gaps, so every empty bench box means "add to the bench".
    list.push({
      place: { area: 'bench', index: Math.min(index, crew.bench.length) },
      x: 40 + index * 155,
      y: BENCH_Y,
      label: `BENCH ${String(index + 1)}`,
      key: `bench-${String(index)}`,
    });
  }
  list.push({ place: 'release', x: 530, y: BENCH_Y, label: 'RELEASE', key: 'release' });
  return list;
}

export function renderLineupTab(context: TabContext, ui: LineupUi): void {
  const { scene, layer, state } = context;
  const crew = playerShop(state).crew;
  const units = [...crew.mcSlots, ...crew.supportSlots, ...crew.bench].filter(
    (unit) => unit !== null,
  );
  if (ui.selected !== null && !units.some((unit) => unit.id === ui.selected)) ui.selected = null;
  layer.add(
    addPanel(
      scene,
      CONTENT.left,
      CONTENT.top,
      DETAIL_LEFT - CONTENT.left - 16,
      CONTENT.bottom - CONTENT.top,
    ),
  );
  layer.add(addHeading(scene, 40, CONTENT.top + 6, 'STAGE', 18, UI.textGold));
  layer.add(
    addHeading(
      scene,
      40,
      BENCH_Y - 26,
      `BENCH · half salary, sits the battle out`,
      16,
      UI.textGold,
    ),
  );
  for (const spot of spots(crew)) drawSpot(context, ui, crew, spot);
  drawUnits(context, ui, crew);
  layer.add(
    addPanel(
      scene,
      DETAIL_LEFT,
      CONTENT.top,
      CONTENT.right - DETAIL_LEFT,
      CONTENT.bottom - CONTENT.top,
    ),
  );
  const selected = units.find((unit) => unit.id === ui.selected);
  drawDetail(context, ui, selected);
}

function drawSpot(context: TabContext, ui: LineupUi, crew: Crew, spot: Spot): void {
  const { scene, layer } = context;
  const release = spot.place === 'release';
  const width = release ? 300 : BOX.width;
  const box = scene.add.graphics();
  box.fillStyle(release ? 0x4a1f2a : UI.panelLight, 1);
  box.fillRoundedRect(spot.x, spot.y, width, BOX.height, 12);
  box.lineStyle(2, release ? UI.accent : UI.panelEdge, 1);
  box.strokeRoundedRect(spot.x, spot.y, width, BOX.height, 12);
  layer.add(box);
  layer.add(
    addBody(
      scene,
      spot.x + width / 2,
      spot.y + 8,
      spot.label,
      13,
      release ? UI.textBad : UI.textMuted,
    )
      .setOrigin(0.5, 0)
      .setFontStyle('bold'),
  );
  if (release) {
    layer.add(
      addBody(
        scene,
        spot.x + width / 2,
        spot.y + 90,
        'Drop a unit here to release it.\nFree, but no refund: it goes back\nto the public list.',
        14,
        UI.text,
        width - 20,
      )
        .setOrigin(0.5, 0)
        .setAlign('center'),
    );
  }
  const zone = scene.add
    .zone(spot.x + width / 2, spot.y + BOX.height / 2, width, BOX.height)
    .setRectangleDropZone(width, BOX.height);
  zone.setData('place', spot.place);
  // With a unit picked, clicking a place puts it there.
  zone.setInteractive({ useHandCursor: ui.selected !== null, dropZone: true });
  zone.on(Phaser.Input.Events.POINTER_UP, () => {
    if (ui.selected === null) return;
    const unit = ui.selected;
    if (spot.place === 'release') {
      ui.confirmRelease = unit;
      context.refresh();
      return;
    }
    if (placeOfUnit(crew, unit) === spotKey(spot.place)) return;
    move(context, ui, unit, spot.place);
  });
  registerTarget(`lineup-place-${spot.key}`, zone);
  layer.add(zone);
}

function spotKey(place: Place): string {
  return `${place.area}-${String(place.index)}`;
}

function placeOfUnit(crew: Crew, unitId: UnitId): string | null {
  const mc = crew.mcSlots.findIndex((unit) => unit?.id === unitId);
  if (mc >= 0) return `mc-${String(mc)}`;
  const support = crew.supportSlots.findIndex((unit) => unit?.id === unitId);
  if (support >= 0) return `support-${String(support)}`;
  const bench = crew.bench.findIndex((unit) => unit.id === unitId);
  return bench >= 0 ? `bench-${String(bench)}` : null;
}

function move(context: TabContext, ui: LineupUi, unitId: UnitId, place: Place): void {
  ui.selected = null;
  const refusal = context.controller.move(unitId, place);
  if (refusal !== null) {
    context.say(problemText(refusal), 'bad');
    context.refresh();
  }
}

function drawUnits(context: TabContext, ui: LineupUi, crew: Crew): void {
  const placed: { unit: Unit; x: number; y: number; bench: boolean }[] = [
    ...crew.mcSlots.map((unit, index) => ({ unit, x: 40 + index * 155, y: STAGE_Y, bench: false })),
    ...crew.supportSlots.map((unit, index) => ({
      unit,
      x: 530 + index * 155,
      y: STAGE_Y,
      bench: false,
    })),
  ].flatMap((entry) => (entry.unit === null ? [] : [{ ...entry, unit: entry.unit }]));
  crew.bench.forEach((unit, index) =>
    placed.push({ unit, x: 40 + index * 155, y: BENCH_Y, bench: true }),
  );
  for (const entry of placed) drawUnit(context, ui, crew, entry);
}

function drawUnit(
  context: TabContext,
  ui: LineupUi,
  crew: Crew,
  entry: { unit: Unit; x: number; y: number; bench: boolean },
): void {
  const { scene, layer } = context;
  const { unit } = entry;
  const centreX = entry.x + BOX.width / 2;
  const centreY = entry.y + BOX.height / 2;
  const piece = scene.add.container(centreX, centreY);
  const chosen = ui.selected === unit.id;
  if (chosen) {
    const glow = scene.add.graphics();
    glow.lineStyle(4, UI.button, 1);
    glow.strokeRoundedRect(
      -BOX.width / 2 + 3,
      -BOX.height / 2 + 3,
      BOX.width - 6,
      BOX.height - 6,
      10,
    );
    piece.add(glow);
  }
  piece.add(
    addUnitFigure(scene, 0, 50, unit, crewOutfit(crew.identity), { scale: 0.95 }).container,
  );
  const salary = entry.bench ? benchSalary(unit.salary) : unit.salary;
  piece.add(
    addBody(
      scene,
      0,
      84,
      `${statsText(unit)} · ${String(salary)} g${entry.bench ? ' (½)' : ''}`,
      13,
      UI.text,
    )
      .setOrigin(0.5, 0)
      .setFontStyle('bold'),
  );
  piece.setSize(BOX.width - 20, BOX.height - 40);
  piece.setInteractive({ draggable: true, useHandCursor: true });
  registerTarget(`lineup-unit-${unit.id}`, piece);
  let dragged = false;
  piece.on(Phaser.Input.Events.DRAG_START, () => {
    dragged = false;
    layer.bringToTop(piece);
  });
  piece.on(Phaser.Input.Events.DRAG, (_pointer: Phaser.Input.Pointer, x: number, y: number) => {
    dragged = dragged || Math.abs(x - centreX) + Math.abs(y - centreY) > 6;
    piece.setPosition(x, y);
  });
  piece.on(
    Phaser.Input.Events.DROP,
    (_pointer: Phaser.Input.Pointer, zone: Phaser.GameObjects.Zone) => {
      const place = zone.getData('place') as Place | 'release';
      if (place === 'release') {
        ui.selected = unit.id;
        ui.confirmRelease = unit.id;
        context.refresh();
      } else if (placeOfUnit(crew, unit.id) !== spotKey(place)) {
        move(context, ui, unit.id, place);
      }
    },
  );
  piece.on(Phaser.Input.Events.DRAG_END, (_pointer: Phaser.Input.Pointer, dropped: boolean) => {
    if (!dropped) piece.setPosition(centreX, centreY);
  });
  piece.on(Phaser.Input.Events.POINTER_UP, () => {
    if (dragged) return;
    ui.selected = ui.selected === unit.id ? null : unit.id;
    ui.confirmRelease = null;
    context.refresh();
  });
  layer.add(piece);
}

function drawDetail(context: TabContext, ui: LineupUi, unit: Unit | undefined): void {
  const { scene, layer, state } = context;
  const left = DETAIL_LEFT + 18;
  const width = CONTENT.right - DETAIL_LEFT - 36;
  const wallet = walletView(state);
  layer.add(addHeading(scene, left, CONTENT.top + 14, 'PAYROLL', 18, UI.textGold));
  layer.add(
    addBody(
      scene,
      left,
      CONTENT.top + 42,
      `${String(wallet.payroll)} g due at lock-in · wallet ${String(wallet.wallet)} g`,
      15,
      wallet.payroll > wallet.wallet ? UI.textBad : UI.text,
    ),
  );
  if (unit === undefined) {
    layer.add(
      addBody(
        scene,
        left,
        CONTENT.top + 80,
        'Drag units between slots and the bench, or click a unit and then a place. MCs play in MC slots, support units in support slots; the Opener goes first.',
        15,
        UI.textMuted,
        width,
      ),
    );
    return;
  }
  const archetype = ARCHETYPES[unit.archetype];
  layer.add(
    fitWidth(addHeading(scene, left, CONTENT.top + 84, unit.stageName.toUpperCase(), 22), width),
  );
  layer.add(
    addBody(
      scene,
      left,
      CONTENT.top + 116,
      `${archetype.name} · ${statsText(unit)} · age ${String(unit.age)} (${String(seasonsLeft(unit))} left) · ${String(unit.xp)} xp`,
      14,
      UI.text,
      width,
    ),
  );
  let y = CONTENT.top + 150;
  for (const learned of unit.abilities) {
    layer.add(
      addBody(scene, left, y, ABILITIES[learned.id].name, 15, UI.textGold).setFontStyle('bold'),
    );
    const text = addBody(scene, left, y + 20, abilityText(learned), 13, UI.text, width);
    layer.add(text);
    y += 26 + text.height;
  }
  layer.add(
    addBody(
      scene,
      left,
      y + 4,
      `Salary ${String(unit.salary)} g (half on the bench). Career: ${String(unit.record.battles)} battles, ${String(unit.record.wins)} wins.`,
      13,
      UI.textMuted,
      width,
    ),
  );
  const confirming = ui.confirmRelease === unit.id;
  const release = addButton(
    scene,
    DETAIL_LEFT + (CONTENT.right - DETAIL_LEFT) / 2,
    CONTENT.bottom - 44,
    confirming ? `YES, RELEASE ${unit.stageName.toUpperCase()}` : 'RELEASE',
    () => {
      if (!confirming) {
        ui.confirmRelease = unit.id;
        context.refresh();
        return;
      }
      ui.confirmRelease = null;
      ui.selected = null;
      const refusal = context.controller.release(unit.id);
      if (refusal === null) context.say(`${unit.stageName} is back on the public list.`, 'info');
      else context.say(problemText(refusal), 'bad');
    },
    {
      width: width,
      height: 48,
      fontSize: confirming ? 15 : 20,
      fill: UI.accent,
      hoverFill: 0xff5d6a,
      target: 'lineup-release',
    },
  );
  layer.add(release.container);
  if (confirming) {
    layer.add(
      addBody(
        scene,
        left,
        CONTENT.bottom - 96,
        'Releasing is free, with no refund.',
        13,
        UI.textBad,
      ),
    );
  }
}
