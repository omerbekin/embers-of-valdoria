/**
 * Hesap ekranlarının konuştuğu API (src/cloud/cloud.ts). Debug önizlemesi (Data > Cloud > "Preview signed in") gerçek istemci yerine örnek veri
 * verir (src/cloud/ui/sample.ts); ekranlar yalnızca `accountApi()` çağırır.
 */
import * as cloud from '../cloud';
import type { AccountState, ActionResult, CloudEvent, CloudStatus, LoginMode, LoginProvider } from '../cloud';

export interface AccountApi {
  isLoginAvailable(): boolean;
  checkLoginAvailable(): Promise<boolean>;
  getAccount(): AccountState;
  getCloudStatus(): CloudStatus;
  startLogin(opts: { provider: LoginProvider; mode?: LoginMode; consentAccepted: boolean }): ActionResult;
  signOut(): Promise<ActionResult>;
  deleteAccount(): Promise<ActionResult>;
  setDisplayName(name: string): Promise<{ ok: true; displayName: string } | { ok: false; reason: string }>;
  syncNow(): Promise<CloudStatus>;
  subscribe(fn: (e: CloudEvent) => void): () => void;
}

export const realAccountApi: AccountApi = {
  isLoginAvailable: cloud.isLoginAvailable,
  checkLoginAvailable: cloud.checkLoginAvailable,
  getAccount: cloud.getAccount,
  getCloudStatus: cloud.getCloudStatus,
  startLogin: cloud.startLogin,
  signOut: cloud.signOut,
  deleteAccount: cloud.deleteAccount,
  setDisplayName: cloud.setDisplayName,
  syncNow: cloud.syncNow,
  subscribe: cloud.subscribe,
};

let preview: AccountApi | null = null;

/** Debug: örnek veriyle önizleme (null = gerçek istemci). */
export function setAccountPreview(api: AccountApi | null): void {
  preview = api;
}

export const accountPreviewOn = (): boolean => !!preview;

export const accountApi = (): AccountApi => preview ?? realAccountApi;

/** Tarayıcı çevrimiçi mi (giriş satırları çevrimdışıyken kapalı). */
export const isOnline = (): boolean => typeof navigator === 'undefined' || navigator.onLine !== false;
