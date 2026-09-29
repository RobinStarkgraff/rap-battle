export { DESIGN_HEIGHT, DESIGN_WIDTH, PAGE_BACKGROUND } from './config';
export { BattleScene } from './battle/BattleScene';
export type { BattleSceneData } from './battle/BattleScene';
export { HubScene } from './hub/HubScene';
export type { HubSceneData } from './hub/HubScene';
export type { HubController, HubState, HubTab, Refusal } from './hub/types';
export { ResultScene } from './result/ResultScene';
export type { ResultSceneData } from './result/ResultScene';
export { FoundingScene } from './scenes/FoundingScene';
export type { FoundingSceneData } from './scenes/FoundingScene';
export { GalleryScene } from './scenes/GalleryScene';
export { TitleScene } from './scenes/TitleScene';
export type { TitleSceneData } from './scenes/TitleScene';
export { visibleTargets } from './ui/targets';
export type { TargetInfo } from './ui/targets';

/** Every scene of the game flow, for the game config. */
import { BattleScene } from './battle/BattleScene';
import { HubScene } from './hub/HubScene';
import { ResultScene } from './result/ResultScene';
import { FoundingScene } from './scenes/FoundingScene';
import { TitleScene } from './scenes/TitleScene';
export const GAME_SCENES = [TitleScene, FoundingScene, HubScene, BattleScene, ResultScene];
