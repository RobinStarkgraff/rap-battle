/**
 * The hub's market tab (§4, §11 Screens: Market, D-050): the scouting table with the
 * player's scouted units above the public list, sortable and filterable, a detail panel with
 * the bid input, and the bidding round's sealed bids.
 */

import Phaser from 'phaser';
import {
  ABILITIES,
  ARCHETYPES,
  MC_ARCHETYPE_IDS,
  SUPPORT_ARCHETYPE_IDS,
  TUNABLES,
  type ArchetypeId,
} from '../../core';
import { addBadge, addUnitFigure } from '../art/unitFigure';
import { FREE_AGENT_OUTFIT, PAPER, UI } from '../palette';
import { problemText } from '../text';
import { addButton } from '../ui/button';
import { addBody, addHeading, addPanel, fitWidth } from '../ui/panel';
import { registerTarget } from '../ui/targets';
import {
  abilityText,
  draftBids,
  draftProblem,
  marketTable,
  statsText,
  type MarketRow,
  type MarketUi,
  type SortKey,
} from './marketView';
import { CONTENT, type TabContext } from './tab';
import { awardLines, biddingView, walletView } from './view';

export { createMarketUi, type MarketUi } from './marketView';

const TABLE = { left: CONTENT.left, top: 196, width: 830, rowHeight: 31, rows: 13 };
const DETAIL = { left: 866, width: CONTENT.right - 866 };

const COLUMNS: readonly { key: SortKey | null; label: string; x: number; width: number }[] = [
  { key: null, label: '', x: 8, width: 30 },
  { key: 'name', label: 'NAME', x: 44, width: 170 },
  { key: 'type', label: 'TYPE', x: 218, width: 130 },
  { key: 'stats', label: 'F / C · PWR', x: 352, width: 82 },
  { key: 'abilities', label: 'ABILITIES', x: 438, width: 180 },
  { key: 'age', label: 'AGE (LEFT)', x: 622, width: 78 },
  { key: 'ask', label: 'ASK', x: 704, width: 40 },
  { key: 'salary', label: 'SAL', x: 748, width: 36 },
  { key: null, label: 'BID', x: 788, width: 40 },
];

type Line =
  | { readonly kind: 'heading'; readonly text: string }
  | { readonly kind: 'row'; readonly row: MarketRow };

export function renderMarketTab(context: TabContext, ui: MarketUi): void {
  const { scene, layer } = context;
  const table = marketTable(context.state, ui);
  const all = [...table.scouted, ...table.publicList];
  if (ui.selected !== null && !all.some((row) => row.unit.id === ui.selected)) ui.selected = null;
  layer.add(addPanel(scene, TABLE.left, CONTENT.top, TABLE.width, CONTENT.bottom - CONTENT.top));
  drawFilters(context, ui);
  drawHeader(context, ui);
  drawLines(
    context,
    ui,
    pageOf(ui, [
      ...(table.scouted.length > 0
        ? [{ kind: 'heading', text: 'SCOUTED FOR YOU · sign at the ask, no bidding' } as const]
        : []),
      ...table.scouted.map((row) => ({ kind: 'row', row }) as const),
      { kind: 'heading', text: `PUBLIC LIST · ${String(table.publicList.length)} free agents` },
      ...table.publicList.map((row) => ({ kind: 'row', row }) as const),
    ]),
  );
  drawFooter(context, ui);
  layer.add(addPanel(scene, DETAIL.left, CONTENT.top, DETAIL.width, CONTENT.bottom - CONTENT.top));
  const selected = all.find((row) => row.unit.id === ui.selected);
  if (selected === undefined) {
    layer.add(
      addBody(
        scene,
        DETAIL.left + 20,
        CONTENT.top + 20,
        'Pick a unit in the table to see it up close and bid on it.',
        16,
        UI.textMuted,
        DETAIL.width - 40,
      ),
    );
  } else {
    drawDetail(context, ui, selected);
  }
}

