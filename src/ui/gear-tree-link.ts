// Gear > Sheet sağ paneli: "Go to skill tree" (Ömer 2026-11-01). Kutusuz Cinzel yazı düğmesi, ince altın çizgiler (gear.css > .gr-ms-go);
// tıklayınca aynı kahramanla Tree sekmesi açılır (çağıran `go` verir). Ayrı dosya: ekranın geri kalanı olmadan sınanabilsin.
export function goToTreeButton(go: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = 'gr-ms-go';
  b.type = 'button';
  b.dataset['go'] = 'tree';
  const t = document.createElement('span');
  t.textContent = 'Go to skill tree';
  const arrow = document.createElement('i');
  arrow.textContent = '›';
  b.append(t, arrow);
  b.addEventListener('click', go);
  return b;
}
