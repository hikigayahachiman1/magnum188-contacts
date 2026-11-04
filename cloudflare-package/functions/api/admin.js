const CHANNELS = [
  "whatsapp",
  "telegram",
  "telegram_channel",
  "livechat",
  "whatsapp_group",
  "telegram_group",
  "facebook_group",
  "alternative",
  "apk_download",
];

const DEFAULT_APK_URL = "https://shrtl.sbs/apkmagnum188";

const DEFAULT_DISPLAY_ORDER = [
  "whatsapp",
  "telegram",
  "telegram_channel",
  "livechat",
  "whatsapp_group",
  "telegram_group",
  "facebook_group",
];
const DISPLAY_ORDER_KEY = "display:order";
const DEFAULT_LABELS = {
  whatsapp: "WhatsApp Official",
  telegram: "Telegram Official",
  telegram_channel: "Channel Telegram Official",
  livechat: "LiveChat Official",
  whatsapp_group: "Grup WhatsApp Official",
  telegram_group: "Grup Telegram Official",
  facebook_group: "Grup Facebook Official",
  alternative: "LINK ALTERNATIF",
  apk_download: "DOWNLOAD APK M188",
};
const MAX_LABEL_CHARS = 60;

const ALLOWED_HOSTS = {
  whatsapp: new Set(["api.whatsapp.com", "wa.me", "pasticuan.me", "www.pasticuan.me"]),
  telegram: new Set(["t.me", "telegram.me", "pasticuan.me", "www.pasticuan.me"]),
  telegram_channel: new Set(["t.me", "telegram.me", "pasticuan.me", "www.pasticuan.me"]),
  livechat: new Set(["direct.lc.chat", "pasticuan.me", "www.pasticuan.me"]),
  whatsapp_group: new Set(["chat.whatsapp.com", "pasticuan.me", "www.pasticuan.me"]),
  telegram_group: new Set(["t.me", "telegram.me", "pasticuan.me", "www.pasticuan.me"]),
  facebook_group: new Set(["facebook.com", "www.facebook.com", "pasticuan.me", "www.pasticuan.me"]),
  apk_download: new Set(["shrtl.sbs", "www.shrtl.sbs", "pasticuan.me", "www.pasticuan.me", "livemagnum188.chat", "www.livemagnum188.chat"]),
  alternative: new Set([
    "pasticuan.me",
    "www.pasticuan.me",
    "shrtl.sbs",
    "www.shrtl.sbs",
    "livemagnum188.chat",
    "www.livemagnum188.chat",
    "heylink.me",
    "www.heylink.me",
  ]),
};

const COOKIE_NAME = "__Host-magnum_admin_session";
const SESSION_SECONDS = 2 * 60 * 60;
const MAX_BODY_BYTES = 128 * 1024;
const MAX_PASSWORD_CHARS = 256;
const MAX_URL_CHARS = 2048;
const MAX_DRAWER_ITEMS = 50;
const encoder = new TextEncoder();

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY",
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Resource-Policy": "same-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
      ...extraHeaders,
    },
  });
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function stringToBase64Url(value) {
  return bytesToBase64Url(encoder.encode(value));
}

