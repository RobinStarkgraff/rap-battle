/** The 32 abilities of `docs/game-design.md` §8. Numbers are placeholders for T-031. */

import type { AbilityDef, AbilityId, Amount } from '../model';

/** The same value at every power; used by MC abilities, which never gain power. */
function fixed(value: number): Amount {
  return { byPower: [value, value, value] };
}

function perPower(power1: number, power2: number, power3: number): Amount {
  return { byPower: [power1, power2, power3] };
}

/** A crowd ability's value: `⌊H / divisor⌋` plus a number per power (D-044). */
function crowd(divisor: number, power1 = 0, power2 = power1, power3 = power2): Amount {
  return { byPower: [power1, power2, power3], hypeDivisor: divisor };
}

const MC_ABILITIES = {
  punchliner: {
    id: 'punchliner',
    name: 'Punchliner',
    role: 'mc',
    trigger: { kind: 'barLanded', subject: 'self' },
    effect: { kind: 'diss', target: 'enemyBehindFront', amount: fixed(1) },
    text: 'After its bar: diss the enemy MC behind the enemy front',
  },
  wordplay: {
    id: 'wordplay',
    name: 'Wordplay',
    role: 'mc',
    trigger: { kind: 'barLanded', subject: 'self' },
    effect: { kind: 'diss', target: 'enemyFront', amount: crowd(3) },
    text: 'After its bar: diss the enemy front MC for a third of the hype',
  },
  multisyllabic: {
    id: 'multisyllabic',
    name: 'Multisyllabic',
    role: 'mc',
    trigger: { kind: 'takeFront', subject: 'self' },
    effect: { kind: 'buff', target: 'self', flow: fixed(1) },
    text: 'At the front: gains flow',
  },
  'battle-kid': {
    id: 'battle-kid',
    name: 'Battle Kid',
    role: 'mc',
    trigger: { kind: 'takeFront', subject: 'self' },
    effect: { kind: 'diss', target: 'enemyFront', amount: fixed(2) },
    text: 'At the front: diss the enemy front MC',
  },
  headliner: {
    id: 'headliner',
    name: 'Headliner',
    role: 'mc',
    trigger: { kind: 'battleStart' },
    conditions: { inSlot: 'opener' },
    effect: { kind: 'diss', target: 'allEnemies', amount: fixed(1) },
    text: 'Battle start, as Opener: diss every enemy MC',
  },
  'comeback-line': {
    id: 'comeback-line',
    name: 'Comeback Line',
    role: 'mc',
    trigger: { kind: 'hurt', subject: 'self' },
    effect: { kind: 'hype', target: 'enemyCrew', amount: fixed(1) },
    text: 'When hurt: the enemy crew loses hype',
  },
  'street-poet': {
    id: 'street-poet',
    name: 'Street Poet',
    role: 'mc',
    trigger: { kind: 'choke', subject: 'self' },
    effect: { kind: 'buff', target: 'friendBehind', flow: fixed(2), confidence: fixed(2) },
    text: 'When it chokes: pass the mic, the MC behind it gets flow and confidence',
  },
  'the-og': {
    id: 'the-og',
    name: 'The OG',
    role: 'mc',
    trigger: { kind: 'hurt', subject: 'self' },
    effect: { kind: 'buff', target: 'allFriendsBehind', flow: fixed(1) },
    text: 'When hurt: every friendly MC behind it gets flow',
  },
  'long-verse': {
    id: 'long-verse',
    name: 'Long Verse',
    role: 'mc',
    trigger: { kind: 'battleStart' },
    conditions: { inSlot: 'middle' },
    effect: { kind: 'buff', target: 'self', confidence: fixed(2) },
    text: 'Battle start, as Middle: gains confidence',
  },
  'off-the-top': {
    id: 'off-the-top',
    name: 'Off the Top',
    role: 'mc',
    trigger: { kind: 'battleStart' },
    conditions: { inSlot: 'closer' },
    effect: { kind: 'buff', target: 'self', flow: fixed(2), confidence: fixed(2) },
    text: 'Battle start, as Closer: gains flow and confidence',
  },
  'crowd-surfer': {
    id: 'crowd-surfer',
    name: 'Crowd Surfer',
    role: 'mc',
    trigger: { kind: 'takeFront', subject: 'self' },
    effect: { kind: 'buff', target: 'self', flow: crowd(3) },
    text: 'At the front: gains flow for a third of the hype',
  },
  wildcard: {
    id: 'wildcard',
    name: 'Wildcard',
    role: 'mc',
    trigger: { kind: 'barLanded', subject: 'self' },
    effect: { kind: 'diss', target: 'randomEnemy', amount: fixed(1) },
    text: 'After its bar: diss a random enemy MC',
  },
  'chart-topper': {
    id: 'chart-topper',
    name: 'Chart Topper',
    role: 'mc',
    trigger: { kind: 'barLanded', subject: 'self' },
    effect: { kind: 'hype', target: 'ownCrew', amount: fixed(1) },
    text: 'After its bar: its crew gains hype',
  },
  'feature-verse': {
    id: 'feature-verse',
    name: 'Feature Verse',
    role: 'mc',
    trigger: { kind: 'sign' },
    effect: { kind: 'buff', target: 'randomOtherCrewMC', confidence: fixed(1) },
    text: 'When signed: another random MC of the crew gets confidence for good',
  },
  encore: {
    id: 'encore',
    name: 'Encore',
    role: 'mc',
    trigger: { kind: 'choke', subject: 'self' },
    effect: { kind: 'diss', target: 'enemyFront', amount: crowd(2) },
    text: 'When it chokes: diss the enemy front MC for half the hype',
  },
  clapback: {
    id: 'clapback',
    name: 'Clapback',
    role: 'mc',
    trigger: { kind: 'hurt', subject: 'self' },
    conditions: { oncePerBattle: true },
    effect: { kind: 'diss', target: 'enemyFront', amount: fixed(1) },
    text: 'When hurt, once: diss the enemy front MC',
  },
} as const satisfies Record<string, AbilityDef>;

