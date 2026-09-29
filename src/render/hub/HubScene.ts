/**
 * The home hub (§11 Screens, D-050): the crew's header with wallet, payroll, season and next
 * opponent, the tabs, and the Lock in button once the bidding has ended.
 */

import Phaser from 'phaser';
import { SILENT_SOUND, soundOf, type SoundEngine } from '../audio';
import { addBackdrop } from '../art/bake';
import { letteringStyle } from '../art/lettering';
import { drawLogo } from '../art/logos';
import { circle, roundedRect } from '../art/pen';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../config';
import { CREW_COLOUR_HEX, INK, UI } from '../palette';
import { problemText } from '../text';
import { addButton } from '../ui/button';
import { addBody, fitWidth } from '../ui/panel';
import { renderHallTab } from './hallTab';
import { createHallUi, type HallUi } from './hallView';
import { renderHomeTab } from './homeTab';
import { createLeagueUi, renderLeagueTab, type LeagueUi } from './leagueTab';
import { createLineupUi, renderLineupTab, type LineupUi } from './lineupTab';
import { createMarketUi, renderMarketTab, type MarketUi } from './marketTab';
import type { TabContext } from './tab';
import { onboardingHint, type HintId } from './hints';
import { withShopSounds } from './sounds';
import { HUB_TABS, type HubController, type HubState, type HubTab } from './types';
import { biddingView, nextOpponent, playerShop, seasonView, walletView } from './view';

export interface HubSceneData {
  readonly controller: HubController;
}

const TAB_LABELS: Readonly<Record<HubTab, string>> = {
  home: 'HOME',
  market: 'MARKET',
  lineup: 'LINEUP',
  league: 'LEAGUE',
  hall: 'HALL OF FAME',
};

const TONES = { good: UI.textGood, bad: UI.textBad, info: UI.text } as const;

/** Hints the player closed; they stay closed until the page is reloaded. */
const CLOSED_HINTS = new Set<HintId>();

export class HubScene extends Phaser.Scene {
  static readonly KEY = 'hub';

  private controller!: HubController;
  private tab: HubTab = 'home';
  private layer: Phaser.GameObjects.Container | null = null;
  private notice!: Phaser.GameObjects.Text;
  private leagueUi: LeagueUi = createLeagueUi();
  private market: MarketUi = createMarketUi();
  private lineup: LineupUi = createLineupUi();
  private hall: HallUi = createHallUi();
  private unsubscribe: (() => void) | null = null;
  /** The shop timer's countdown under the Lock in button (a sitting with the timer on). */
  private countdown: Phaser.GameObjects.Text | null = null;
  /** How many nudges were shown already. */
  private nudgesShown = 0;
  private audio: SoundEngine = SILENT_SOUND;
  /** The bidding results the signing sound was played for. */
  private awardsHeard: HubState['lastAwards'] = null;

  constructor() {
    super(HubScene.KEY);
  }

  create(data: HubSceneData): void {
    this.audio = soundOf(this);
    this.controller = withShopSounds(data.controller, this.audio);
    this.awardsHeard = data.controller.state().lastAwards;
    this.tab = 'home';
    this.leagueUi = createLeagueUi();
    this.market = createMarketUi();
    this.lineup = createLineupUi();
    this.hall = createHallUi();
    addBackdrop(this, { width: DESIGN_WIDTH, height: DESIGN_HEIGHT, groundY: 520, seed: 3 });
    const shade = this.add.graphics();
    shade.fillStyle(UI.shade, 0.35);
    shade.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    this.notice = addBody(this, DESIGN_WIDTH / 2, 136, '', 16)
      .setOrigin(0.5)
      .setDepth(900);
    this.unsubscribe = this.controller.subscribe(() => {
      if (this.controller.isOpen()) this.redraw();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribe?.();
      this.unsubscribe = null;
      this.layer = null;
      this.countdown = null;
    });
    this.nudgesShown = 0;
    this.countdown = addBody(this, 1140, 92, '', 16, UI.textGold)
      .setOrigin(0.5, 0)
      .setFontStyle('bold')
      .setDepth(900);
    this.time.addEvent({
      delay: 250,
      loop: true,
      callback: () => {
        this.tick();
      },
    });
    this.redraw();
  }

  /** Counts the shop timer down, from the end time the hub state gives. */
  private tick(): void {
    if (this.countdown === null || !this.controller.isOpen()) return;
    const endsAt = this.controller.state().sitting?.timerEndsAt ?? null;
    if (endsAt === null) {
      this.countdown.setText('');
      return;
    }
    const seconds = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
    const minutes = Math.floor(seconds / 60);
    this.countdown
      .setText(`TIMER ${String(minutes)}:${String(seconds % 60).padStart(2, '0')}`)
      .setColor(seconds <= 15 ? UI.textBad : UI.textGold);
  }

  /** Shows a nudge from another player once. */
  private showNudge(): void {
    const nudge = this.controller.state().sitting?.nudge ?? null;
    if (nudge === null || nudge.count <= this.nudgesShown) return;
    this.nudgesShown = nudge.count;
    this.audio.play('nudge');
    this.notice.setText(`${nudge.from} nudges you: the crews are waiting!`).setColor(UI.textGold);
  }

  /** A cash register when a bidding round is revealed and the player won someone. */
  private hearAwards(): void {
    const state = this.controller.state();
    if (state.lastAwards === this.awardsHeard) return;
    this.awardsHeard = state.lastAwards;
    if (state.lastAwards?.some((award) => award.crewId === state.crewId) === true) {
      this.audio.play('sign');
    }
  }