function base64UrlToBytes(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function importSigningKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function createSession(secret) {
  const nonce = crypto.getRandomValues(new Uint8Array(24));
  const payload = stringToBase64Url(
    JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
      jti: bytesToBase64Url(nonce),
    }),
  );
  const key = await importSigningKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return `${payload}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

async function verifySession(token, secret) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length !== 2) return false;
    const [payload, signature] = parts;
    if (!payload || !signature) return false;
    const key = await importSigningKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlToBytes(signature),
      encoder.encode(payload),
    );
    if (!valid) return false;
    const data = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload)));
    return (
      Number(data.exp) > Math.floor(Date.now() / 1000) &&
      typeof data.jti === "string" &&
      data.jti.length >= 32
    );
  } catch {
    return false;
  }
}

function readCookie(request, name) {
  const cookies = request.headers.get("Cookie") || "";
  for (const item of cookies.split(";")) {
    const separator = item.indexOf("=");
    if (separator < 0) continue;
    const key = item.slice(0, separator).trim();
    if (key === name) return item.slice(separator + 1).trim();
  }
  return "";
}

async function equalSecret(left, right) {
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(String(left))),
    crypto.subtle.digest("SHA-256", encoder.encode(String(right))),
  ]);
  const a = new Uint8Array(leftHash);
  const b = new Uint8Array(rightHash);
  let difference = a.length ^ b.length;
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    difference |= a[index] ^ b[index];
  }
  return difference === 0;
}

function isSameOrigin(request) {
  const origin = request.headers.get("Origin");
  return origin === new URL(request.url).origin;
}

function isJsonRequest(request) {
  const type = String(request.headers.get("Content-Type") || "").toLowerCase();
  return type.startsWith("application/json");
}

function bodyIsTooLarge(request) {
  const length = Number(request.headers.get("Content-Length") || "0");
  return Number.isFinite(length) && length > MAX_BODY_BYTES;
}

async function readJsonBody(request) {
  if (!isJsonRequest(request)) {
    return { response: json({ ok: false, error: "CONTENT_TYPE_DITOLAK" }, 415) };
  }
  if (bodyIsTooLarge(request)) {
    return { response: json({ ok: false, error: "DATA_TERLALU_BESAR" }, 413) };
  }

  let raw;
  try {
    raw = await request.text();
  } catch {
    return { response: json({ ok: false, error: "DATA_TIDAK_VALID" }, 400) };
  }
  if (encoder.encode(raw).byteLength > MAX_BODY_BYTES) {
    return { response: json({ ok: false, error: "DATA_TERLALU_BESAR" }, 413) };
  }

  try {
    return { data: JSON.parse(raw) };
  } catch {
    return { response: json({ ok: false, error: "DATA_TIDAK_VALID" }, 400) };
  }
}

function validateTarget(channel, value) {
  const target = String(value || "").trim();
  if (!target) return { ok: true, value: "" };
  if (target.length > MAX_URL_CHARS) return { ok: false };

  try {
    const url = new URL(target);
    const hostname = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || !ALLOWED_HOSTS[channel].has(hostname)) {
      return { ok: false };
    }
    url.hash = "";
    return { ok: true, value: url.toString() };
  } catch {
    return { ok: false };
  }
}

function validateDisplayOrder(value) {
  if (!Array.isArray(value) || value.length !== DEFAULT_DISPLAY_ORDER.length) return null;
  const allowed = new Set(DEFAULT_DISPLAY_ORDER);
  const unique = new Set(value);
  if (unique.size !== DEFAULT_DISPLAY_ORDER.length) return null;
  if (value.some((channel) => typeof channel !== "string" || !allowed.has(channel))) return null;
  return [...value];
}

function parseStoredDisplayOrder(value) {
  if (!value) return [...DEFAULT_DISPLAY_ORDER];
  try {
    return validateDisplayOrder(JSON.parse(value)) || [...DEFAULT_DISPLAY_ORDER];
  } catch {
    return [...DEFAULT_DISPLAY_ORDER];
  }
}

function validateLabel(channel, value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return { ok: true, value: DEFAULT_LABELS[channel] };
  }
  const label = String(value).replace(/\s+/g, " ").trim();
  if (label.length > MAX_LABEL_CHARS || /[<>\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/i.test(label)) return { ok: false };
  return { ok: true, value: label };
}

function defaultAdminDrawer(channel, directUrl) {
  if (channel !== "telegram_group") return { enabled: false, items: [] };
  return {
    enabled: true,
    items: [
      {
        id: "telegram-group-1",
        label: "Grup Telegram Official 1",
        url: directUrl || "",
        active: Boolean(directUrl),
      },
      {
        id: "telegram-group-2",
        label: "Grup Telegram Official 2",
        url: "",
        active: false,
      },
    ],
  };
}

function parseAdminDrawer(channel, value, directUrl) {
  if (!value) return defaultAdminDrawer(channel, directUrl);
  try {
    const drawer = JSON.parse(value);
    if (!drawer || typeof drawer.enabled !== "boolean" || !Array.isArray(drawer.items)) {
      return defaultAdminDrawer(channel, directUrl);
    }
    return {
      enabled: drawer.enabled,
      items: drawer.items.slice(0, MAX_DRAWER_ITEMS).map((item) => ({
        id: String(item && item.id || ""),
        label: String(item && item.label || ""),
        url: String(item && item.url || ""),
        active: Boolean(item && item.active),
      })),
    };
  } catch {
    return defaultAdminDrawer(channel, directUrl);
  }
}

function validateDrawer(channel, value) {
  if (!value || typeof value.enabled !== "boolean" || !Array.isArray(value.items)) return null;
  if (value.items.length > MAX_DRAWER_ITEMS) return null;

  const ids = new Set();
  const items = [];
  for (const rawItem of value.items) {
    if (!rawItem || typeof rawItem.active !== "boolean") return null;
    const rawLabel = String(rawItem.label || "").trim();
    const rawUrl = String(rawItem.url || "").trim();
    if (!rawItem.active && !rawLabel && !rawUrl) continue;
    const id = String(rawItem.id || "").trim();
    if (!/^[a-zA-Z0-9_-]{8,64}$/.test(id) || ids.has(id)) return null;
    ids.add(id);

    const checkedLabel = validateLabel(channel, rawLabel);
    const checkedUrl = validateTarget(channel, rawUrl);
    if (!rawLabel || !checkedLabel.ok || !checkedUrl.ok) return null;
    if (rawItem.active && !checkedUrl.value) return null;
    items.push({ id, label: checkedLabel.value, url: checkedUrl.value, active: rawItem.active });
  }
  return { enabled: value.enabled, items };
}

function clientAddress(request) {
  return request.headers.get("CF-Connecting-IP") || "unknown";
}

async function attemptKey(request) {
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(clientAddress(request)));
  return `admin:login:${bytesToBase64Url(new Uint8Array(hash)).slice(0, 24)}`;
}

async function requireAdmin(context) {
  const token = readCookie(context.request, COOKIE_NAME);
  return verifySession(token, context.env.SESSION_SECRET);
}

async function handleLogin(context) {
  if (!isSameOrigin(context.request)) {
    return json({ ok: false, error: "ORIGIN_DITOLAK" }, 403);
  }
  const key = await attemptKey(context.request);
  const attempts = Number((await context.env.CONTACTS.get(key)) || "0");
  if (attempts >= 5) {
    return json(
      { ok: false, error: "TERLALU_BANYAK_PERCOBAAN", message: "Tunggu 15 menit lalu coba kembali." },
      429,
    );
  }

  const parsed = await readJsonBody(context.request);
  if (parsed.response) return parsed.response;
  const body = parsed.data;

  const password = String(body.password || "");
  if (!password || password.length > MAX_PASSWORD_CHARS) {
    return json({ ok: false, error: "DATA_TIDAK_VALID" }, 400);
  }

  if (!(await equalSecret(password, context.env.ADMIN_PASSWORD))) {
    await context.env.CONTACTS.put(key, String(attempts + 1), { expirationTtl: 900 });
    return json({ ok: false, error: "LOGIN_GAGAL", message: "Password admin salah." }, 401);
  }

  await context.env.CONTACTS.delete(key);
  const session = await createSession(context.env.SESSION_SECRET);
  return json(
    { ok: true },
    200,
    {
      "Set-Cookie": `${COOKIE_NAME}=${session}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Strict; Priority=High`,
    },
  );
}

async function handleGetContacts(context) {
  if (!(await requireAdmin(context))) {
    return json({ ok: false, error: "BELUM_LOGIN" }, 401);
  }

  const [links, statuses, labels, drawerValues, updatedAt, storedOrder] = await Promise.all([
    Promise.all(CHANNELS.map((channel) => context.env.CONTACTS.get(channel))),
    Promise.all(CHANNELS.map((channel) => context.env.CONTACTS.get(`status:${channel}`))),
    Promise.all(CHANNELS.map((channel) => context.env.CONTACTS.get(`label:${channel}`))),
    Promise.all(CHANNELS.map((channel) => context.env.CONTACTS.get(`drawer:${channel}`))),
    context.env.CONTACTS.get("admin:updated_at"),
    context.env.CONTACTS.get(DISPLAY_ORDER_KEY),
  ]);

  const contacts = {};
  const drawers = {};
  CHANNELS.forEach((channel, index) => {
    // Default hanya berlaku sebelum pertama kali dikonfigurasi di panel admin.
    const url = links[index] || (channel === "apk_download" && !statuses[index] ? DEFAULT_APK_URL : "");
    contacts[channel] = {
      url,
      active: statuses[index]
        ? statuses[index] !== "inactive"
        : Boolean(url),
      label: labels[index] || DEFAULT_LABELS[channel],
    };
    drawers[channel] = parseAdminDrawer(channel, drawerValues[index], url);
  });

  return json({
    ok: true,
    contacts,
    drawers,
    order: parseStoredDisplayOrder(storedOrder),
    updatedAt: updatedAt || null,
  });
}

async function handleSave(context) {
  if (!isSameOrigin(context.request)) {
    return json({ ok: false, error: "ORIGIN_DITOLAK" }, 403);
  }
  if (!(await requireAdmin(context))) {
    return json({ ok: false, error: "BELUM_LOGIN" }, 401);
  }
  const parsed = await readJsonBody(context.request);
  if (parsed.response) return parsed.response;
  const body = parsed.data;

  const incoming = body && body.contacts;
  const incomingDrawers = body && body.drawers;
  if (!incoming || typeof incoming !== "object") {
    return json({ ok: false, error: "DATA_TIDAK_LENGKAP" }, 400);
  }
  if (!incomingDrawers || typeof incomingDrawers !== "object") {
    return json({ ok: false, error: "DATA_LACI_TIDAK_LENGKAP" }, 400);
  }

  let displayOrder;
  if (Object.prototype.hasOwnProperty.call(body, "order")) {
    displayOrder = validateDisplayOrder(body.order);
    if (!displayOrder) {
      return json({ ok: false, error: "URUTAN_TIDAK_VALID", message: "Urutan link tidak valid." }, 400);
    }
  } else {
    displayOrder = parseStoredDisplayOrder(await context.env.CONTACTS.get(DISPLAY_ORDER_KEY));
  }

  const clean = {};
  const cleanDrawers = {};
  for (const channel of CHANNELS) {
    const item = incoming[channel];
    if (!item || typeof item.active !== "boolean") {
      return json({ ok: false, error: "STATUS_TIDAK_VALID", channel }, 400);
    }
    const checked = validateTarget(channel, item.url);
    if (!checked.ok) {
      return json(
        { ok: false, error: "DOMAIN_TIDAK_DIIZINKAN", channel, message: `Link ${channel} tidak diizinkan.` },
        400,
      );
    }
    const checkedDrawer = validateDrawer(channel, incomingDrawers[channel]);
    if (!checkedDrawer) {
      return json(
        { ok: false, error: "LACI_TIDAK_VALID", channel, message: `Folder laci ${channel} tidak valid.` },
        400,
      );
    }
    if (item.active && !checkedDrawer.enabled && !checked.value) {
      return json(
        { ok: false, error: "LINK_AKTIF_KOSONG", channel, message: `Isi link ${channel} atau nonaktifkan statusnya.` },
        400,
      );
    }
    if (item.active && checkedDrawer.enabled && !checkedDrawer.items.some((drawerItem) => drawerItem.active)) {
      return json(
        { ok: false, error: "LACI_AKTIF_KOSONG", channel, message: `Tambahkan minimal satu link aktif di laci ${channel}.` },
        400,
      );
    }
    const checkedLabel = validateLabel(channel, item.label);
    if (!checkedLabel.ok) {
      return json(
        { ok: false, error: "NAMA_TIDAK_VALID", channel, message: `Nama ${channel} tidak valid atau terlalu panjang.` },
        400,
      );
    }
    clean[channel] = { url: checked.value, active: item.active, label: checkedLabel.value };
    cleanDrawers[channel] = checkedDrawer;
  }

  const updatedAt = new Date().toISOString();
  const writes = [];
  for (const channel of CHANNELS) {
    const item = clean[channel];
    writes.push(
      item.url
        ? context.env.CONTACTS.put(channel, item.url)
        : context.env.CONTACTS.delete(channel),
    );
    writes.push(
      context.env.CONTACTS.put(`status:${channel}`, item.active ? "active" : "inactive"),
    );
    writes.push(context.env.CONTACTS.put(`label:${channel}`, item.label));
    writes.push(context.env.CONTACTS.put(`drawer:${channel}`, JSON.stringify(cleanDrawers[channel])));
  }
  writes.push(context.env.CONTACTS.put("admin:updated_at", updatedAt));
  writes.push(context.env.CONTACTS.put(DISPLAY_ORDER_KEY, JSON.stringify(displayOrder)));
  await Promise.all(writes);

  return json({ ok: true, updatedAt });
}

async function handleLogout(context) {
  if (!isSameOrigin(context.request)) {
    return json({ ok: false, error: "ORIGIN_DITOLAK" }, 403);
  }
  return json(
    { ok: true },
    200,
    {
      "Set-Cookie": `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict; Priority=High`,
    },
  );
}

export async function onRequest(context) {
  if (
    !context.env.CONTACTS ||
    !context.env.ADMIN_PASSWORD ||
    !context.env.SESSION_SECRET ||
    String(context.env.ADMIN_PASSWORD).length < 10 ||
    String(context.env.SESSION_SECRET).length < 32
  ) {
    return json(
      { ok: false, error: "ADMIN_BELUM_DIKONFIGURASI", message: "Periksa CONTACTS, ADMIN_PASSWORD, dan SESSION_SECRET." },
      503,
    );
  }

  const url = new URL(context.request.url);
  const action = url.searchParams.get("action") || "contacts";
  const method = context.request.method.toUpperCase();

  if (action === "login" && method === "POST") return handleLogin(context);
  if (action === "contacts" && method === "GET") return handleGetContacts(context);
  if (action === "save" && method === "POST") return handleSave(context);
  if (action === "logout" && method === "POST") return handleLogout(context);

  return json({ ok: false, error: "ENDPOINT_TIDAK_DITEMUKAN" }, 404);
}
