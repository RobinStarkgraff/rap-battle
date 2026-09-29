/**
 * The battle scene (§5 Pacing, §11 Battle, D-050): plays a battle's event log back as a side
 * view face-off. It only shows what the playback script says; it never decides anything.
 */

import Phaser from 'phaser';
import {
  activeUnits,
  createRng,
  TUNABLES,
  type BattleStyleId,
  type Crew,
  type Side,
  type Unit,
  type UnitId,
} from '../../core';
import {
  battleCue,
  battleShake,
  beatPattern,
  SILENT_SOUND,
  soundOf,
  type SoundEngine,
} from '../audio';
import { addBackdrop, addBaked, bakeTexture } from '../art/bake';
import { bodyStyle, letteringStyle } from '../art/lettering';
import { drawLogo } from '../art/logos';
import { circle, roundedRect } from '../art/pen';
import { addUnitFigure, type UnitFigure } from '../art/unitFigure';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../config';
import {
  ART,
  CREW_COLOUR_HEX,
  crewOutfit,
  HAIR_COLOURS,
  INK,
  SKIN_TONES,
  STREET,
  UI,
} from '../palette';
import { HUGE_HIT } from '../text';
import { addButton } from '../ui/button';
import { addSpeechBubble, popWord } from '../ui/bubble';
import {
  CROWD_Y,
  facing,
  halfLeft,
  HYPE_METER_Y,
  mcX,
  micX,
  STAGE_Y,
  STOOP_Y,
  supportX,
  WALL_FOOT_Y,
} from './layout';
import { confetti, flash, ring, sparks } from './effects';
import {
  buildPlayback,
  other,
  type Beat,
  type BeatAction,
  type Playback,
  type StageSnapshot,
} from './playback';

export interface BattleSceneData {
  /** The crews as they locked in; `a` is crew A of the battle. */
  readonly crews: Readonly<Record<Side, Crew>>;
  readonly events: Parameters<typeof buildPlayback>[2];
  readonly seed: number;
  /** The style the battle was simulated in (§5, §5.2). */
  readonly style: BattleStyleId;
  /** Called once the last beat has played. */
  readonly onDone: () => void;
}

interface Actor {
  readonly unit: Unit;
  readonly side: Side;
  readonly figure: UnitFigure;
  readonly stats: Phaser.GameObjects.Text | null;
}

const HYPE_SEGMENTS = 10;
const CROWD_SPACING = 30;
const CROWD_HEAD_BOX = { width: 40, height: 40, originX: 20, originY: 20 };

export class BattleScene extends Phaser.Scene {
  static readonly KEY = 'battle';

  private data_!: BattleSceneData;
  private playback!: Playback;
  private actors = new Map<UnitId, Actor>();
  private hypeMeters!: Record<Side, Phaser.GameObjects.Graphics>;
  private crowd: Record<Side, Phaser.GameObjects.Image[]> = { a: [], b: [] };
  private turnText!: Phaser.GameObjects.Text;
  /** Crowd vote: the verses each crew has won, under the turn. */
  private verseText!: Phaser.GameObjects.Text;
  private speed: 1 | 2 = 1;
  private audio: SoundEngine = SILENT_SOUND;
  /** Where the confetti flies; seeded, so a replay looks the same. */
  private fxRng = createRng(0);

  constructor() {
    super(BattleScene.KEY);
  }

  init(data: BattleSceneData): void {
    this.data_ = data;
    this.actors = new Map();
    this.crowd = { a: [], b: [] };
    this.speed = 1;
    this.fxRng = createRng(data.seed).fork('effects');
    const { a, b } = data.crews;
    this.playback = buildPlayback(
      { name: a.identity.name, lineup: a },
      { name: b.identity.name, lineup: b },
      data.events,
      data.seed,
    );
  }

