// Ortak DOM ipucu göster/gizle (Ömer 2026-10-19; Gear'deki "hayalet ipucu" düzeltmesinin ortak hali, ilk uygulama ItemTip'teydi).
// Sorun: sekme arka plandayken / önizleme gizliyken CSS geçişleri donar, kapanan ipucu yarı saydam "hayalet" olarak kalırdı.
// Çözüm: gizlerken `on` sınıfı kalkar, solma süresinden sonra satır içi `display: none` kesin kapatır; gösterirken geri açılır.
const timers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

/** İpucunu göster (`on` sınıfı; gizleme zamanlayıcısı iptal, display geri açılır). */
export function tipOn(box: HTMLElement): void {
  clearTimeout(timers.get(box));
  if (box.style.display === 'none') {
    box.style.display = '';
    void box.offsetWidth; // yeniden akış: belirme solması display: none'dan sonra da çalışsın
  }
  box.classList.add('on');
}

/** İpucunu gizle: solma + `ms` sonra display: none (arada tekrar gösterilmediyse). */
export function tipOff(box: HTMLElement, ms = 200): void {
  box.classList.remove('on');
  clearTimeout(timers.get(box));
  timers.set(
    box,
    setTimeout(() => {
      if (!box.classList.contains('on')) box.style.display = 'none';
    }, ms),
  );
}
