/**
 * Arka arkaya savaş bilgi satırı (Ömer 2026-10-27): The Fighting Pit kademeleri ve Salvage Dive derinlikleri arasında şifa YOKTUR.
 * YENİ MEKANİK DEĞİL, yalnız bilgi: sayılar durumdan / veriden, metin campaign.json > texts (chainPit*, chainDive). Saf: Phaser / DOM yok.
 */
import { CONFIG } from './data';

const fill = (key: string, n: number): string => (CONFIG.texts[key] ?? '').replace('{n}', String(n));

/** Arena satırı: koşu başlamadan toplam kademe ("5 fights in a row"), koşu sürerken kalan ("3 fights left"), son kademede "Last fight". Tek kademelik arenada null. */
export function pitChainLine(v: { tiers: unknown[]; wins: number | null }): string | null {
  const total = v.tiers.length;
  if (total < 2) return null;
  if (v.wins === null) return fill('chainPit', total);
  const left = total - v.wins;
  if (left <= 0) return null;
  return left === 1 ? fill('chainPitLast', 1) : fill('chainPitLeft', left);
}

/** Dalış satırı: savaşılacak derinlik (2+; ilk savaş yüzeydedir, öncesinde dinlenme sorunu yok). */
export function diveChainLine(depth: number): string | null {
  return depth >= 2 ? fill('chainDive', depth) : null;
}