  private redraw(): void {
    this.showNudge();
    this.hearAwards();
    this.tick();
    this.layer?.destroy();
    const layer = this.add.container(0, 0);
    this.layer = layer;
    this.drawHeader(layer);
    this.drawTabs(layer);
    const context: TabContext = {
      scene: this,
      layer,
      state: this.controller.state(),
      controller: this.controller,
      say: (message, tone = 'info') => {
        this.notice.setText(message).setColor(TONES[tone]);
      },
      refresh: () => {
        this.redraw();
      },
      open: (tab) => {
        this.tab = tab;
        this.notice.setText('');
        this.redraw();
      },
    };
    switch (this.tab) {
      case 'home':
        renderHomeTab(context);
        break;
      case 'market':
        renderMarketTab(context, this.market);
        break;
      case 'lineup':
        renderLineupTab(context, this.lineup);
        break;
      case 'league':
        renderLeagueTab(context, this.leagueUi);
        break;
      case 'hall':
        renderHallTab(context, this.hall);
        break;
    }
    this.drawHint(layer);
  }

  private drawHeader(layer: Phaser.GameObjects.Container): void {
    const state = this.controller.state();
    const crew = playerShop(state).crew;
    const main = CREW_COLOUR_HEX[crew.identity.mainColour];
    const trim = CREW_COLOUR_HEX[crew.identity.trimColour];
    const pen = this.add.graphics();
    roundedRect(pen, 12, 10, 380, 76, 14, main, INK);
    circle(pen, 52, 48, 28, INK);
    drawLogo(pen, crew.identity.logo, 52, 48, 22, main, trim);
    roundedRect(pen, 404, 10, 610, 76, 14, UI.panel, INK);
    layer.add(pen);
    layer.add(
      fitWidth(
        this.add
          .text(92, 48, crew.identity.name.toUpperCase(), letteringStyle(26, { align: 'left' }))
          .setOrigin(0, 0.5),
        290,
      ),
    );
    const wallet = walletView(state);
    const season = seasonView(state);
    const opponent = nextOpponent(state);
    const cells: readonly [string, string][] = [
      ['WALLET', `${String(wallet.wallet)} g`],
      ['PAYROLL', `${String(wallet.payroll)} g`],
      ['SEASON', `${String(season.season)} · R${String(season.round)}/${String(season.rounds)}`],
      ['NEXT UP', opponent === null ? '—' : opponent.identity.name],
    ];
    const widths = [110, 110, 140, 230];
    let x = 420;
    cells.forEach(([label, value], index) => {
      layer.add(addBody(this, x, 20, label, 12, UI.textMuted).setFontStyle('bold'));
      layer.add(
        fitWidth(
          this.add.text(x, 38, value, letteringStyle(20, { align: 'left' })),
          (widths[index] ?? 100) - 12,
        ),
      );
      x += widths[index] ?? 100;
    });
    const bidding = biddingView(state);
    const lock = addButton(
      this,
      1140,
      48,
      bidding.kind === 'open'
        ? `BIDDING ${String(bidding.round)}/${String(bidding.of)}`
        : bidding.kind === 'lockedIn'
          ? 'LOCKED IN'
          : 'LOCK IN',
      () => {
        const refusal = this.controller.lockIn();
        if (refusal !== null) this.notice.setText(problemText(refusal)).setColor(UI.textBad);
      },
      {
        width: 220,
        height: 66,
        fontSize: 26,
        fill: UI.accent,
        hoverFill: UI.accentHover,
        target: 'hub-lock-in',
      },
    );
    lock.setEnabled(bidding.kind === 'ended');
    layer.add(lock.container);
    const quit = addButton(
      this,
      1262,
      106,
      '✕',
      () => {
        this.controller.quitToTitle();
      },
      {
        width: 30,
        height: 30,
        fontSize: 16,
        fill: UI.panelEdge,
        target: 'hub-quit',
      },
    );
    layer.add(quit.container);
  }

  /** An onboarding hint for the first rounds (T-056), beside the tab bar, until closed. */
  private drawHint(layer: Phaser.GameObjects.Container): void {
    const hint = onboardingHint(this.controller.state(), this.tab);
    if (hint === null || CLOSED_HINTS.has(hint.id)) return;
    const left = 872;
    const top = 90;
    const width = 368;
    const height = 58;
    const pen = this.add.graphics();
    roundedRect(pen, left, top, width, height, 8, UI.button, INK);
    const text = addBody(this, left + 10, top + 5, hint.text, 12, UI.textDark, width - 50)
      .setFontStyle('bold')
      .setLineSpacing(-1);
    const close = addButton(
      this,
      left + width - 20,
      top + 16,
      'OK',
      () => {
        CLOSED_HINTS.add(hint.id);
        this.redraw();
      },
      {
        width: 32,
        height: 22,
        fontSize: 11,
        plain: true,
        fill: UI.white,
        target: 'hub-hint-close',
      },
    );
    const note = this.add.container(0, 0, [pen, text, close.container]).setDepth(800);
    layer.add(note);
  }

  private drawTabs(layer: Phaser.GameObjects.Container): void {
    HUB_TABS.forEach((tab, index) => {
      const chosen = this.tab === tab;
      const button = addButton(
        this,
        100 + index * 170,
        110,
        TAB_LABELS[tab],
        () => {
          this.tab = tab;
          this.notice.setText('');
          this.redraw();
        },
        {
          width: 160,
          height: 34,
          fontSize: 16,
          fill: chosen ? UI.button : UI.panelEdge,
          textColour: chosen ? UI.text : UI.text,
          target: `tab-${tab}`,
        },
      );
      layer.add(button.container);
    });
  }
}
