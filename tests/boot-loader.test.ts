import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Kısa yükleyici (src/ui/boot-loader.ts): 0.8.3.8'de savaşa girerken ekran dakikalarca siyah kalıyordu. İki sebep:
 *  1) kod parçası inince başlayan kapanış zamanlayıcısı, hemen ardından açılan sahne yüklemesi kutusunu 420 ms sonra gizliyordu;
 *  2) dosya sayısı preloadAssets çağrısında ölçülüyordu; pozlar / efekt sayfaları ondan SONRA kuyruğa girince kutu hiç açılmıyordu.
 * DOM yok: #boot öğesi ve window zamanlayıcıları küçük taklitlerle.
 */

class FakeClassList {
  readonly set = new Set<string>();
  add(...c: string[]): void {
    for (const x of c) this.set.add(x);
  }
  remove(...c: string[]): void {
    for (const x of c) this.set.delete(x);
  }
  contains(c: string): boolean {
    return this.set.has(c);
  }
}

type Fn = (v: number) => void;
class FakeLoader {
  list = { size: 0 };
  private handlers = new Map<string, Array<{ fn: Fn; once: boolean }>>();
  on(ev: string, fn: Fn): this {
    this.add(ev, fn, false);
    return this;
  }
  once(ev: string, fn: Fn): this {
    this.add(ev, fn, true);
    return this;
  }
  private add(ev: string, fn: Fn, once: boolean): void {
    const a = this.handlers.get(ev) ?? [];
    a.push({ fn, once });
    this.handlers.set(ev, a);
  }
  emit(ev: string, v = 0): void {
    const a = this.handlers.get(ev) ?? [];
    this.handlers.set(
      ev,
      a.filter((h) => !h.once),
    );
    for (const h of a) h.fn(v);
  }
}

let boot: { classList: FakeClassList; querySelector: () => null };

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetModules();
  boot = { classList: new FakeClassList(), querySelector: () => null };
  vi.stubGlobal('window', { setTimeout, clearTimeout });
  vi.stubGlobal('document', { getElementById: (id: string) => (id === 'boot' ? boot : null) });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const hidden = () => boot.classList.contains('boot-hidden') || boot.classList.contains('boot-off');

describe('boot-loader kısa yükleyici', () => {
  it('sahnenin dosyaları preloadAssets çağrısından SONRA kuyruğa girse de kutu açılır ve yükleme bitene kadar açık kalır', async () => {
    const bl = await import('../src/ui/boot-loader');
    bl.markBootReady();
    vi.advanceTimersByTime(2000);
    expect(hidden()).toBe(true);

    const loader = new FakeLoader();
    bl.trackSceneLoad(loader); // preloadAssets: henüz dosya yok (sprite'lar zaten yüklü)
    loader.list.size = 300; // pozlar + efekt sayfaları kuyruğa girer
    loader.emit('start'); // Phaser preload biter bitmez start'ı çağırır
    vi.advanceTimersByTime(200);
    expect(hidden()).toBe(false);
    vi.advanceTimersByTime(60_000); // uzun indirme boyunca açık kalır
    expect(hidden()).toBe(false);
    loader.emit('complete');
    vi.advanceTimersByTime(1000);
    expect(hidden()).toBe(true);
  });

  it('kod parçası yüklemesinin kapanışı hemen ardından açılan sahne yüklemesinin kutusunu gizlemez', async () => {
    const bl = await import('../src/ui/boot-loader');
    bl.markBootReady();
    vi.advanceTimersByTime(2000);

    let resolve!: () => void;
    const chunk = bl.trackChunkLoad(new Promise<void>((r) => (resolve = r)));
    vi.advanceTimersByTime(200); // parça yavaş: kutu açık
    expect(hidden()).toBe(false);
    resolve();
    await chunk;
    await Promise.resolve();

    const loader = new FakeLoader();
    bl.trackSceneLoad(loader);
    loader.list.size = 50;
    loader.emit('start');
    vi.advanceTimersByTime(5000); // eskiden 250 + 420 ms sonra gizleniyordu
    expect(hidden()).toBe(false);
    loader.emit('complete');
    vi.advanceTimersByTime(1000);
    expect(hidden()).toBe(true);
  });

  it('kuyrukta dosya yoksa kutu açılmaz', async () => {
    const bl = await import('../src/ui/boot-loader');
    bl.markBootReady();
    vi.advanceTimersByTime(2000);
    const loader = new FakeLoader();
    bl.trackSceneLoad(loader);
    loader.emit('start');
    loader.emit('complete');
    vi.advanceTimersByTime(1000);
    expect(hidden()).toBe(true);
  });
});
