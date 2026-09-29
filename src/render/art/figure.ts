/**
 * The chunky paper-cut figure (§11 Characters, D-049): a big round head, a rounded-rect body
 * and stubby limbs, flat shapes with a dark outline. It stands with its feet on (0, 0) and
 * faces right; mirror it to face left. Everything but the outfit colours comes from the look.
 */

import {
  ART,
  GOLD,
  GOLD_DARK,
  GREY_HAIR,
  INK,
  type OutfitColours,
  SASH,
  SASH_TRIM,
} from '../palette';
import type { CareerLook } from './career';
import { wearsHat, type BodyShape, type Look } from './look';
import { circle, OUTLINE, polygon, roundedRect, starPoints, type Pen } from './pen';

/** The height of a figure at scale 1, from its feet to the top of the tallest hair. */
export const FIGURE_HEIGHT = 136;
/** Half the width of a figure at scale 1. */
export const FIGURE_HALF_WIDTH = 40;

const PANTS = ART.pants;
const SHOE = ART.white;
const LEG_HEIGHT = 22;
const HEAD_RADIUS = 22;

interface BodySize {
  readonly width: number;
  readonly height: number;
  readonly radius: number;
}

const BODY_SIZES: Readonly<Record<BodyShape, BodySize>> = {
  tall: { width: 34, height: 50, radius: 10 },
  round: { width: 48, height: 44, radius: 22 },
  square: { width: 46, height: 42, radius: 6 },
};

/** Where the parts of a figure sit; every drawing step reads from it. */
interface Frame {
  readonly body: BodySize;
  readonly bodyTop: number;
  readonly headX: number;
  readonly headY: number;
}

function frameOf(look: Look): Frame {
  const body = BODY_SIZES[look.body];
  const bodyTop = -LEG_HEIGHT + 2 - body.height;
  return { body, bodyTop, headX: 3, headY: bodyTop - HEAD_RADIUS + 6 };
}

export function drawFigure(pen: Pen, look: Look, outfit: OutfitColours, career: CareerLook): void {
  const frame = frameOf(look);
  const hair = career.farewell ? GREY_HAIR : look.hairColour;
  drawLegs(pen, look, outfit);
  drawArm(pen, frame, look, outfit, 'back');
  drawBackHair(pen, frame, look, hair);
  drawBody(pen, frame, look, outfit);
  if (career.farewell) drawSash(pen, frame);
  drawHead(pen, frame, look);
  drawFrontHair(pen, frame, look, hair, outfit, career);
  drawFace(pen, frame, look, career);
  drawAccessory(pen, frame, look, outfit);
  drawArm(pen, frame, look, outfit, 'front');
  drawBling(pen, frame, career);
}

function drawLegs(pen: Pen, look: Look, outfit: OutfitColours): void {
  const pants = look.outfit === 'tracksuit' ? outfit.main : PANTS;
  for (const x of [-12, 2]) {
    roundedRect(pen, x, -LEG_HEIGHT, 11, LEG_HEIGHT - 2, 4, pants, INK);
    if (look.outfit === 'tracksuit') {
      pen.lineStyle(2, outfit.trim, 1);
      pen.lineBetween(x + 5.5, -LEG_HEIGHT + 3, x + 5.5, -5);
    }
    pen.fillStyle(SHOE, 1);
    pen.fillEllipse(x + 8, -4.5, 18, 9);
    pen.lineStyle(OUTLINE, INK, 1);
    pen.strokeEllipse(x + 8, -4.5, 18, 9);
  }
}