  create(): void {
    this.time.timeScale = 1;
    this.tweens.timeScale = 1;
    this.drawStage();
    for (const side of ['a', 'b'] as const) {
      this.drawBanner(side);
      this.addCrew(side);
    }
    this.hypeMeters = { a: this.add.graphics(), b: this.add.graphics() };
    this.addCrowd();
    this.turnText = this.add.text(DESIGN_WIDTH / 2, 34, '', letteringStyle(30)).setOrigin(0.5);
    this.verseText = this.add
      .text(DESIGN_WIDTH / 2, 124, '', letteringStyle(20, { colour: UI.textGold }))
      .setOrigin(0.5);
    this.addSpeedButton();
    this.applySnapshot(this.playback.start, false);
    this.audio = soundOf(this);
    this.audio.startBeat(beatPattern(this.data_.seed));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.audio.stopBeat();
    });
    this.playBeat(0);
  }

  // --- Setting the stage -----------------------------------------------------------------

  private drawStage(): void {
    addBackdrop(this, {
      width: DESIGN_WIDTH,
      height: DESIGN_HEIGHT,
      groundY: WALL_FOOT_Y,
      seed: 1,
    });
    const pen = this.add.graphics();
    for (const side of ['a', 'b'] as const) {
      // The stoop the support units stand on.
      const left = side === 'a' ? 20 : DESIGN_WIDTH - 250;
      roundedRect(pen, left, STOOP_Y, 230, 40, 4, STREET.brickDark, INK);
      roundedRect(pen, left + (side === 'a' ? 0 : 30), STOOP_Y + 40, 200, 30, 4, STREET.brick, INK);
      // The mic stand.
      const x = micX(side);
      pen.lineStyle(5, INK, 1);
      pen.lineBetween(x, STAGE_Y - 2, x, STAGE_Y - 92);
      pen.lineBetween(x - 16, STAGE_Y - 2, x + 16, STAGE_Y - 2);
      circle(pen, x, STAGE_Y - 100, 9, ART.steel, INK);
    }
  }

  private drawBanner(side: Side): void {
    const crew = this.data_.crews[side];
    const width = 470;
    const left = side === 'a' ? 20 : DESIGN_WIDTH - 20 - width;
    const main = CREW_COLOUR_HEX[crew.identity.mainColour];
    const trim = CREW_COLOUR_HEX[crew.identity.trimColour];
    const pen = this.add.graphics();
    roundedRect(pen, left, 14, width, 62, 12, main, INK);
    const logoX = side === 'a' ? left + 38 : left + width - 38;
    circle(pen, logoX, 45, 25, INK);
    drawLogo(pen, crew.identity.logo, logoX, 45, 20, main, trim);
    const name = this.add
      .text(
        side === 'a' ? left + 74 : left + width - 74,
        45,
        crew.identity.name.toUpperCase(),
        letteringStyle(26),
      )
      .setOrigin(side === 'a' ? 0 : 1, 0.5);
    if (name.width > width - 100) name.setScale((width - 100) / name.width);
  }

  private addCrew(side: Side): void {
    const crew = this.data_.crews[side];
    const outfit = crewOutfit(crew.identity);
    const faceLeft = facing(side) === -1;
    for (const unit of activeUnits(crew)) {
      const x =
        unit.role === 'support' ? supportX(side, crew.supportSlots.indexOf(unit)) : mcX(side, 0);
      const y = unit.role === 'support' ? STOOP_Y : STAGE_Y;
      const figure = addUnitFigure(this, x, y, unit, outfit, {
        facing: faceLeft ? 'left' : 'right',
        scale: unit.role === 'support' ? 0.8 : 1,
      });
      const stats =
        unit.role === 'mc'
          ? this.add
              .text(0, -158, '', bodyStyle(13, { colour: UI.textDark, align: 'center' }))
              .setOrigin(0.5)
              .setFontStyle('bold')
              .setBackgroundColor(UI.text)
              .setPadding(6, 2, 6, 2)
          : null;
      if (stats !== null) figure.container.add(stats);
      this.actors.set(unit.id, { unit, side, figure, stats });
    }
  }

  private addCrowd(): void {
    const rng = createRng(this.data_.seed).fork('crowd');
    for (let x = 14; x < DESIGN_WIDTH; x += CROWD_SPACING) {
      const side: Side = x < DESIGN_WIDTH / 2 ? 'a' : 'b';
      const skin = rng.pick(SKIN_TONES);
      const hair = rng.pick(HAIR_COLOURS);
      const key = bakeTexture(
        this,
        `crowd:${String(skin)}:${String(hair)}`,
        CROWD_HEAD_BOX,
        (pen) => {
          circle(pen, 0, 0, 17, skin, INK);
          pen.fillStyle(hair, 1);
          pen.fillEllipse(0, -11, 30, 14);
        },
      );
      const head = addBaked(
        this,
        x + rng.int(-5, 5),
        CROWD_Y + rng.int(-4, 8),
        key,
        CROWD_HEAD_BOX,
      );
      this.crowd[side].push(head);
    }
  }

  private addSpeedButton(): void {
    const button = addButton(
      this,
      DESIGN_WIDTH / 2,
      86,
      'SPEED 1×',
      () => {
        this.speed = this.speed === 1 ? 2 : 1;
        this.time.timeScale = this.speed;
        this.tweens.timeScale = this.speed;
        button.setLabel(`SPEED ${String(this.speed)}×`);
      },
      { width: 130, height: 36, fontSize: 16, target: 'battle-speed' },
    );
  }

  // --- Playing beats ---------------------------------------------------------------------

  private playBeat(index: number): void {
    const beat = this.playback.beats[index];
    if (beat === undefined) {
      this.data_.onDone();
      return;
    }
    this.showBeat(beat);
    this.time.delayedCall(beat.duration, () => {
      this.playBeat(index + 1);
    });
  }

  private showBeat(beat: Beat): void {
    const { action, after, duration } = beat;
    this.playSound(action);
    switch (action.kind) {
      case 'intro':
        this.intro(action.opener, duration);
        break;
      case 'turn':
        this.turnText.setText(
          after.verse === 0
            ? `TURN ${String(action.turn)}`
            : `VERSE ${String(after.verse)} · TURN ${String(action.turn)}`,
        );
        this.pulse(this.actors.get(after.stage[action.side][0] ?? '')?.figure.body, 1.06);
        break;
      case 'bar':
        this.lunge(action.unitId, action.side);
        this.hit(action.targetId, action.damage, action.word, duration);
        break;
      case 'ability':
        this.abilityBanner(action, duration);
        break;
      case 'diss':
        this.hop(action.unitId);
        this.hit(action.targetId, action.damage, action.word, duration);
        break;
      case 'buff':
        this.buff(action, duration);
        break;
      case 'hype':
        break;
      case 'choke':
        this.choke(action, duration);
        break;
      case 'front':
        this.flashAbove(action.unitId, 'UP NEXT!', UI.textGold, duration);
        break;
      case 'swing':
        this.crowdShout(action.side, action.speech.text, action.rising, duration);
        break;
      case 'verse':
        popWord(
          this,
          DESIGN_WIDTH / 2,
          280,
          `VERSE ${String(action.verse)}!`,
          72,
          UI.textGold,
          duration,
        );
        break;
      case 'verdict':
        this.verdict(action, after, duration);
        break;
      case 'end':
        this.showEnd(action, after, duration);
        break;
    }
    this.applySnapshot(after, true);
  }

  /** The beat's sound and shake, and the battle beat's layers from the hype after it. */
  private playSound(action: BeatAction): void {
    const cue = battleCue(action);
    if (cue !== null) this.audio.play(cue);
    const shake = battleShake(action);
    if (shake !== null) this.cameras.main.shake(shake.ms, shake.intensity);
    if (action.kind === 'choke') this.audio.dropBar();
  }

  /** Moves the MCs to their places and updates their stats and both hype meters. */
  private applySnapshot(snapshot: StageSnapshot, animate: boolean): void {
    for (const side of ['a', 'b'] as const) {
      snapshot.stage[side].forEach((id, place) => {
        const actor = this.actors.get(id);
        if (actor === undefined) return;
        const x = mcX(side, place);
        if (animate && actor.figure.container.x !== x) {
          this.tweens.add({ targets: actor.figure.container, x, duration: 450, ease: 'Quad.Out' });
        } else if (!animate) {
          actor.figure.container.x = x;
        }
      });
      this.drawHypeMeter(side, snapshot.hype[side]);
      this.audio.setHype(snapshot.hype.a + snapshot.hype.b);
      this.setCrowdMood(side, snapshot.hype[side]);
    }
    for (const [id, stats] of Object.entries(snapshot.stats)) {
      this.actors
        .get(id)
        ?.stats?.setText(`FLOW ${String(stats.flow)}\nCONF ${String(stats.confidence)}`);
    }
  }

  private drawHypeMeter(side: Side, hype: number): void {
    const pen = this.hypeMeters[side];
    const width = 360;
    const labelWidth = 64;
    const panelLeft = side === 'a' ? 30 : DESIGN_WIDTH - 30 - width - labelWidth - 16;
    const barsLeft = side === 'a' ? panelLeft + labelWidth : panelLeft + 8;
    const main = CREW_COLOUR_HEX[this.data_.crews[side].identity.mainColour];
    pen.clear();
    roundedRect(pen, panelLeft, HYPE_METER_Y - 16, width + labelWidth + 16, 32, 10, UI.panel, INK);
    const segment = width / HYPE_SEGMENTS;
    for (let index = 0; index < HYPE_SEGMENTS; index++) {
      // Both meters fill from the outside in, towards the mics.
      const lit = side === 'a' ? index < hype : HYPE_SEGMENTS - 1 - index < hype;
      pen.fillStyle(lit ? main : UI.panelLight, 1);
      pen.fillRoundedRect(barsLeft + index * segment + 2, HYPE_METER_Y - 10, segment - 4, 20, 4);
    }
    if (!this.hypeLabels.has(side)) {
      this.hypeLabels.add(side);
      const labelX =
        side === 'a' ? panelLeft + labelWidth / 2 + 4 : barsLeft + width + labelWidth / 2 + 4;
      this.add.text(labelX, HYPE_METER_Y, 'HYPE', letteringStyle(15)).setOrigin(0.5).setDepth(1);
    }
  }

  private readonly hypeLabels = new Set<Side>();

  /** The crowd bounces harder on the side with more hype (§11). */
  private setCrowdMood(side: Side, hype: number): void {
    const height = 3 + hype * 2.2;
    for (const [index, head] of this.crowd[side].entries()) {
      this.tweens.killTweensOf(head);
      const baseY = (head.getData('baseY') as number | undefined) ?? head.y;
      head.setData('baseY', baseY);
      head.y = baseY;
      this.tweens.add({
        targets: head,
        y: baseY - height,
        duration: 260 + (index % 5) * 30,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
        delay: (index % 7) * 40,
      });
    }
  }

  // --- Effects ---------------------------------------------------------------------------

  private headOf(id: UnitId): { x: number; y: number } {
    const actor = this.actors.get(id);
    if (actor === undefined) return { x: DESIGN_WIDTH / 2, y: 300 };
    const scale = actor.unit.role === 'support' ? 0.8 : 1;
    return { x: actor.figure.container.x, y: actor.figure.container.y - 110 * scale };
  }

  private lunge(id: UnitId, side: Side): void {
    const actor = this.actors.get(id);
    if (actor === undefined) return;
    this.tweens.add({
      targets: actor.figure.body,
      x: facing(side) * 34,
      duration: 140,
      yoyo: true,
      ease: 'Quad.Out',
    });
  }

  private hop(id: UnitId): void {
    const actor = this.actors.get(id);
    if (actor === undefined) return;
    this.tweens.add({
      targets: actor.figure.body,
      y: -18,
      duration: 140,
      yoyo: true,
      ease: 'Quad.Out',
    });
  }

  private pulse(target: Phaser.GameObjects.Image | undefined, scale: number): void {
    if (target === undefined) return;
    const x = target.scaleX;
    const y = target.scaleY;
    this.tweens.add({
      targets: target,
      scaleX: x * scale,
      scaleY: y * scale,
      duration: 120,
      yoyo: true,
    });
  }

  private hit(targetId: UnitId, damage: number, word: string, duration: number): void {
    const head = this.headOf(targetId);
    popWord(this, head.x, head.y - 20, word, 34, UI.textGold, duration);
    if (damage > 0) {
      sparks(
        this,
        head.x,
        head.y + 10,
        damage >= HUGE_HIT ? UI.accentHover : UI.button,
        30 + damage * 8,
      );
      this.floatText(head.x + 40, head.y + 20, `-${String(damage)}`, UI.textBad, duration);
      const actor = this.actors.get(targetId);
      if (actor !== undefined) {
        this.tweens.add({
          targets: actor.figure.body,
          angle: { from: -6, to: 6 },
          duration: 60,
          yoyo: true,
          repeat: 2,
          onComplete: () => actor.figure.body.setAngle(0),
        });
      }
    }
  }

  private buff(action: Extract<BeatAction, { kind: 'buff' }>, duration: number): void {
    const head = this.headOf(action.targetId);
    const parts = [
      action.flow === 0 ? '' : `+${String(action.flow)} FLOW`,
      action.confidence === 0 ? '' : `+${String(action.confidence)} CONF`,
    ].filter((part) => part !== '');
    this.floatText(
      head.x,
      head.y - 50,
      parts.length === 0 ? action.word : parts.join('  '),
      UI.textGood,
      duration,
    );
    this.pulse(this.actors.get(action.targetId)?.figure.body, 1.12);
  }

  private abilityBanner(action: Extract<BeatAction, { kind: 'ability' }>, duration: number): void {
    const head = this.headOf(action.unitId);
    ring(this, head.x, head.y + 20, UI.button);
    const banner = this.add
      .text(
        head.x,
        head.y - 78,
        action.name.toUpperCase(),
        letteringStyle(18, { colour: UI.textDark }),
      )
      .setOrigin(0.5)
      .setBackgroundColor(UI.buttonCss)
      .setPadding(10, 4, 10, 4)
      .setStroke(UI.buttonCss, 0)
      .setDepth(550)
      .setScale(0.3);
    this.tweens.add({ targets: banner, scale: 1, duration: 150, ease: 'Back.Out' });
    this.time.delayedCall(Math.max(200, duration - 200), () => {
      banner.destroy();
    });
    if (action.speech !== null) {
      this.speak(action.speech.speaker, action.speech.text, duration, 110);
    }
  }

  private choke(action: Extract<BeatAction, { kind: 'choke' }>, duration: number): void {
    const actor = this.actors.get(action.unitId);
    const head = this.headOf(action.unitId);
    flash(this, UI.white);
    popWord(this, head.x, head.y - 30, action.word, 44, UI.textBad, duration * 0.6);
    this.speak(action.speech.speaker, action.speech.text, duration, 30);
    if (actor === undefined) return;
    this.actors.delete(action.unitId);
    this.tweens.add({
      targets: actor.figure.container,
      angle: -facing(action.side) * 80,
      y: actor.figure.container.y + 20,
      alpha: 0.4,
      duration: 500,
      ease: 'Quad.In',
      onComplete: () => {
        this.tweens.add({
          targets: actor.figure.container,
          x: actor.figure.container.x - facing(action.side) * 260,
          alpha: 0,
          duration: 500,
          onComplete: () => {
            actor.figure.container.destroy();
          },
        });
      },
    });
  }

  private speak(speaker: UnitId | null, text: string, lifetime: number, above: number): void {
    if (speaker === null) return;
    const head = this.headOf(speaker);
    addSpeechBubble(this, head.x, head.y - above, text, lifetime, DESIGN_WIDTH);
  }

  private crowdShout(side: Side, text: string, rising: boolean, duration: number): void {
    const x = halfLeft(side) + DESIGN_WIDTH / 4;
    addSpeechBubble(this, x, CROWD_Y - 40, text, duration, DESIGN_WIDTH);
    for (const head of this.crowd[side]) {
      this.tweens.add({
        targets: head,
        scale: head.scale * (rising ? 1.25 : 0.85),
        duration: 180,
        yoyo: true,
        repeat: 1,
      });
    }
  }

  private flashAbove(id: UnitId, word: string, colour: string, duration: number): void {
    const head = this.headOf(id);
    popWord(this, head.x, head.y - 60, word, 24, colour, duration);
  }

  private floatText(x: number, y: number, text: string, colour: string, duration: number): void {
    const label = this.add
      .text(x, y, text, letteringStyle(26, { colour }))
      .setOrigin(0.5)
      .setDepth(600);
    this.tweens.add({
      targets: label,
      y: y - 40,
      alpha: { from: 1, to: 0 },
      duration: Math.max(300, duration),
      ease: 'Quad.Out',
      onComplete: () => {
        label.destroy();
      },
    });
  }

  private endReason(action: Extract<BeatAction, { kind: 'end' }>, after: StageSnapshot): string {
    switch (action.reason) {
      case 'noMcs':
        return `${this.data_.crews[other(action.winner)].identity.name} had no MCs on stage`;
      case 'turnLimit':
        return 'Time! The judges decide';
      case 'crowdVote':
        return `The crowd votes ${String(after.verses[action.winner])} verses to ${String(after.verses[other(action.winner)])}`;
      case 'wipeout':
        return `${String(action.margin)} MC${action.margin === 1 ? '' : 's'} still standing`;
    }
  }

  private caption(text: string, duration: number): void {
    const label = this.add
      .text(DESIGN_WIDTH / 2, 350, text, letteringStyle(26))
      .setOrigin(0.5)
      .setDepth(600);
    this.time.delayedCall(duration, () => {
      label.destroy();
    });
  }

  private intro(opener: Side, duration: number): void {
    const openerName = this.data_.crews[opener].identity.name;
    if (this.data_.style === 'crowdVote') {
      popWord(this, DESIGN_WIDTH / 2, 280, 'CROWD VOTE!', 84, UI.textGold, duration);
      this.caption(
        `${openerName} opens · the crowd picks each verse · best of ${String(TUNABLES.VERSES)}`,
        duration,
      );
      return;
    }
    popWord(this, DESIGN_WIDTH / 2, 280, 'BATTLE!', 84, UI.textGold, duration);
    this.caption(`${openerName} opens`, duration);
  }

  /** Crowd vote: the crowd gives the verse to a crew, and the tally under the turn goes up. */
  private verdict(
    action: Extract<BeatAction, { kind: 'verdict' }>,
    after: StageSnapshot,
    duration: number,
  ): void {
    const name = this.data_.crews[action.winner].identity.name.toUpperCase();
    popWord(
      this,
      DESIGN_WIDTH / 2,
      250,
      `VERSE ${String(action.verse)} TO`,
      40,
      UI.textGold,
      duration,
    );
    this.caption(
      `${name}  (HYPE +${String(action.gain[action.winner])} vs +${String(action.gain[other(action.winner)])})`,
      duration,
    );
    this.crowdShout(action.winner, action.speech.text, true, duration);
    this.confettiFor(action.winner);
    this.verseText.setText(this.tally(after));
  }

  /** Confetti in the crew's colours from its half of the crowd. */
  private confettiFor(side: Side): void {
    const { identity } = this.data_.crews[side];
    const colours = [
      CREW_COLOUR_HEX[identity.mainColour],
      CREW_COLOUR_HEX[identity.trimColour],
      UI.button,
    ];
    confetti(this, halfLeft(side) + DESIGN_WIDTH / 4, CROWD_Y - 20, colours, this.fxRng);
  }

  private tally(snapshot: StageSnapshot): string {
    const { a, b } = this.data_.crews;
    return `VERSES  ${a.identity.name} ${String(snapshot.verses.a)} – ${String(snapshot.verses.b)} ${b.identity.name}`;
  }

  private showEnd(
    action: Extract<BeatAction, { kind: 'end' }>,
    after: StageSnapshot,
    duration: number,
  ): void {
    const winner = this.data_.crews[action.winner].identity.name.toUpperCase();
    const reason = this.endReason(action, after);
    const panel = this.add.graphics().setDepth(700);
    roundedRect(panel, 240, 200, DESIGN_WIDTH - 480, 190, 20, UI.panel, INK);
    const title = this.add
      .text(
        DESIGN_WIDTH / 2,
        262,
        `WINNER: ${winner}`,
        letteringStyle(50, { colour: UI.textGold, wrapWidth: DESIGN_WIDTH - 520 }),
      )
      .setOrigin(0.5)
      .setDepth(701);
    if (title.width > DESIGN_WIDTH - 520) title.setScale((DESIGN_WIDTH - 520) / title.width);
    this.add
      .text(DESIGN_WIDTH / 2, 340, reason, bodyStyle(22, { align: 'center' }))
      .setOrigin(0.5)
      .setDepth(701);
    this.confettiFor(action.winner);
    this.time.delayedCall(duration * 0.1, () => {
      for (const head of this.crowd[action.winner])
        this.tweens.add({ targets: head, y: head.y - 20, duration: 200, yoyo: true, repeat: 3 });
    });
  }
}
