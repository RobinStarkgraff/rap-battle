/**
 * The lobby of a sitting (§7 League state and hosting): the room code to read out, who is
 * here with which crew, and the host's Start round button.
 */

import Phaser from 'phaser';
import { addBackdrop } from '../art/bake';
import { letteringStyle } from '../art/lettering';
import { drawLogo } from '../art/logos';
import { circle } from '../art/pen';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../config';
import { CREW_COLOUR_HEX, INK, UI } from '../palette';
import { problemText } from '../text';
import { addButton } from '../ui/button';
import { addBody, addHeading, addPanel } from '../ui/panel';
import { registerTarget } from '../ui/targets';
import type { PlayerStatus } from '../hub/types';
import type { LobbyController, LobbyInfo, LobbySeat, LobbyState } from './types';
import { awayLines } from './view';

export interface LobbySceneData {
  readonly controller: LobbyController;
}

const SEAT_TOP = 300;
const SEAT_HEIGHT = 46;
/** The most seats listed; a bigger sitting shows how many more there are. */
const SEATS_SHOWN = 8;

const STATUS_WORDS: Readonly<Record<PlayerStatus, string>> = {
  bidding: 'BIDDING',
  bidIn: 'BIDS IN',
  shopping: 'SHOPPING',
  lockedIn: 'LOCKED IN',
  left: 'LEFT',
};

const INFO: Readonly<Record<LobbyInfo, string>> = {
  roundRunning: 'A round is being played.',
  watching: 'A round is being played without your crew. You play from the next round.',
  needCrew: 'Found your crew to play in this league.',
};

export class LobbyScene extends Phaser.Scene {
  static readonly KEY = 'lobby';

  private controller!: LobbyController;
  private layer: Phaser.GameObjects.Container | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor() {
    super(LobbyScene.KEY);
  }

  create(data: LobbySceneData): void {
    this.controller = data.controller;
    addBackdrop(this, { width: DESIGN_WIDTH, height: DESIGN_HEIGHT, groundY: 560, seed: 61 });
    addPanel(this, 40, 30, 760, 660);
    addPanel(this, 830, 90, 420, 350);
    this.add.text(
      70,
      50,
      'THE SITTING',
      letteringStyle(40, { colour: UI.textGold, align: 'left' }),
    );
    this.unsubscribe = this.controller.subscribe(() => {
      if (this.controller.isOpen()) this.redraw();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribe?.();
      this.unsubscribe = null;
      this.layer = null;
    });
    this.redraw();
  }

  private redraw(): void {
    this.layer?.destroy();
    const layer = this.add.container(0, 0);
    this.layer = layer;
    const state = this.controller.state();
    this.drawCode(layer, state);
    layer.add(addHeading(this, 70, SEAT_TOP - 40, 'AT THE SITTING'));
    state.seats.slice(0, SEATS_SHOWN).forEach((seat, index) => {
      this.drawSeat(layer, seat, index);
    });
    const more = state.seats.length - SEATS_SHOWN;
    if (more > 0) {
      const y = SEAT_TOP + SEATS_SHOWN * SEAT_HEIGHT + 4;
      layer.add(addBody(this, 80, y, `and ${String(more)} more`, 16, UI.textMuted));
    }
    this.drawActions(layer, state);
    this.drawAway(layer, state);
  }

  private drawCode(layer: Phaser.GameObjects.Container, state: LobbyState): void {
    layer.add(addHeading(this, 70, 120, 'ROOM CODE'));
    if (state.code === null) {
      const waiting = state.role === 'host' ? 'Opening the room…' : 'Connecting…';
      layer.add(addBody(this, 70, 156, waiting, 22, UI.textMuted));
      return;
    }
    const code = this.add.text(70, 146, state.code, letteringStyle(56, { align: 'left' }));
    // The code's own name lets browser tests read it (T-029).
    registerTarget(`lobby-code-${state.code}`, code);
    layer.add(code);
    const hint =
      state.role === 'host'
        ? 'Friends pick JOIN A SITTING on the title screen and type this code.'
        : state.phase === 'open'
          ? 'You are in. The host starts the round.'
          : 'Not connected.';
    layer.add(addBody(this, 290, 166, hint, 15, UI.textMuted, 480));
  }