function drawArm(
  pen: Pen,
  frame: Frame,
  look: Look,
  outfit: OutfitColours,
  which: 'back' | 'front',
): void {
  const half = frame.body.width / 2;
  const x = which === 'back' ? -half - 7 : half - 5;
  const top = frame.bodyTop + 5;
  roundedRect(pen, x, top, 12, 28, 5, outfit.main, INK);
  if (look.outfit === 'tracksuit') {
    pen.lineStyle(2, outfit.trim, 1);
    pen.lineBetween(x + 6, top + 3, x + 6, top + 24);
  }
  if (look.outfit === 'tee') {
    pen.fillStyle(outfit.trim, 1);
    pen.fillRect(x + 1.5, top + 11, 9, 3);
  }
  circle(pen, x + 6, top + 31, 6.5, look.skin, INK);
  if (which === 'front' && look.accessory === 'wristband') {
    roundedRect(pen, x, top + 22, 12, 5, 2, outfit.trim, INK);
  }
}

function drawBody(pen: Pen, frame: Frame, look: Look, outfit: OutfitColours): void {
  const { width, height, radius } = frame.body;
  const x = -width / 2;
  const top = frame.bodyTop;
  if (look.outfit === 'hoodie') {
    // The hood lies behind the neck.
    circle(pen, frame.headX - 6, top + 2, 14, outfit.trim, INK);
  }
  roundedRect(pen, x, top, width, height, radius, outfit.main, INK);
  switch (look.outfit) {
    case 'tee':
      pen.fillStyle(outfit.trim, 1);
      pen.fillEllipse(frame.headX, top + 2, 20, 9);
      break;
    case 'hoodie':
      roundedRect(
        pen,
        x + width * 0.2,
        top + height * 0.55,
        width * 0.6,
        height * 0.28,
        4,
        outfit.trim,
        INK,
      );
      pen.lineStyle(2, outfit.trim, 1);
      pen.lineBetween(frame.headX - 4, top + 3, frame.headX - 4, top + 14);
      pen.lineBetween(frame.headX + 4, top + 3, frame.headX + 4, top + 14);
      break;
    case 'jacket':
      pen.lineStyle(3, outfit.trim, 1);
      pen.lineBetween(frame.headX, top + 4, frame.headX, top + height - 3);
      polygon(
        pen,
        [
          { x: frame.headX - 10, y: top },
          { x: frame.headX, y: top + 10 },
          { x: frame.headX - 2, y: top },
        ],
        outfit.trim,
      );
      polygon(
        pen,
        [
          { x: frame.headX + 10, y: top },
          { x: frame.headX, y: top + 10 },
          { x: frame.headX + 2, y: top },
        ],
        outfit.trim,
      );
      break;
    case 'tracksuit':
      pen.lineStyle(3, outfit.trim, 1);
      pen.lineBetween(x + 5, top + 6, x + 5, top + height - 5);
      pen.lineBetween(x + width - 5, top + 6, x + width - 5, top + height - 5);
      pen.fillStyle(outfit.trim, 1);
      pen.fillRect(x + 4, top + height - 7, width - 8, 4);
      break;
  }
}

/** The farewell tour sash, over one shoulder (§11). */
function drawSash(pen: Pen, frame: Frame): void {
  const half = frame.body.width / 2;
  const top = frame.bodyTop;
  const bottom = top + frame.body.height;
  polygon(
    pen,
    [
      { x: half - 10, y: top + 1 },
      { x: half - 1, y: top + 6 },
      { x: -half + 6, y: bottom - 2 },
      { x: -half + 1, y: bottom - 11 },
    ],
    SASH,
    SASH_TRIM,
  );
}

function drawHead(pen: Pen, frame: Frame, look: Look): void {
  circle(pen, frame.headX, frame.headY, HEAD_RADIUS, look.skin, INK);
  // The ear, on the side facing away.
  circle(pen, frame.headX - 12, frame.headY + 3, 5, look.skin, INK);
}

function drawBackHair(pen: Pen, frame: Frame, look: Look, hair: number): void {
  const { headX: x, headY: y } = frame;
  switch (look.hair) {
    case 'afro':
      circle(pen, x - 2, y - 6, HEAD_RADIUS + 9, hair, INK);
      break;
    case 'braids':
      for (const offset of [-18, -11]) {
        roundedRect(pen, x + offset, y - 6, 7, 34, 3, hair, INK);
      }
      break;
    case 'bun':
      circle(pen, x - 10, y - HEAD_RADIUS - 2, 10, hair, INK);
      break;
    case 'bald':
    case 'buzz':
    case 'flat-top':
    case 'mohawk':
    case 'cap':
    case 'beanie':
    case 'bucket-hat':
      // Nothing behind the head.
      break;
  }
}

