/**
 * The hub's hall of fame tab (§6 Hall of fame, §11 Careers): the crew's titles and a framed
 * portrait of every retired unit that played for it, with its record.
 */

import { ARCHETYPES, type HallOfFameEntry } from '../../core';
import { addUnitFigure } from '../art/unitFigure';
import { crewOutfit, GOLD, GOLD_DARK, INK, UI } from '../palette';
import { addBody, addHeading, addPanel } from '../ui/panel';
import { CONTENT, type TabContext } from './tab';
import { playerShop } from './view';

const FRAME = { width: 228, height: 250, gap: 14, perRow: 5 };

export function renderHallTab(context: TabContext): void {
  const { scene, layer, state } = context;
  const crew = playerShop(state).crew;
  layer.add(
    addPanel(
      scene,
      CONTENT.left,
      CONTENT.top,
      CONTENT.right - CONTENT.left,
      CONTENT.bottom - CONTENT.top,
    ),
  );
  layer.add(
    addHeading(scene, CONTENT.left + 16, CONTENT.top + 12, 'HALL OF FAME', 26, UI.textGold),
  );
  const titles = crew.record.titles.map((title) =>
    title.kind === 'champion'
      ? `Champion, season ${String(title.season)}`
      : `Division ${String(title.division + 1)} winner, season ${String(title.season)}`,
  );
  layer.add(
    addBody(
      scene,
      CONTENT.left + 16,
      CONTENT.top + 50,
      titles.length === 0 ? 'No titles yet.' : `Titles: ${titles.join(' · ')}`,
      16,
    ),
  );
  const entries = [...crew.hallOfFame].reverse();
  if (entries.length === 0) {
    layer.add(
      addBody(
        scene,
        CONTENT.left + 16,
        CONTENT.top + 100,
        'No legends yet. Units retire into the hall of fame of every crew they played for, at the season end.',
        16,
        UI.textMuted,
        900,
      ),
    );
    return;
  }
  const outfit = crewOutfit(crew.identity);
  entries.slice(0, FRAME.perRow * 2).forEach((entry, index) => {
    const x = CONTENT.left + 16 + (index % FRAME.perRow) * (FRAME.width + FRAME.gap);
    const y = CONTENT.top + 84 + Math.floor(index / FRAME.perRow) * (FRAME.height + FRAME.gap);
    drawPortrait(context, entry, x, y, outfit, crew.id);
  });
  if (entries.length > FRAME.perRow * 2) {
    layer.add(
      addBody(
        scene,
        CONTENT.right - 260,
        CONTENT.bottom - 24,
        `and ${String(entries.length - FRAME.perRow * 2)} more legends`,
        14,
        UI.textMuted,
      ),
    );
  }
}

function drawPortrait(
  context: TabContext,
  entry: HallOfFameEntry,
  x: number,
  y: number,
  outfit: ReturnType<typeof crewOutfit>,
  crewId: string,
): void {
  const { scene, layer } = context;
  const frame = scene.add.graphics();
  frame.fillStyle(GOLD_DARK, 1);
  frame.fillRoundedRect(x, y, FRAME.width, FRAME.height, 10);
  frame.fillStyle(GOLD, 1);
  frame.fillRoundedRect(x + 6, y + 6, FRAME.width - 12, FRAME.height - 12, 8);
  frame.fillStyle(0x2c2c48, 1);
  frame.fillRect(x + 16, y + 16, FRAME.width - 32, 130);
  frame.lineStyle(3, INK, 1);
  frame.strokeRoundedRect(x, y, FRAME.width, FRAME.height, 10);
  layer.add(frame);
  const { unit } = entry;
  layer.add(
    addUnitFigure(scene, x + FRAME.width / 2, y + 144, unit, outfit, {
      nameplate: false,
      scale: 0.9,
    }).container,
  );
  const stint = unit.record.crews.find((candidate) => candidate.crewId === crewId);
  const lines = [
    unit.stageName,
    `${ARCHETYPES[unit.archetype].name} · retired after S${String(entry.retiredAfterSeason)}`,
    `${String(stint?.seasons ?? 0)} seasons, ${String(stint?.battles ?? 0)} battles here`,
    `Career: ${String(unit.record.wins)}W of ${String(unit.record.battles)} · ${String(unit.record.barsLanded)} bars`,
  ];
  lines.forEach((line, index) => {
    const text = addBody(
      scene,
      x + FRAME.width / 2,
      y + 154 + index * 21,
      line,
      index === 0 ? 16 : 12,
      UI.textDark,
      FRAME.width - 20,
    ).setOrigin(0.5, 0);
    if (index === 0) text.setFontStyle('bold');
    layer.add(text);
  });
}
