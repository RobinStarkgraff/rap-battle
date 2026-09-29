/**
 * Named interactive objects, so browser tests can find and click them by name instead of by
 * screen position (T-024). Scenes register their buttons; the app exposes the lookup in
 * development builds.
 */

import Phaser from 'phaser';

/** Anything that can be clicked and knows where it is on screen. */
export type Target = Phaser.GameObjects.GameObject & { getBounds(): Phaser.Geom.Rectangle };

const targets = new Map<string, Target>();

/** Registers an object under a name until it is destroyed. A newer object takes the name over. */
export function registerTarget(name: string, object: Target): void {
  targets.set(name, object);
  object.once(Phaser.GameObjects.Events.DESTROY, () => {
    if (targets.get(name) === object) targets.delete(name);
  });
}

export interface TargetInfo {
  readonly name: string;
  /** The centre in design coordinates (1280 × 720). */
  readonly x: number;
  readonly y: number;
  readonly enabled: boolean;
}

/** Every registered object that is currently shown. */
export function visibleTargets(): TargetInfo[] {
  return [...targets.entries()]
    .filter(([, object]) => object.active && isShown(object))
    .map(([name, object]) => ({
      name,
      ...centreOf(object),
      enabled: object.input?.enabled ?? false,
    }));
}

/**
 * Where to click an object. A container is clicked at its origin, because every clickable
 * container here is sized with `setSize`, whose hit area is centred there; `getBounds` can't
 * be used for it, because it ignores `Graphics` children.
 */
function centreOf(object: Target): { x: number; y: number } {
  if (object instanceof Phaser.GameObjects.Container) {
    const matrix = object.getWorldTransformMatrix();
    return { x: matrix.tx, y: matrix.ty };
  }
  const bounds = object.getBounds();
  return { x: bounds.centerX, y: bounds.centerY };
}

function isShown(object: Phaser.GameObjects.GameObject): boolean {
  if ('visible' in object && object.visible === false) return false;
  // Phaser types `parentContainer` as always set, but it is null outside a container.
  const parent: unknown = object.parentContainer;
  return parent instanceof Phaser.GameObjects.Container
    ? isShown(parent)
    : object.scene.scene.isActive();
}