function drawFrontHair(
  pen: Pen,
  frame: Frame,
  look: Look,
  hair: number,
  outfit: OutfitColours,
  career: CareerLook,
): void {
  const { headX: x, headY: y } = frame;
  const r = HEAD_RADIUS;
  switch (look.hair) {
    case 'bald':
      if (career.farewell) {
        circle(pen, x - 15, y - 4, 6, hair);
      }
      break;
    case 'buzz':
    case 'braids':
    case 'bun':
      pen.fillStyle(hair, 1);
      pen.fillEllipse(x - 2, y - r + 7, r * 1.9, 18);
      break;
    case 'afro':
      pen.fillStyle(hair, 1);
      pen.fillEllipse(x - 2, y - r + 4, r * 2, 20);
      break;
    case 'flat-top':
      roundedRect(pen, x - r + 2, y - r - 14, r * 2 - 4, 24, 4, hair, INK);
      break;
    case 'mohawk':
      polygon(
        pen,
        [
          { x: x - 14, y: y - r + 6 },
          { x: x - 8, y: y - r - 16 },
          { x: x, y: y - r + 2 },
          { x: x + 6, y: y - r - 14 },
          { x: x + 12, y: y - r + 6 },
        ],
        hair,
        INK,
      );
      break;
    case 'cap':
      pen.fillStyle(outfit.trim, 1);
      pen.fillEllipse(x + 16, y - r + 10, 26, 8);
      pen.lineStyle(OUTLINE, INK, 1);
      pen.strokeEllipse(x + 16, y - r + 10, 26, 8);
      roundedRect(pen, x - r + 1, y - r - 5, r * 2 - 2, 17, 8, outfit.main, INK);
      break;
    case 'beanie':
      roundedRect(pen, x - r, y - r - 8, r * 2, 22, 10, outfit.trim, INK);
      roundedRect(pen, x - r - 1, y - r + 8, r * 2 + 2, 7, 3, outfit.main, INK);
      circle(pen, x, y - r - 10, 5, outfit.main, INK);
      break;
    case 'bucket-hat':
      roundedRect(pen, x - r - 7, y - r + 6, r * 2 + 14, 7, 3, outfit.main, INK);
      roundedRect(pen, x - r + 3, y - r - 8, r * 2 - 6, 17, 6, outfit.main, INK);
      break;
  }
  if (wearsHat(look) && career.farewell) {
    // Grey hair shows under the hat.
    circle(pen, x - 15, y - 2, 5, hair);
  }
}

