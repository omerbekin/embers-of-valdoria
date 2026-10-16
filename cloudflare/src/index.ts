/**
 * Embers of Valdoria lobi / signaling sunucusu: Cloudflare Worker + Durable Object (lobi kodu başına bir tane).
 * Yalnızca iki tarayıcıyı buluşturur (WebRTC SDP/ICE aktarımı); oyun hamleleri eşler arasında doğrudan akar.
 * Kurallar saf modülde: ./lobby-logic.ts. Kurulum: ../README.md.
 *
 * Tek Worker, tek adres (https://eov.backinn.com.tr): oyunun statik dosyaları Workers Static Assets ile sunulur (wrangler.toml > [assets];
 * yalnızca /lobby ve /lobby/* bu koda gelir, run_worker_first), geri kalan istekler doğrudan dosyadır.
 * Uç nokta: GET /lobby/<KOD>?role=host|guest&id=<16 karakter> (WebSocket yükseltmesi). GET /lobby, /lobby/health -> sağlık metni.
 * Hata raporu (opt-in, 2026-10-16): POST /diag -> KV `DIAG` (30 gün TTL; kurallar ./diag-logic.ts; IP okunmaz/saklanmaz; okuma: npm run diag:pull).
 * Oyundaki adres: data/multiplayer.json > signalingUrl = wss://eov.backinn.com.tr/lobby (istemci sonuna /<KOD> ekler).
 * Sunucu -> istemci: {t:'welcome', role, peer}, {t:'peer', present}, {t:'signal', data}, {t:'relay', d}, {t:'error', code}, {t:'pong'}.
 * İstemci -> sunucu: {t:'signal', data}, {t:'relay', d} (yalnızca WebRTC kurulamazsa), {t:'probe'}, {t:'leave'}, {t:'ping'} (ping'i Cloudflare DO'yu uyandırmadan yanıtlar).
 */
import { DurableObject } from 'cloudflare:workers';
import { parseReport, rateKey, rateOk, reportKey, RATE_WINDOW_SEC, RETENTION_SEC } from './diag-logic';
import { admit, leave, LOBBY_TTL_MS, originAllowed, parseClientMessage, parseJoin, peerAlive, rateAllow, type LobbyState, type RateState, type Role } from './lobby-logic';

interface Env {
  LOBBY: DurableObjectNamespace;
  /** Hata raporları (KV, 30 gün TTL; docs/arch/diagnostics.md). Bağlı değilse /diag 503 döner. */
  DIAG?: KVNamespace;
  ALLOWED_ORIGINS: string;
  /** Oyunun statik dosyaları (../dist). Yerel `wrangler dev` dışında her zaman vardır. */
  ASSETS?: Fetcher;
}

/** Bağlantıya iliştirilen durum (hibernation sonrası da korunur; 2 KB sınırı). */
interface Attachment {
  role: Role;
  id: string;
  since: number;
  rate: RateState;
}

const json = (ws: WebSocket, msg: unknown): void => {
  try {
    ws.send(JSON.stringify(msg));
  } catch {
    /* kapanmış bağlantı */
  }
};

/** Hata koduyla hemen kapanan WebSocket (tarayıcı sebebi okuyabilsin diye 101 ile döner). */
function refuse(code: string): Response {
  const pair = new WebSocketPair();
  const [client, server] = [pair[0], pair[1]];
  server.accept();
  json(server, { t: 'error', code });
  server.close(4000, code);
  return new Response(null, { status: 101, webSocket: client });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const p = url.pathname;
    // Hata raporu (opt-in): POST /diag (yalnızca yazma; okuma ucu yok)
    if (p === '/diag' || p === '/diag/') return handleDiag(req, env);
    if (p === '/lobby' || p === '/lobby/' || p === '/lobby/health' || p === '/health') return new Response('Embers of Valdoria lobby server OK\n', { headers: { 'content-type': 'text/plain' } });
    // Lobi dışı istek (yalnızca statik dosya bulunamadığında buraya düşer): dosya sunucusuna bırakılır (404)
    if (!p.startsWith('/lobby/')) return env.ASSETS ? env.ASSETS.fetch(req) : new Response('Not found', { status: 404 });
    if (req.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('Expected WebSocket', { status: 426 });
    if (!originAllowed(req.headers.get('Origin'), env.ALLOWED_ORIGINS ?? '')) return new Response('Origin not allowed', { status: 403 });
    const join = parseJoin(req.url);
    if (!join) return refuse('bad-request');
    const stub = env.LOBBY.get(env.LOBBY.idFromName(join.code));
    return stub.fetch(req);
  },
};