/** Splits the lines into pages; the page is kept in range as the list changes. */
function pageOf(
  ui: MarketUi,
  lines: readonly Line[],
): { lines: readonly Line[]; page: number; pages: number } {
  const pages = Math.max(1, Math.ceil(lines.length / TABLE.rows));
  ui.page = Math.min(ui.page, pages - 1);
  return {
    lines: lines.slice(ui.page * TABLE.rows, (ui.page + 1) * TABLE.rows),
    page: ui.page,
    pages,
  };
}

function drawFilters(context: TabContext, ui: MarketUi): void {
  const { scene, layer } = context;
  const chip = (
    x: number,
    label: string,
    chosen: boolean,
    pick: () => void,
    target: string,
    width = 74,
  ): void => {
    const button = addButton(
      scene,
      x,
      173,
      label,
      () => {
        pick();
        ui.page = 0;
        context.refresh();
      },
      {
        width,
        height: 28,
        fontSize: 13,
        plain: true,
        fill: chosen ? UI.button : UI.panelEdge,
        textColour: chosen ? UI.textDark : UI.text,
        target,
      },
    );
    layer.add(button.container);
  };
  chip(
    TABLE.left + 48,
    'ALL',
    ui.role === 'all',
    () => {
      ui.role = 'all';
      ui.archetype = null;
    },
    'market-filter-all',
    60,
  );
  chip(
    TABLE.left + 112,
    'MCS',
    ui.role === 'mc',
    () => {
      ui.role = 'mc';
      ui.archetype = null;
    },
    'market-filter-mc',
    60,
  );
  chip(
    TABLE.left + 186,
    'SUPPORT',
    ui.role === 'support',
    () => {
      ui.role = 'support';
      ui.archetype = null;
    },
    'market-filter-support',
    80,
  );
  const archetypes: readonly ArchetypeId[] =
    ui.role === 'mc' ? MC_ARCHETYPE_IDS : ui.role === 'support' ? SUPPORT_ARCHETYPE_IDS : [];
  archetypes.forEach((archetype, index) => {
    chip(
      TABLE.left + 280 + index * 92,
      ARCHETYPES[archetype].name.toUpperCase(),
      ui.archetype === archetype,
      () => {
        ui.archetype = ui.archetype === archetype ? null : archetype;
      },
      `market-filter-${archetype}`,
      88,
    );
  });
  const scout = addButton(
    scene,
    TABLE.left + TABLE.width - 70,
    173,
    `SCOUT · ${String(TUNABLES.SCOUT_COST)} g`,
    () => {
      const refusal = context.controller.scout();
      if (refusal === null)
        context.say(
          `Scouted ${String(TUNABLES.SCOUT_COUNT)} units just for you. They vanish at lock-in.`,
          'good',
        );
      else context.say(problemText(refusal), 'bad');
    },
    { width: 120, height: 28, fontSize: 13, plain: true, target: 'market-scout' },
  );
  layer.add(scout.container);
}

function drawHeader(context: TabContext, ui: MarketUi): void {
  const { scene, layer } = context;
  for (const column of COLUMNS) {
    const sorted = column.key !== null && ui.sort.key === column.key;
    const label = `${column.label}${sorted ? (ui.sort.descending ? ' ▼' : ' ▲') : ''}`;
    const text = addBody(
      scene,
      TABLE.left + column.x,
      TABLE.top,
      label,
      11,
      sorted ? UI.textGold : UI.textMuted,
    ).setFontStyle('bold');
    layer.add(text);
    const key = column.key;
    if (key === null) continue;
    text.setInteractive({ useHandCursor: true });
    text.on(Phaser.Input.Events.POINTER_UP, () => {
      ui.sort = {
        key,
        descending:
          ui.sort.key === key
            ? !ui.sort.descending
            : key !== 'name' && key !== 'type' && key !== 'abilities',
      };
      context.refresh();
    });
    registerTarget(`market-sort-${key}`, text);
  }
}