  private drawSeat(layer: Phaser.GameObjects.Container, seat: LobbySeat, index: number): void {
    const y = SEAT_TOP + index * SEAT_HEIGHT;
    const pen = this.add.graphics();
    pen.fillStyle(seat.isYou ? UI.panelEdge : UI.panelLight, 1);
    pen.fillRoundedRect(70, y, 700, SEAT_HEIGHT - 6, 10);
    layer.add(pen);
    const middle = y + (SEAT_HEIGHT - 6) / 2;
    if (seat.crew === null) {
      circle(pen, 100, middle, 16, UI.panel, INK);
    } else {
      const main = CREW_COLOUR_HEX[seat.crew.mainColour];
      const trim = CREW_COLOUR_HEX[seat.crew.trimColour];
      circle(pen, 100, middle, 16, INK);
      drawLogo(pen, seat.crew.logo, 100, middle, 13, main, trim);
    }
    const name = seat.crew?.name ?? 'No crew yet';
    const label = addBody(
      this,
      130,
      middle - 12,
      name,
      20,
      seat.crew === null ? UI.textMuted : UI.text,
    );
    label.setFontStyle('bold');
    registerTarget(`lobby-seat-${String(index)}`, label);
    layer.add(label);
    const tags = [
      seat.status === null ? null : STATUS_WORDS[seat.status],
      seat.isHost ? 'HOST' : null,
      seat.isYou ? 'YOU' : null,
    ].filter((tag) => tag !== null);
    if (tags.length > 0) {
      layer.add(addBody(this, 760, middle - 9, tags.join(' · '), 16, UI.textGold).setOrigin(1, 0));
    }
  }

  private drawActions(layer: Phaser.GameObjects.Container, state: LobbyState): void {
    const x = 1040;
    if (state.notice !== null) {
      layer.add(
        addBody(this, x, 120, problemText(state.notice), 18, UI.textBad, 400)
          .setOrigin(0.5, 0)
          .setAlign('center')
          .setBackgroundColor('#1b1b2f')
          .setPadding(10, 6, 10, 6),
      );
    }
    if (state.info !== null) {
      layer.add(
        addBody(this, x, 190, INFO[state.info], 17, UI.text, 380)
          .setOrigin(0.5, 0)
          .setAlign('center'),
      );
    } else if (state.role === 'guest' && state.phase === 'open') {
      layer.add(
        addBody(this, x, 190, 'Waiting for the host to start the round.', 17, UI.text, 380)
          .setOrigin(0.5, 0)
          .setAlign('center'),
      );
    }
    if (state.role === 'host') {
      const start = addButton(
        this,
        x,
        265,
        'START ROUND',
        () => {
          this.controller.start();
        },
        { width: 300, height: 64, target: 'lobby-start' },
      );
      start.setEnabled(state.canStart);
      layer.add(start.container);
      const timer = addButton(
        this,
        x,
        335,
        state.timerSeconds === null
          ? 'SHOP TIMER: OFF'
          : `SHOP TIMER: ${String(state.timerSeconds)} S`,
        () => {
          this.controller.toggleTimer();
        },
        { width: 300, height: 40, fontSize: 18, fill: UI.highlight, target: 'lobby-timer' },
      );
      layer.add(timer.container);
    } else {
      const timer =
        state.timerSeconds === null
          ? 'No shop timer: take your time.'
          : `Shop timer: ${String(state.timerSeconds)} s per bidding round and for the lineup.`;
      layer.add(
        addBody(this, x, 320, timer, 15, UI.textMuted, 380).setOrigin(0.5, 0).setAlign('center'),
      );
    }
    const leave = addButton(
      this,
      x,
      400,
      state.role === 'host' ? 'CLOSE SITTING' : 'LEAVE',
      () => {
        this.controller.leave();
      },
      { width: 240, height: 48, fill: UI.panelEdge, target: 'lobby-leave' },
    );
    layer.add(leave.container);
  }

  /** What happened while the player was away (§7 AI managers). */
  private drawAway(layer: Phaser.GameObjects.Container, state: LobbyState): void {
    if (state.away === null) return;
    layer.add(addPanel(this, 830, 455, 420, 245, UI.panelLight));
    layer.add(addHeading(this, 850, 468, 'WHILE YOU WERE AWAY', 18, UI.textGold));
    awayLines(state.away).forEach((line, index) => {
      layer.add(addBody(this, 850, 500 + index * 21, line, 15, UI.text, 380));
    });
  }
}
