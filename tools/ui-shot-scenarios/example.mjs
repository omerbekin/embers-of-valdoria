// Örnek senaryo: ana menü, sonra debug menüsünü aç, kısa animasyon karesi al.
export default async ({ page, shot, wait }) => {
  await shot('menu');
  await page.keyboard.press('F2'); // debug menüsü
  await wait(500);
  await shot('debug');
  await page.keyboard.press('F2');
  await shot.burst('anim', 200, 3); // 3 kare, 200 ms arayla
};
