/**
 * The hub's home tab (§11 Screens): the crew hanging out on the block, in lineup order, with
 * the round's report: upkeep, rookies, the bidding and the next opponent.
 */

import { MC_SLOTS, TUNABLES, type Crew, type Unit } from '../../core';
import { addBaked, bakeTexture } from '../art/bake';
import { drawBackdrop } from '../art/backdrop';
import { letteringStyle } from '../art/lettering';
import { drawLogo } from '../art/logos';
import { circle } from '../art/pen';
import { addUnitFigure } from '../art/unitFigure';
import { crewOutfit, CREW_COLOUR_HEX, INK, UI } from '../palette';
import { addButton } from '../ui/button';
import { addBody, addHeading, addPanel, fitWidth } from '../ui/panel';
import { CONTENT, type TabContext } from './tab';
import type { PlayerStatus } from './types';
import { awardLines, biddingView, nextOpponent, playerShop, standingOf } from './view';

const BLOCK = { width: 850, height: 540 };
const FEET_Y = CONTENT.top + 470;

export function renderHomeTab(context: TabContext): void {
  const { scene, layer, state } = context;
  const box = { width: BLOCK.width, height: BLOCK.height, originX: 0, originY: 0, resolution: 1 };
  const key = bakeTexture(scene, 'home-block', box, (pen) => {
    drawBackdrop(pen, {
      width: BLOCK.width,
      height: BLOCK.height,
      groundY: 400,
      seed: 21,
      boomboxX: 760,
    });
  });
  layer.add(addBaked(scene, CONTENT.left, CONTENT.top, key, box));
  drawCrew(context, playerShop(state).crew);
  drawSitting(context);
  drawReport(context);
}

const STATUS_WORDS: Readonly<Record<PlayerStatus, string>> = {
  bidding: 'BIDDING',
  bidIn: 'BIDS IN',
  shopping: 'SHOPPING',
  lockedIn: 'LOCKED IN',
  left: 'LEFT',
};

/**
 * In a sitting: everyone who shops this round and where they are, with a nudge for those the
 * round waits for (§7 Slow players), in a strip across the sky.
 */
function drawSitting(context: TabContext): void {
  const { scene, layer, state, controller } = context;
  const players = state.sitting?.players ?? [];
  if (players.length === 0) return;
  const width = Math.min(200, (BLOCK.width - 20) / players.length);
  players.forEach((player, index) => {
    const x = CONTENT.left + 10 + index * width;
    const y = CONTENT.top + 8;
    layer.add(addPanel(scene, x, y, width - 8, 58, player.isYou ? UI.panelEdge : UI.panel));
    layer.add(
      fitWidth(addBody(scene, x + 10, y + 6, player.name, 14).setFontStyle('bold'), width - 28),
    );
    const waiting = player.status === 'bidding' || player.status === 'shopping';
    const colour = player.status === 'left' ? UI.textBad : waiting ? UI.textGold : UI.textGood;
    layer.add(
      addBody(scene, x + 10, y + 30, STATUS_WORDS[player.status], 13, colour).setFontStyle('bold'),
    );
    if (waiting && !player.isYou) {
      const nudge = addButton(
        scene,
        x + width - 50,
        y + 38,
        'NUDGE',
        () => {
          controller.nudge(player.crewId);
          context.say(`You nudged ${player.name}.`);
        },
        { width: 70, height: 26, fontSize: 12, plain: true, target: `hub-nudge-${player.crewId}` },
      );
      layer.add(nudge.container);
    }
  });
}

/** The crew stands in lineup order: MCs, support, then the bench a little apart. */
function drawCrew(context: TabContext, crew: Crew): void {
  const { scene, layer } = context;
  const outfit = crewOutfit(crew.identity);
  const spots: { unit: Unit | null; label: string; x: number }[] = [
    ...crew.mcSlots.map((unit, index) => ({
      unit,
      label: (MC_SLOTS[index] ?? '').toUpperCase(),
      x: 90 + index * 100,
    })),
    ...crew.supportSlots.map((unit, index) => ({
      unit,
      label: `SUPPORT ${String(index + 1)}`,
      x: 400 + index * 100,
    })),
  ];
  crew.bench.forEach((unit, index) => spots.push({ unit, label: 'BENCH', x: 630 + index * 90 }));
  for (const spot of spots) {
    layer.add(
      addBody(scene, spot.x, FEET_Y - 190, spot.label, 13, UI.text)
        .setOrigin(0.5)
        .setFontStyle('bold')
        .setBackgroundColor('#1b1b2f')
        .setPadding(5, 2, 5, 2),
    );
    if (spot.unit === null) {
      const empty = scene.add.graphics();
      empty.lineStyle(3, 0xffffff, 0.6);
      empty.strokeRoundedRect(spot.x - 36, FEET_Y - 150, 72, 146, 14);
      layer.add(empty);
      layer.add(
        addBody(scene, spot.x, FEET_Y - 80, 'EMPTY', 14, UI.text)
          .setOrigin(0.5)
          .setFontStyle('bold'),
      );
    } else {
      layer.add(
        addUnitFigure(scene, spot.x, FEET_Y, spot.unit, outfit, {
          scale: spot.label === 'BENCH' ? 0.85 : 1,
        }).container,
      );
    }
  }
  if (spots.every((spot) => spot.unit === null)) {
    const call = addButton(
      scene,
      420,
      CONTENT.top + 90,
      'SIGN YOUR FIRST CREW IN THE MARKET',
      () => {
        context.open('market');
      },
      {
        width: 560,
        height: 54,
        fontSize: 20,
        target: 'home-to-market',
      },
    );
    layer.add(call.container);
  }
}

