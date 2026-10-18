/**
 * Skill efektlerinin genel boyut çarpanı (Ömer 2026-10-18: "tüm skill efektleri %20 küçük"). TEK değer, veride:
 * data/battle-layout.json > animation.mobVfx.scale. Sınıf (v1/v2) efektlerinin parçacık/halka/sprite/sheet boyutlarına ve mob sheet'lerine uygulanır.
 */
import layout from '../../data/battle-layout.json';


/** Tek hedefli mermi nerede patlar: hedef gövdesinin saldırgana bakan kenarı = merkezden (gövde genişliği x bu oran) saldırgana doğru (data/battle-layout.json > animation.contactEdgeRatio). */
export const CONTACT_EDGE_RATIO: number = (layout.animation as { contactEdgeRatio?: number }).contactEdgeRatio ?? 0;
