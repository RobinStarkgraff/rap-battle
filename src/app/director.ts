/**
 * Shows the game flow's current screen (§11 Screens): each screen kind is one Phaser scene,
 * started with its data and the flow's actions as callbacks.
 */

import type Phaser from 'phaser';
import {
  BattleScene,
  FoundingScene,
  HubScene,
  JoinScene,
  LobbyScene,
  ResultScene,
  SoundScene,
  TitleScene,
  type BattleSceneData,
  type FoundingSceneData,
  type HubSceneData,
  type JoinSceneData,
  type LobbySceneData,
  type ResultSceneData,
  type TitleSceneData,
} from '../render';
import { LEAGUE_BATTLE_STYLES } from '../core';
import type { GameFlow, Screen } from './flow';
import { BOT_CHOICES, DEFAULT_BOTS, type BotCount } from './localLeague';

export function startDirector(game: Phaser.Game, flow: GameFlow): void {
  let shown: Screen | null = null;
  const show = (): void => {
    const screen = flow.screen();
    if (screen === shown) return;
    shown = screen;
    for (const scene of game.scene.getScenes(true)) {
      // The sound controls stay on top of every screen.
      if (scene.scene.key !== SoundScene.KEY) game.scene.stop(scene);
    }
    const [key, data] = sceneFor(screen, flow);
    game.scene.start(key, data);
    game.scene.bringToTop(SoundScene.KEY);
  };
  flow.subscribe(show);
  show();
}

type SceneStart =
  | readonly [typeof TitleScene.KEY, TitleSceneData]
  | readonly [typeof FoundingScene.KEY, FoundingSceneData]
  | readonly [typeof JoinScene.KEY, JoinSceneData]
  | readonly [typeof LobbyScene.KEY, LobbySceneData]
  | readonly [typeof HubScene.KEY, HubSceneData]
  | readonly [typeof BattleScene.KEY, BattleSceneData]
  | readonly [typeof ResultScene.KEY, ResultSceneData];

function sceneFor(screen: Screen, flow: GameFlow): SceneStart {
  switch (screen.kind) {
    case 'title':
      return [
        TitleScene.KEY,
        {
          canContinue: screen.canContinue,
          notice: screen.notice,
          onNewLeague: () => {
            flow.newLeague();
          },
          onContinue: () => {
            flow.continueLeague();
          },
          onHost: () => {
            flow.hostSitting();
          },
          onJoin: () => {
            flow.joinSitting();
          },
        },
      ];
    case 'join':
      return [
        JoinScene.KEY,
        {
          codeLength: screen.codeLength,
          onJoin: (code) => {
            const joined = flow.join(code);
            return joined.ok ? null : joined.error;
          },
          onBack: () => {
            flow.cancelJoin();
          },
        },
      ];
    case 'lobby': {
      const controller = flow.lobby();
      if (controller === null) throw new RangeError('director: no sitting is open');
      return [LobbyScene.KEY, { controller }];
    }
    case 'founding':
      return [
        FoundingScene.KEY,
        {
          botChoices: screen.joining === null ? BOT_CHOICES : [],
          defaultBots: DEFAULT_BOTS,
          styleChoices: screen.joining === null ? LEAGUE_BATTLE_STYLES : [],
          joining: screen.joining,
          notice: screen.notice,
          onFound: (identity, bots, battleStyle) => {
            const founded = flow.found(identity, toBotCount(bots), battleStyle);
            return founded.ok ? null : founded.error;
          },
          onBack: () => {
            flow.cancelFounding();
          },
        },
      ];
    case 'hub': {
      const controller = flow.hub();
      if (controller === null) throw new RangeError('director: the hub has no round');
      return [HubScene.KEY, { controller }];
    }
    case 'battle':
      return [
        BattleScene.KEY,
        {
          crews: screen.battle.crews,
          events: screen.battle.report.events,
          seed: screen.battle.report.seed,
          style: screen.battle.report.style,
          onDone: () => {
            flow.battleWatched();
          },
        },
      ];
    case 'result':
      return [
        ResultScene.KEY,
        {
          crewId: screen.crewId,
          finished: screen.played.finished,
          battle: screen.played.battle,
          saved: screen.saved,
          onContinue: () => {
            flow.nextRound();
          },
        },
      ];
  }
}

function toBotCount(bots: number): BotCount {
  return BOT_CHOICES.find((choice) => choice === bots) ?? DEFAULT_BOTS;
}
