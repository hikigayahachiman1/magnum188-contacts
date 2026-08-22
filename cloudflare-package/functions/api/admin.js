const CHANNELS = [
  "whatsapp",
  "telegram",
  "livechat",
  "whatsapp_group",
  "telegram_group",
  "facebook_group",
  "alternative",
];

const ALLOWED_HOSTS = {
  whatsapp: new Set(["api.whatsapp.com", "wa.me", "pasticuan.me", "www.pasticuan.me"]),
  telegram: new Set(["t.me", "telegram.me", "pasticuan.me", "www.pasticuan.me"]),
  livechat: new Set(["direct.lc.chat", "pasticuan.me", "www.pasticuan.me"]),
  whatsapp_group: new Set(["chat.whatsapp.com", "pasticuan.me", "www.pasticuan.me"]),
  telegram_group: new Set(["t.me", "telegram.me", "pasticuan.me", "www.pasticuan.me"]),
  facebook_group: new Set(["facebook.com", "www.facebook.com", "pasticuan.me", "www.pasticuan.me"]),
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

const COOKIE_NAME = "magnum_admin_session";
const SESSION_SECONDS = 8 * 60 * 60;
const encoder = new TextEncoder();

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
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
  const payload = stringToBase64Url(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS }),
  );
  const key = await importSigningKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return `${payload}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

async function verifySession(token, secret) {
  try {
    const [payload, signature] = String(token || "").split(".");
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
    return Number(data.exp) > Math.floor(Date.now() / 1000);
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

function validateTarget(channel, value) {
  const target = String(value || "").trim();
  if (!target) return { ok: true, value: "" };

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

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ ok: false, error: "DATA_TIDAK_VALID" }, 400);
  }

  if (!(await equalSecret(body.password || "", context.env.ADMIN_PASSWORD))) {
    await context.env.CONTACTS.put(key, String(attempts + 1), { expirationTtl: 900 });
    return json({ ok: false, error: "LOGIN_GAGAL", message: "Password admin salah." }, 401);
  }

  await context.env.CONTACTS.delete(key);
  const session = await createSession(context.env.SESSION_SECRET);
  return json(
    { ok: true },
    200,
    {
      "Set-Cookie": `${COOKIE_NAME}=${session}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Strict`,
    },
  );
}

async function handleGetContacts(context) {
  if (!(await requireAdmin(context))) {
    return json({ ok: false, error: "BELUM_LOGIN" }, 401);
  }

  const [links, statuses, updatedAt] = await Promise.all([
    Promise.all(CHANNELS.map((channel) => context.env.CONTACTS.get(channel))),
    Promise.all(CHANNELS.map((channel) => context.env.CONTACTS.get(`status:${channel}`))),
    context.env.CONTACTS.get("admin:updated_at"),
  ]);

  const contacts = {};
  CHANNELS.forEach((channel, index) => {
    contacts[channel] = {
      url: links[index] || "",
      active: statuses[index]
        ? statuses[index] !== "inactive"
        : Boolean(links[index]),
    };
  });

  return json({ ok: true, contacts, updatedAt: updatedAt || null });
}

async function handleSave(context) {
  if (!isSameOrigin(context.request)) {
    return json({ ok: false, error: "ORIGIN_DITOLAK" }, 403);
  }
  if (!(await requireAdmin(context))) {
    return json({ ok: false, error: "BELUM_LOGIN" }, 401);
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ ok: false, error: "DATA_TIDAK_VALID" }, 400);
  }

  const incoming = body && body.contacts;
  if (!incoming || typeof incoming !== "object") {
    return json({ ok: false, error: "DATA_TIDAK_LENGKAP" }, 400);
  }

  const clean = {};
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
    if (item.active && !checked.value) {
      return json(
        { ok: false, error: "LINK_AKTIF_KOSONG", channel, message: `Isi link ${channel} atau nonaktifkan statusnya.` },
        400,
      );
    }
    clean[channel] = { url: checked.value, active: item.active };
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
  }
  writes.push(context.env.CONTACTS.put("admin:updated_at", updatedAt));
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
      "Set-Cookie": `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`,
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