function drawLines(
  context: TabContext,
  ui: MarketUi,
  paged: { lines: readonly Line[]; page: number; pages: number },
): void {
  const { scene, layer } = context;
  paged.lines.forEach((line, index) => {
    const y = TABLE.top + 20 + index * TABLE.rowHeight;
    if (line.kind === 'heading') {
      layer.add(
        addBody(scene, TABLE.left + 10, y + 8, line.text, 13, UI.textGold).setFontStyle('bold'),
      );
      return;
    }
    drawRow(context, ui, line.row, y);
  });
  if (paged.pages > 1) {
    const y = TABLE.top + 20 + TABLE.rows * TABLE.rowHeight + 8;
    layer.add(
      addBody(
        scene,
        TABLE.left + 370,
        y,
        `page ${String(paged.page + 1)} / ${String(paged.pages)}`,
        13,
        UI.textMuted,
      ),
    );
    const pageButton = (x: number, label: string, delta: number, target: string): void => {
      const button = addButton(
        scene,
        x,
        y + 9,
        label,
        () => {
          ui.page = Math.max(0, Math.min(paged.pages - 1, ui.page + delta));
          context.refresh();
        },
        { width: 44, height: 26, fontSize: 14, plain: true, target },
      );
      button.setEnabled(ui.page + delta >= 0 && ui.page + delta < paged.pages);
      layer.add(button.container);
    };
    pageButton(TABLE.left + 330, '◀', -1, 'market-page-prev');
    pageButton(TABLE.left + 490, '▶', 1, 'market-page-next');
  }
}

function drawRow(context: TabContext, ui: MarketUi, row: MarketRow, y: number): void {
  const { scene, layer } = context;
  const { unit } = row;
  const chosen = ui.selected === unit.id;
  const background = scene.add.graphics();
  background.fillStyle(
    chosen ? UI.panelEdge : row.scouted ? 0x24403a : UI.panelLight,
    chosen ? 1 : 0.6,
  );
  background.fillRoundedRect(TABLE.left + 4, y, TABLE.width - 8, TABLE.rowHeight - 3, 6);
  layer.add(background);
  const hit = scene.add
    .zone(
      TABLE.left + TABLE.width / 2,
      y + TABLE.rowHeight / 2 - 1,
      TABLE.width - 8,
      TABLE.rowHeight - 3,
    )
    .setInteractive({ useHandCursor: true });
  hit.on(Phaser.Input.Events.POINTER_UP, () => {
    ui.selected = unit.id;
    ui.amount = row.bid ?? row.ask;
    context.refresh();
  });
  registerTarget(`market-unit-${unit.id}`, hit);
  layer.add(hit);
  layer.add(
    addUnitFigure(scene, TABLE.left + 22, y + TABLE.rowHeight - 3, unit, FREE_AGENT_OUTFIT, {
      nameplate: false,
      scale: 0.2,
    }).container,
  );
  const x = (column: number): number => TABLE.left + (COLUMNS[column]?.x ?? 0);
  const cell = (column: number, text: string, colour: string = UI.text, bold = false): void => {
    const body = addBody(scene, x(column), y + 7, text, 13, colour);
    if (bold) body.setFontStyle('bold');
    layer.add(fitWidth(body, COLUMNS[column]?.width ?? 60));
  };
  cell(1, unit.stageName, UI.text, true);
  layer.add(addBadge(scene, x(2) + 9, y + 14, unit.archetype, PAPER, 9));
  layer.add(
    fitWidth(
      addBody(scene, x(2) + 22, y + 7, ARCHETYPES[unit.archetype].name, 13),
      (COLUMNS[2]?.width ?? 60) - 22,
    ),
  );
  cell(3, statsText(unit), UI.text, true);
  cell(4, unit.abilities.map((learned) => ABILITIES[learned.id].name).join(', '));
  cell(5, `${String(unit.age)} (${String(row.seasonsLeft)})`, row.farewell ? UI.textBad : UI.text);
  cell(6, String(row.ask), UI.textGold, true);
  cell(7, String(row.salary));
  cell(8, row.scouted ? 'SIGN' : row.bid === null ? '' : String(row.bid), UI.textGood, true);
}

