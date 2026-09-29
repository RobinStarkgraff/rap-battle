/**
 * The hub's hall of fame tab (§6 Hall of fame, §11 Careers): the crew's titles and a framed
 * portrait of every retired unit that played for it, with its record.
 */

import { ARCHETYPES, type HallOfFameEntry } from '../../core';
import { addUnitFigure } from '../art/unitFigure';
import { crewOutfit, GOLD, GOLD_DARK, INK, UI } from '../palette';
import { addButton } from '../ui/button';
import { addBody, addHeading, addPanel } from '../ui/panel';
import { hallPage, HALL_PER_ROW, titleSummary, type HallUi } from './hallView';
import { CONTENT, type TabContext } from './tab';
import { playerShop } from './view';

const FRAME = { width: 228, height: 214, gap: 12, perRow: HALL_PER_ROW };
/** Where the first row of portraits starts, below the heading and the titles. */
const FRAMES_TOP = CONTENT.top + 80;
export function renderHallTab(context: TabContext, ui: HallUi): void {
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
  layer.add(
    addBody(scene, CONTENT.left + 16, CONTENT.top + 50, titleSummary(crew.record.titles), 16),
  );
  if (crew.hallOfFame.length === 0) {
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
  const view = hallPage(crew.hallOfFame, ui.page);
  ui.page = view.page;
  view.shown.forEach((entry, index) => {
    const x = CONTENT.left + 16 + (index % FRAME.perRow) * (FRAME.width + FRAME.gap);
    const y = FRAMES_TOP + Math.floor(index / FRAME.perRow) * (FRAME.height + FRAME.gap);
    drawPortrait(context, entry, x, y, outfit, crew.id);
  });
  if (view.pages > 1) drawPager(context, ui, view.page, view.pages, crew.hallOfFame.length);
}

function drawPager(
  context: TabContext,
  ui: HallUi,
  page: number,
  pages: number,
  total: number,
): void {
  const { scene, layer } = context;
  const y = CONTENT.top + 30;
  const right = CONTENT.right - 20;
  const turn = (
    delta: number,
    label: string,
    target: string,
    x: number,
    enabled: boolean,
  ): void => {
    const button = addButton(
      scene,
      x,
      y,
      label,
      () => {
        ui.page = page + delta;
        context.refresh();
      },
      { width: 44, height: 30, fontSize: 16, plain: true, target },
    ).setEnabled(enabled);
    layer.add(button.container);
  };
  turn(-1, '◀', 'hall-prev', right - 150, page > 0);
  turn(1, '▶', 'hall-next', right - 22, page < pages - 1);
  layer.add(
    addBody(scene, right - 180, y, `${String(total)} legends`, 13, UI.textMuted).setOrigin(1, 0.5),
  );
  layer.add(
    addBody(
      scene,
      right - 86,
      y,
      `${String(page + 1)} / ${String(pages)}`,
      13,
      UI.textMuted,
    ).setOrigin(0.5),
  );
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
  frame.fillStyle(UI.panelLight, 1);
  frame.fillRect(x + 16, y + 16, FRAME.width - 32, 104);
  frame.lineStyle(3, INK, 1);
  frame.strokeRoundedRect(x, y, FRAME.width, FRAME.height, 10);
  layer.add(frame);
  const { unit } = entry;
  layer.add(
    addUnitFigure(scene, x + FRAME.width / 2, y + 118, unit, outfit, {
      nameplate: false,
      scale: 0.72,
    }).container,
  );
  const stint = unit.record.crews.find((candidate) => candidate.crewId === crewId);
  const lines = [
    unit.stageName,
    `${ARCHETYPES[unit.archetype].name} · retired after S${String(entry.retiredAfterSeason)}`,
    `${plural(stint?.seasons ?? 0, 'season')}, ${plural(stint?.battles ?? 0, 'battle')} here`,
    `Career: ${String(unit.record.wins)}W of ${String(unit.record.battles)} · ${String(unit.record.barsLanded)} bars`,
  ];
  lines.forEach((line, index) => {
    const text = addBody(
      scene,
      x + FRAME.width / 2,
      y + 126 + index * 20,
      line,
      index === 0 ? 16 : 12,
      UI.textDark,
      FRAME.width - 20,
    ).setOrigin(0.5, 0);
    if (index === 0) text.setFontStyle('bold');
    layer.add(text);
  });
}

function plural(count: number, word: string): string {
  return `${String(count)} ${word}${count === 1 ? '' : 's'}`;
}
