export { DESIGN_HEIGHT, DESIGN_WIDTH, PAGE_BACKGROUND } from './config';
export { BattleScene } from './battle/BattleScene';
export type { BattleSceneData } from './battle/BattleScene';
export { HubScene } from './hub/HubScene';
export type { HubSceneData } from './hub/HubScene';
export type {
  HubController,
  HubState,
  HubTab,
  PlayerStatus,
  Refusal,
  SittingPlayer,
  SittingView,
} from './hub/types';
export { LobbyScene } from './lobby/LobbyScene';
export type { LobbySceneData } from './lobby/LobbyScene';
export type {
  LobbyController,
  LobbyInfo,
  LobbyPhase,
  LobbyRole,
  LobbySeat,
  LobbyState,
} from './lobby/types';
export { ResultScene } from './result/ResultScene';
export type { ResultSceneData } from './result/ResultScene';
export { FoundingScene } from './scenes/FoundingScene';
export type { FoundingSceneData } from './scenes/FoundingScene';
export { GalleryScene } from './scenes/GalleryScene';
export { JoinScene } from './scenes/JoinScene';
export type { JoinSceneData } from './scenes/JoinScene';
export { TitleScene } from './scenes/TitleScene';
export type { TitleSceneData } from './scenes/TitleScene';
export { visibleTargets } from './ui/targets';
export type { TargetInfo } from './ui/targets';

/** Every scene of the game flow, for the game config. */
import { BattleScene } from './battle/BattleScene';
import { HubScene } from './hub/HubScene';
import { ResultScene } from './result/ResultScene';
import { LobbyScene } from './lobby/LobbyScene';
import { FoundingScene } from './scenes/FoundingScene';
import { JoinScene } from './scenes/JoinScene';
import { TitleScene } from './scenes/TitleScene';
export const GAME_SCENES = [
  TitleScene,
  FoundingScene,
  JoinScene,
  LobbyScene,
  HubScene,
  BattleScene,
  ResultScene,
];
