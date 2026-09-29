/** What every hub tab gets to draw with (§11 Screens). */

import type Phaser from 'phaser';
import type { HubController, HubState, HubTab } from './types';

/** The area below the header and the tab bar that tabs draw into. */
export const CONTENT = { left: 20, top: 150, right: 1260, bottom: 706 } as const;

export interface TabContext {
  readonly scene: Phaser.Scene;
  /** Everything a tab adds goes in here; it is destroyed when the hub redraws. */
  readonly layer: Phaser.GameObjects.Container;
  readonly state: HubState;
  readonly controller: HubController;
  /** Shows a line of feedback under the header. */
  say(message: string, tone?: 'good' | 'bad' | 'info'): void;
  /** Redraws the hub, for changes to the tab's own view (sorting, selection). */
  refresh(): void;
  /** Switches to another tab. */
  open(tab: HubTab): void;
}