const SUPPORT_ABILITIES = {
  'drop-the-beat': {
    id: 'drop-the-beat',
    name: 'Drop the Beat',
    role: 'support',
    trigger: { kind: 'barLanded', subject: 'friend' },
    effect: { kind: 'buff', target: 'triggeringFriend', flow: perPower(1, 2, 3) },
    text: 'After a friendly bar: that MC gets flow',
  },
  scratch: {
    id: 'scratch',
    name: 'Scratch',
    role: 'support',
    trigger: { kind: 'takeFront', subject: 'friend' },
    effect: { kind: 'diss', target: 'enemyFront', amount: perPower(1, 2, 2) },
    text: 'When a friendly MC takes the front: diss the enemy front MC',
  },
  'crowd-mix': {
    id: 'crowd-mix',
    name: 'Crowd Mix',
    role: 'support',
    trigger: { kind: 'battleStart' },
    effect: { kind: 'hype', target: 'ownCrew', amount: perPower(2, 3, 4) },
    text: 'Battle start: its crew gains hype',
  },
  'get-up': {
    id: 'get-up',
    name: 'Get Up!',
    role: 'support',
    trigger: { kind: 'choke', subject: 'friend' },
    effect: { kind: 'buff', target: 'frontFriend', confidence: perPower(2, 4, 6) },
    text: 'When a friendly MC chokes: the new front MC gets confidence',
  },
  'make-some-noise': {
    id: 'make-some-noise',
    name: 'Make Some Noise!',
    role: 'support',
    trigger: { kind: 'takeFront', subject: 'friend' },
    effect: { kind: 'hype', target: 'ownCrew', amount: perPower(1, 2, 3) },
    text: 'When a friendly MC takes the front: its crew gains hype',
  },
  'hype-wave': {
    id: 'hype-wave',
    name: 'Hype Wave',
    role: 'support',
    trigger: { kind: 'choke', subject: 'friend' },
    effect: { kind: 'buff', target: 'frontFriend', flow: crowd(3, 0, 1, 2) },
    text: 'When a friendly MC chokes: the new front MC gets flow for a third of the hype',
  },
  beatmaker: {
    id: 'beatmaker',
    name: 'Beatmaker',
    role: 'support',
    trigger: { kind: 'battleStart' },
    effect: { kind: 'buff', target: 'frontFriend', flow: perPower(1, 2, 3) },
    text: 'Battle start: the front MC gets flow',
  },
  'studio-session': {
    id: 'studio-session',
    name: 'Studio Session',
    role: 'support',
    trigger: { kind: 'upkeep' },
    effect: { kind: 'xp', target: 'randomCrewMC', amount: perPower(1, 2, 3) },
    text: 'Each upkeep: a random MC of the crew gets xp',
  },
  remix: {
    id: 'remix',
    name: 'Remix',
    role: 'support',
    trigger: { kind: 'choke', subject: 'friend' },
    effect: { kind: 'buff', target: 'frontFriend', flow: perPower(1, 2, 3) },
    text: 'When a friendly MC chokes: the new front MC gets flow',
  },
  'warm-up': {
    id: 'warm-up',
    name: 'Warm-up',
    role: 'support',
    trigger: { kind: 'battleStart' },
    effect: { kind: 'buff', target: 'frontFriend', confidence: perPower(1, 2, 3) },
    text: 'Battle start: the front MC gets confidence',
  },
  breathe: {
    id: 'breathe',
    name: 'Breathe!',
    role: 'support',
    trigger: { kind: 'hurt', subject: 'friend' },
    conditions: { oncePerBattle: true },
    effect: { kind: 'buff', target: 'triggeringFriend', confidence: perPower(2, 3, 4) },
    text: 'When a friendly MC is hurt, once: that MC gets confidence',
  },
  'voice-lessons': {
    id: 'voice-lessons',
    name: 'Voice Lessons',
    role: 'support',
    trigger: { kind: 'upkeep' },
    effect: { kind: 'buff', target: 'randomCrewMC', confidence: perPower(1, 1, 2) },
    text: 'Each upkeep: a random MC of the crew gets confidence for good',
  },
  'hometown-crowd': {
    id: 'hometown-crowd',
    name: 'Hometown Crowd',
    role: 'support',
    trigger: { kind: 'beforeBattle' },
    effect: { kind: 'hype', target: 'ownCrew', amount: perPower(1, 2, 3) },
    text: 'Before the battle: its crew gains hype',
  },
  'paid-hecklers': {
    id: 'paid-hecklers',
    name: 'Paid Hecklers',
    role: 'support',
    trigger: { kind: 'choke', subject: 'friend' },
    effect: { kind: 'hype', target: 'enemyCrew', amount: perPower(1, 2, 3) },
    text: 'When a friendly MC chokes: the enemy crew loses hype',
  },
  negotiator: {
    id: 'negotiator',
    name: 'Negotiator',
    role: 'support',
    trigger: { kind: 'upkeep' },
    effect: { kind: 'gold', amount: perPower(1, 2, 3) },
    text: 'Each upkeep: the crew gains gold',
  },
  'shout-out': {
    id: 'shout-out',
    name: 'Shout-out',
    role: 'support',
    trigger: { kind: 'battleStart' },
    effect: { kind: 'buff', target: 'randomFriendOnStage', confidence: perPower(1, 2, 3) },
    text: 'Battle start: a random friendly MC on stage gets confidence',
  },
} as const satisfies Record<string, AbilityDef>;

/** Every ability by id. */
export const ABILITIES: Readonly<Record<AbilityId, AbilityDef>> = {
  ...MC_ABILITIES,
  ...SUPPORT_ABILITIES,
};
