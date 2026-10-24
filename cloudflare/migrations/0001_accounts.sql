-- Hesap / bulut kaydı (Faz 1a; docs/arch/accounts-plan.md). D1 veritabanı `eov-accounts`, binding `DB`.
-- Uygulama: npm --prefix cloudflare exec -- wrangler d1 migrations apply eov-accounts --local   (yayında --remote)
-- Zaman damgaları: Unix milisaniye (INTEGER). Toplanmayan: e-posta, avatar, IP, user agent, sağlayıcı access token'ı.

-- Hesap. display_name oyuncunun kendi seçtiği ad (ilk girişte sorulur; sağlayıcıdan alınmaz), seçilene kadar NULL.
-- last_login_at: son giriş / etkinlik; 24 ay eskiyse hesap otomatik silinir (Worker cron, deleteInactiveAccounts).
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  last_login_at INTEGER NOT NULL,
  display_name TEXT
);
CREATE INDEX users_last_login_at ON users (last_login_at);

-- Sağlayıcı kimliği (Google `sub`, Discord kullanıcı id'si). 'dev' yalnızca localhost'ta DEV_AUTH=1 ile (sahte sağlayıcı).
-- Bir hesaba ikinci sağlayıcı yalnızca açık mode=link ile bağlanır.
CREATE TABLE identities (
  provider TEXT NOT NULL CHECK (provider IN ('google', 'discord', 'dev')),
  sub TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (provider, sub)
);
CREATE INDEX identities_user_id ON identities (user_id);

-- Oturum: çerezdeki opak token'ın yalnızca SHA-256 özeti (hex) saklanır.
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_user_id ON sessions (user_id);
CREATE INDEX sessions_expires_at ON sessions (expires_at);

-- Bulut kaydı (hesap başına bir satır). blob: senkron anahtarlarının ham dizgileri ({anahtar: dizgi} JSON).
-- versions: anahtar başına şema sürümü JSON ({"eov.campaign.v1": 12, ...}). prev_*: bir önceki kayıt (restore-previous).
-- tombstones: silinmiş Ironman slotlarının izleri JSON dizisi [{slot, campaignId, deletedAt}] (en çok 32); sunucu yorumlamaz,
-- yalnızca saklar/döner (birleştirme istemcide). prev_tombstones: prev_blob ile birlikte (restore-previous tutarlı kalsın).
-- D1 satır sınırı 2.000.000 bayt: blob + prev_blob birlikte sığsın diye blob en çok MAX_BLOB_BYTES (save-logic.ts).
CREATE TABLE saves (
  user_id TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  rev INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  versions TEXT NOT NULL,
  app TEXT NOT NULL,
  size INTEGER NOT NULL,
  hash TEXT NOT NULL,
  blob TEXT NOT NULL,
  tombstones TEXT NOT NULL DEFAULT '[]',
  prev_blob TEXT,
  prev_versions TEXT,
  prev_tombstones TEXT
);