function drawFace(pen: Pen, frame: Frame, look: Look, career: CareerLook): void {
  const { headX: x, headY: y } = frame;
  const eyeY = y - 2;
  const eyes = [x + 3, x + 13];
  pen.fillStyle(INK, 1);
  for (const [index, eyeX] of eyes.entries()) {
    const winking = look.eyes === 'wink' && index === 1;
    if (winking || look.eyes === 'sleepy') {
      pen.lineStyle(2.5, INK, 1);
      pen.lineBetween(eyeX - 3, eyeY, eyeX + 3, eyeY);
    } else if (look.eyes === 'wide') {
      circle(pen, eyeX, eyeY, 4.5, ART.pureWhite, INK);
      circle(pen, eyeX + 1, eyeY, 2, INK);
    } else {
      circle(pen, eyeX, eyeY, 2.6, INK);
    }
  }
  pen.lineStyle(2.5, INK, 1);
  for (const eyeX of eyes) {
    switch (look.brows) {
      case 'none':
        break;
      case 'flat':
        pen.lineBetween(eyeX - 4, eyeY - 8, eyeX + 4, eyeY - 8);
        break;
      case 'angry':
        pen.lineBetween(eyeX - 4, eyeY - 10, eyeX + 4, eyeY - 7);
        break;
      case 'raised':
        pen.lineBetween(eyeX - 4, eyeY - 9, eyeX + 4, eyeY - 12);
        break;
    }
  }
  const mouthX = x + 9;
  const mouthY = y + 10;
  switch (look.mouth) {
    case 'grin':
      pen.fillStyle(ART.pureWhite, 1);
      pen.fillEllipse(mouthX, mouthY, 14, 7);
      pen.lineStyle(2, INK, 1);
      pen.strokeEllipse(mouthX, mouthY, 14, 7);
      break;
    case 'smirk':
      pen.lineStyle(2.5, INK, 1);
      pen.lineBetween(mouthX - 6, mouthY + 1, mouthX + 5, mouthY - 2);
      break;
    case 'open':
      circle(pen, mouthX, mouthY, 4.5, ART.mouth, INK);
      break;
    case 'flat':
      pen.lineStyle(2.5, INK, 1);
      pen.lineBetween(mouthX - 5, mouthY, mouthX + 5, mouthY);
      break;
  }
  if (career.bling.includes('goldTooth')) {
    pen.fillStyle(GOLD, 1);
    pen.fillRect(mouthX + 1, mouthY - 2, 3.5, 3.5);
  }
}

function drawAccessory(pen: Pen, frame: Frame, look: Look, outfit: OutfitColours): void {
  const { headX: x, headY: y } = frame;
  switch (look.accessory) {
    case 'shades':
      roundedRect(pen, x - 2, y - 7, 10, 8, 3, INK);
      roundedRect(pen, x + 9, y - 7, 10, 8, 3, INK);
      pen.lineStyle(2, INK, 1);
      pen.lineBetween(x - 12, y - 4, x - 2, y - 4);
      break;
    case 'bandana':
      if (!wearsHat(look)) {
        roundedRect(pen, x - HEAD_RADIUS + 1, y - 15, HEAD_RADIUS * 2 - 2, 7, 3, outfit.trim, INK);
      }
      break;
    case 'headphones':
      pen.lineStyle(4, INK, 1);
      pen.beginPath();
      pen.arc(x - 3, y - 2, HEAD_RADIUS + 3, Math.PI * 1.05, Math.PI * 1.95);
      pen.strokePath();
      roundedRect(pen, x - 20, y - 6, 10, 16, 4, outfit.trim, INK);
      break;
    case 'earring':
      circle(pen, x - 12, y + 10, 3, GOLD, GOLD_DARK);
      break;
    case 'wristband':
      // Drawn with the front arm.
      break;
  }
}

function drawBling(pen: Pen, frame: Frame, career: CareerLook): void {
  const top = frame.bodyTop;
  const x = frame.headX;
  if (career.bling.includes('chain')) {
    const weight = 1.5 + career.chainWeight * 1.5;
    pen.lineStyle(weight, GOLD, 1);
    pen.lineBetween(x - 9, top + 2, x - 3, top + 14);
    pen.lineBetween(x - 3, top + 14, x + 5, top + 14);
    pen.lineBetween(x + 5, top + 14, x + 10, top + 2);
    circle(pen, x + 1, top + 16 + career.chainWeight, 2.5 + career.chainWeight, GOLD, GOLD_DARK);
  }
  if (career.bling.includes('rings')) {
    const handX = frame.body.width / 2 + 1;
    const handY = top + 36;
    circle(pen, handX - 2, handY, 2.2, GOLD);
    circle(pen, handX + 3, handY + 1, 2.2, GOLD);
  }
  if (career.bling.includes('capBadge')) {
    polygon(pen, starPoints(x + 6, frame.headY - HEAD_RADIUS + 2, 6, 2.6), GOLD, GOLD_DARK);
  }
}