function drawFooter(context: TabContext, ui: MarketUi): void {
  const { scene, layer, state } = context;
  const bidding = biddingView(state);
  const y = CONTENT.bottom - 34;
  const bids = draftBids(state, ui);
  const wallet = walletView(state);
  const total = bids.reduce((sum, bid) => sum + bid.amount, 0);
  if (bidding.kind !== 'open') {
    layer.add(
      addBody(
        scene,
        TABLE.left + 16,
        y,
        'Bidding is over for this round. You can still scout and sign scouted units.',
        14,
        UI.textMuted,
      ),
    );
    return;
  }
  if (bidding.placed && state.sitting !== null) {
    // In a sitting the reveal waits for everyone; a second submit would replace the bids.
    const waiting = state.sitting.waitingFor;
    const line = `Your bids for round ${String(bidding.round)} are in.${waiting.length > 0 ? ` Waiting for ${waiting.join(', ')}.` : ''}`;
    layer.add(addBody(scene, TABLE.left + 16, y, line, 14, UI.textGood, 760));
    return;
  }
  const summary =
    bids.length === 0
      ? `Bidding round ${String(bidding.round)} of ${String(bidding.of)}: no bids yet. Pass, or pick units and bid.`
      : `Round ${String(bidding.round)}/${String(bidding.of)}: ${String(bids.length)} bid${bids.length === 1 ? '' : 's'}, ${String(total)} g · payroll ${String(wallet.payroll)} g · wallet ${String(wallet.wallet)} g`;
  layer.add(addBody(scene, TABLE.left + 16, y, summary, 14, UI.text, 560));
  const submit = addButton(
    scene,
    TABLE.left + TABLE.width - 110,
    y + 10,
    bids.length === 0 ? 'PASS' : 'SUBMIT BIDS',
    () => {
      // Clear the draft first: a successful bid redraws the hub at once.
      const draft = new Map(ui.draft);
      const selected = ui.selected;
      ui.draft.clear();
      ui.selected = null;
      const refusal = context.controller.bid(bids);
      if (refusal !== null) {
        for (const [unitId, amount] of draft) ui.draft.set(unitId, amount);
        ui.selected = selected;
        context.say(problemText(refusal), 'bad');
        return;
      }
      const after = context.controller.state();
      context.say(
        after.sitting === null ? awardLines(after).join(' ') : 'Your bids are in.',
        'good',
      );
    },
    {
      width: 190,
      height: 44,
      fontSize: 18,
      fill: bids.length === 0 ? UI.panelEdge : UI.button,
      target: 'market-submit',
    },
  );
  layer.add(submit.container);
}

function drawDetail(context: TabContext, ui: MarketUi, row: MarketRow): void {
  const { scene, layer, state } = context;
  const { unit } = row;
  const left = DETAIL.left + 18;
  const width = DETAIL.width - 36;
  layer.add(
    addUnitFigure(scene, left + 60, CONTENT.top + 170, unit, FREE_AGENT_OUTFIT, {
      nameplate: false,
      scale: 1.1,
    }).container,
  );
  layer.add(
    fitWidth(
      addHeading(
        scene,
        left + 130,
        CONTENT.top + 16,
        unit.stageName.toUpperCase(),
        22,
        UI.textGold,
      ),
      width - 130,
    ),
  );
  const archetype = ARCHETYPES[unit.archetype];
  layer.add(addBadge(scene, left + 142, CONTENT.top + 60, unit.archetype, PAPER, 11));
  layer.add(addBody(scene, left + 160, CONTENT.top + 50, archetype.name, 16).setFontStyle('bold'));
  layer.add(
    addBody(
      scene,
      left + 130,
      CONTENT.top + 76,
      archetype.personality,
      13,
      UI.textMuted,
      width - 130,
    ),
  );
  const stats =
    unit.role === 'mc' ? `FLOW ${String(unit.flow)}   CONF ${String(unit.confidence)}` : 'SUPPORT';
  layer.add(addBody(scene, left + 130, CONTENT.top + 118, stats, 17, UI.text).setFontStyle('bold'));
  const age = `Age ${String(unit.age)} · ${row.farewell ? 'farewell tour!' : `${String(row.seasonsLeft)} seasons left`} · ${String(unit.xp)} xp`;
  layer.add(
    addBody(
      scene,
      left + 130,
      CONTENT.top + 146,
      age,
      13,
      row.farewell ? UI.textBad : UI.text,
      width - 130,
    ),
  );
  let y = CONTENT.top + 190;
  for (const learned of unit.abilities) {
    const name = `${ABILITIES[learned.id].name}${unit.role === 'support' ? ` · power ${String(learned.power)}` : ''}`;
    layer.add(addBody(scene, left, y, name, 15, UI.textGold).setFontStyle('bold'));
    const text = addBody(scene, left, y + 20, abilityText(learned), 13, UI.text, width);
    layer.add(text);
    y += 26 + text.height;
  }
  const { record } = unit;
  layer.add(
    addBody(
      scene,
      left,
      y + 4,
      `Record: ${String(record.battles)} battles, ${String(record.wins)} wins, ${String(record.barsLanded)} bars, ${String(record.chokes)} chokes`,
      13,
      UI.textMuted,
      width,
    ),
  );
  layer.add(
    addBody(
      scene,
      left,
      y + 26,
      `Ask ${String(row.ask)} g · salary ${String(row.salary)} g per round`,
      15,
    ).setFontStyle('bold'),
  );
  if (row.scouted) {
    drawSign(context, row);
  } else if (biddingView(state).kind === 'open') {
    drawBidInput(context, ui, row);
  }
}