function drawReport(context: TabContext): void {
  const { scene, layer, state } = context;
  const left = CONTENT.left + BLOCK.width + 16;
  const width = CONTENT.right - left;
  layer.add(addPanel(scene, left, CONTENT.top, width, CONTENT.bottom - CONTENT.top));
  let y = CONTENT.top + 14;
  const line = (text: string, colour: string = UI.text, size = 15): void => {
    const body = addBody(scene, left + 16, y, text, size, colour, width - 32);
    layer.add(body);
    y += body.height + 6;
  };
  layer.add(addHeading(scene, left + 16, y, `ROUND ${String(state.round.round)}`, 24, UI.textGold));
  y += 38;
  const upkeep = state.start.upkeep.find((entry) => entry.crewId === state.crewId);
  if (upkeep === undefined) {
    line(
      state.round.round === 1
        ? `A new league! You start with ${String(TUNABLES.STARTING_GOLD)} gold.`
        : 'No upkeep for a new crew.',
    );
  } else {
    line(
      `Upkeep: +${String(upkeep.income)} gold${upkeep.income > TUNABLES.BASE_INCOME ? ' (with the win bonus)' : ''}.`,
    );
    if (upkeep.lostToCap > 0)
      line(
        `${String(upkeep.lostToCap)} gold lost to the wallet cap of ${String(TUNABLES.WALLET_CAP)}.`,
        UI.textBad,
      );
    for (const event of upkeep.events) {
      if (event.kind === 'gold')
        line(`Negotiator haggled +${String(event.amount)} gold.`, UI.textGood);
      if (event.kind === 'xp') line(`Studio time: +${String(event.amount)} xp.`, UI.textGood);
      if (event.kind === 'buff') line('Voice lessons: +confidence.', UI.textGood);
    }
  }
  if (state.start.rookies.length > 0)
    line(`${String(state.start.rookies.length)} rookies joined the market.`);
  y += 6;
  const bidding = biddingView(state);
  if (bidding.kind === 'open') {
    line(
      `Bidding round ${String(bidding.round)} of ${String(bidding.of)} is open.`,
      UI.textGold,
      17,
    );
    line(bidding.placed ? 'Your bids are in.' : 'Place your bids (or pass) in the Market.');
  } else if (bidding.kind === 'lockedIn') {
    line('You are locked in.', UI.textGold, 17);
  } else {
    line('Bidding is over: set your lineup, then LOCK IN.', UI.textGold, 17);
  }
  const waiting = state.sitting?.waitingFor ?? [];
  if (waiting.length > 0) line(`Waiting for ${waiting.join(', ')}.`, UI.textMuted);
  for (const crew of state.sitting?.left ?? []) {
    line(`${crew} left the sitting; their lineup is locked in.`, UI.textBad);
  }
  for (const award of awardLines(state)) line(award);
  const opponent = nextOpponent(state);
  if (opponent !== null)
    drawOpponent(context, opponent, left + 12, CONTENT.bottom - 150, width - 24);
}

function drawOpponent(
  context: TabContext,
  opponent: Crew,
  x: number,
  y: number,
  width: number,
): void {
  const { scene, layer, state } = context;
  const main = CREW_COLOUR_HEX[opponent.identity.mainColour];
  const pen = scene.add.graphics();
  pen.fillStyle(main, 1);
  pen.fillRoundedRect(x, y, width, 136, 12);
  pen.lineStyle(3, INK, 1);
  pen.strokeRoundedRect(x, y, width, 136, 12);
  circle(pen, x + 40, y + 50, 28, INK);
  drawLogo(
    pen,
    opponent.identity.logo,
    x + 40,
    y + 50,
    22,
    main,
    CREW_COLOUR_HEX[opponent.identity.trimColour],
  );
  layer.add(pen);
  layer.add(addBody(scene, x + 80, y + 14, 'NEXT OPPONENT', 12, UI.text).setFontStyle('bold'));
  layer.add(
    fitWidth(
      scene.add.text(
        x + 80,
        y + 32,
        opponent.identity.name.toUpperCase(),
        letteringStyle(20, { align: 'left' }),
      ),
      width - 92,
    ),
  );
  const standing = standingOf(state.league, opponent.id);
  const record =
    standing === null
      ? ''
      : `${String(standing.wins)}W ${String(standing.losses)}L · ${String(standing.points)} pts`;
  layer.add(addBody(scene, x + 80, y + 62, record, 14, UI.text).setFontStyle('bold'));
  const mcs = opponent.mcSlots.filter((unit) => unit !== null).map((unit) => unit.stageName);
  layer.add(
    addBody(
      scene,
      x + 16,
      y + 92,
      mcs.length === 0 ? 'No MCs yet.' : `MCs: ${mcs.join(', ')}`,
      13,
      UI.text,
      width - 32,
    ),
  );
}
