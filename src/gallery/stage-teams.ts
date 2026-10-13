import { content } from '../engine';

/** Hücre listesi (dizin = yuva): verilen sınıfları sırayla ilk hücrelere koyar. */
const cellsOf = (ids: string[]): string[] => {
  const cells: string[] = Array.from({ length: content.CELL_COUNT }, () => '');
  ids.slice(0, cells.length).forEach((id, i) => (cells[i] = id));
  return cells;
};

/** Önizleme sahnesinin takımları (Phaser'sız): oyuncu tarafında tüm class'lar (her skill'in sahibi sahnede), düşman tarafında 6 class. */
export function stageTeams(): { party: string[]; enemies: string[] } {
  // sanatı ödünç alan debug class'ları (Pose Tester I/II; skill'leri gerçek skill kopyası) sahneye girmez: 12 hücre gerçek sınıflara yeter
  // test class'ları (testOnly: Geometer, Pose Tester'lar; Codex'te yok, yalnızca debug menüsünde) da girmez
  const all = content.arrangeTeam(Object.keys(content.classes).filter((id) => !content.classes[id]!.testOnly && !content.classes[id]!.skills.every((s) => content.skills[s]?.artOf)));
  return { party: cellsOf(all), enemies: cellsOf(all.slice(0, 6)) };
}