function drawSign(context: TabContext, row: MarketRow): void {
  const sign = addButton(
    context.scene,
    DETAIL.left + DETAIL.width / 2,
    CONTENT.bottom - 40,
    `SIGN FOR ${String(row.ask)} g`,
    () => {
      const refusal = context.controller.signScouted(row.unit.id);
      if (refusal === null) context.say(`${row.unit.stageName} signed!`, 'good');
      else context.say(problemText(refusal), 'bad');
    },
    { width: 260, height: 50, fontSize: 20, target: 'market-sign' },
  );
  context.layer.add(sign.container);
}

function drawBidInput(context: TabContext, ui: MarketUi, row: MarketRow): void {
  const { scene, layer } = context;
  const y = CONTENT.bottom - 96;
  const centre = DETAIL.left + DETAIL.width / 2;
  ui.amount = Math.max(row.ask, ui.amount);
  layer.add(
    addBody(scene, DETAIL.left + 18, y - 34, 'YOUR SEALED BID', 13, UI.textMuted).setFontStyle(
      'bold',
    ),
  );
  const step = (label: string, delta: number, target: string): void => {
    const button = addButton(
      scene,
      centre + (delta < 0 ? -110 : 110),
      y,
      label,
      () => {
        ui.amount = Math.max(row.ask, ui.amount + delta);
        context.refresh();
      },
      { width: 54, height: 44, fontSize: 24, target },
    );
    layer.add(button.container);
  };
  step('−', -1, 'market-bid-minus');
  step('+', 1, 'market-bid-plus');
  layer.add(
    scene.add
      .text(centre, y, `${String(ui.amount)} g`, {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '30px',
        color: UI.textGold,
      })
      .setOrigin(0.5),
  );
  const bidding = row.bid !== null;
  const place = addButton(
    scene,
    centre - (bidding ? 70 : 0),
    y + 58,
    bidding ? 'UPDATE BID' : 'ADD BID',
    () => {
      const problem = draftProblem(context.state, ui, { unitId: row.unit.id, amount: ui.amount });
      if (problem !== null) {
        context.say(problemText(problem), 'bad');
        return;
      }
      ui.draft.set(row.unit.id, ui.amount);
      context.say(
        `Bid of ${String(ui.amount)} g on ${row.unit.stageName} added. Submit your bids when ready.`,
        'good',
      );
      context.refresh();
    },
    { width: bidding ? 150 : 200, height: 44, fontSize: 18, target: 'market-add-bid' },
  );
  layer.add(place.container);
  if (bidding) {
    const remove = addButton(
      scene,
      centre + 90,
      y + 58,
      'REMOVE',
      () => {
        ui.draft.delete(row.unit.id);
        context.refresh();
      },
      { width: 130, height: 44, fontSize: 18, fill: UI.panelEdge, target: 'market-remove-bid' },
    );
    layer.add(remove.container);
  }
}