/** CORS başlıkları: yalnızca izinli kökene yanıt okunabilir (GitHub Pages'teki oyun başka kökendir). */
function cors(origin: string): Record<string, string> {
  return { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400', vary: 'Origin' };
}

/**
 * POST /diag: anonim hata raporu (oyunda opt-in, varsayılan kapalı). Gövde text/plain JSON (sendBeacon; ön kontrol yok), en çok 32 KB.
 * Köken izni (ALLOWED_ORIGINS), şema doğrulama (fazla alan atılır), cihaz kimliği başına hız sınırı, KV'ye 30 gün TTL ile yazım.
 * GİZLİLİK: istemci IP'si (CF-Connecting-IP) ve req.cf konum bilgisi OKUNMAZ ve saklanmaz. Okuma ucu YOK (rapor çekme: npm run diag:pull).
 */
async function handleDiag(req: Request, env: Env): Promise<Response> {
  const origin = req.headers.get('Origin');
  if (!originAllowed(origin, env.ALLOWED_ORIGINS ?? '')) return new Response('Origin not allowed', { status: 403 });
  const h = cors(origin!);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: h });
  if (!env.DIAG) return new Response('Reports not configured', { status: 503, headers: h });
  const len = Number(req.headers.get('content-length') ?? '0');
  if (len > 32768) return new Response('too-large', { status: 413, headers: h });
  const parsed = parseReport(await req.text());
  if (!parsed.ok) return new Response(parsed.error, { status: 400, headers: h });
  const r = parsed.report;
  const now = Date.now();
  const rk = rateKey(r.device, now);
  const count = Number((await env.DIAG.get(rk)) ?? '0') || 0;
  if (!rateOk(count)) return new Response('rate', { status: 429, headers: h });
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => b.toString(16).padStart(2, '0')).join('');
  const iso = new Date(now).toISOString();
  await env.DIAG.put(rk, String(count + 1), { expirationTtl: RATE_WINDOW_SEC });
  await env.DIAG.put(reportKey(iso, rand), JSON.stringify({ ...r, received: iso }), { expirationTtl: RETENTION_SEC, metadata: { kind: r.kind, app: r.app } });
  return new Response('ok', { status: 200, headers: h });
}

export class Lobby extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Canlılık ping'i DO'yu uyandırmadan yanıtlanır; son yanıt zamanı getWebSocketAutoResponseTimestamp ile okunur
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('{"t":"ping"}', '{"t":"pong"}'));
  }

  private async state(): Promise<LobbyState> {
    return ((await this.ctx.storage.get('state')) as LobbyState | undefined) ?? { hostId: null, guestId: null };
  }

  private sockets(role: Role): WebSocket[] {
    return this.ctx.getWebSockets(role);
  }

  private lastSeen(ws: WebSocket): number {
    const a = ws.deserializeAttachment() as Attachment | null;
    const auto = this.ctx.getWebSocketAutoResponseTimestamp(ws);
    return Math.max(a?.since ?? 0, auto ? auto.getTime() : 0);
  }

  private present(role: Role): boolean {
    const now = Date.now();
    return this.sockets(role).some((ws) => peerAlive(this.lastSeen(ws), now));
  }

  async fetch(req: Request): Promise<Response> {
    const join = parseJoin(req.url);
    if (!join) return refuse('bad-request');
    const res = admit(await this.state(), join.role, join.id);
    if (!res.ok) return refuse(res.error);
    await this.ctx.storage.put('state', res.state);
    // Aynı rolün eski bağlantısı (aynı sekmenin kopan bağlantısı) kapatılır
    for (const old of this.sockets(join.role)) {
      try {
        old.close(4001, 'replaced');
      } catch {
        /* zaten kapalı */
      }
    }
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.ctx.acceptWebSocket(server, [join.role]);
    const att: Attachment = { role: join.role, id: join.id, since: Date.now(), rate: { start: Date.now(), count: 0 } };
    server.serializeAttachment(att);
    const other: Role = join.role === 'host' ? 'guest' : 'host';
    json(server, { t: 'welcome', role: join.role, peer: this.present(other) });
    for (const ws of this.sockets(other)) json(ws, { t: 'peer', present: true });
    await this.ctx.storage.setAlarm(Date.now() + LOBBY_TTL_MS);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const att = ws.deserializeAttachment() as Attachment | null;
    if (!att) return ws.close(4002, 'bad-state');
    const rate = rateAllow(att.rate, Date.now());
    att.rate = rate.next;
    ws.serializeAttachment(att);
    if (!rate.ok) {
      json(ws, { t: 'error', code: 'rate' });
      return;
    }
    const msg = parseClientMessage(typeof message === 'string' ? message : '');
    if (!msg) {
      json(ws, { t: 'error', code: 'bad-request' });
      return;
    }
    const other: Role = att.role === 'host' ? 'guest' : 'host';
    if (msg.t === 'signal') {
      for (const peer of this.sockets(other)) json(peer, { t: 'signal', data: msg.data });
    } else if (msg.t === 'relay') {
      // Röle yedeği: doğrudan WebRTC kurulamadıysa oyun mesajı olduğu gibi eşe aktarılır (okunmaz, saklanmaz)
      for (const peer of this.sockets(other)) json(peer, { t: 'relay', d: msg.d });
    } else if (msg.t === 'probe') {
      json(ws, { t: 'peer', present: this.present(other) });
    } else if (msg.t === 'leave') {
      await this.ctx.storage.put('state', leave(await this.state(), att.role));
      for (const peer of this.sockets(other)) {
        json(peer, { t: 'peer', present: false });
        if (att.role === 'host') {
          json(peer, { t: 'error', code: 'no-lobby' });
          peer.close(4003, 'lobby closed');
        }
      }
      ws.close(1000, 'left');
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const att = ws.deserializeAttachment() as Attachment | null;
    try {
      ws.close(1000, 'closed');
    } catch {
      /* zaten kapalı */
    }
    if (!att) return;
    const other: Role = att.role === 'host' ? 'guest' : 'host';
    // Aynı rol yeniden bağlandıysa (replaced) eşe "gitti" deme
    const stillHere = this.sockets(att.role).some((s) => s !== ws && (s.deserializeAttachment() as Attachment | null)?.id === att.id);
    if (!stillHere) for (const peer of this.sockets(other)) json(peer, { t: 'peer', present: false });
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws);
  }

  /** Boşta kalan lobi silinir (kimse bağlı değilse); biri bağlıysa süre uzar. */
  async alarm(): Promise<void> {
    if (this.ctx.getWebSockets().length === 0) await this.ctx.storage.deleteAll();
    else await this.ctx.storage.setAlarm(Date.now() + LOBBY_TTL_MS);
  }
}
