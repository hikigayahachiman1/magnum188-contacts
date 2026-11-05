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
const DEFAULT_LABELS = {
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  telegram_channel: "Channel Telegram",
  livechat: "LiveChat",
  whatsapp_group: "Grup WhatsApp",
  telegram_group: "Grup Telegram",
  facebook_group: "Grup Facebook",
  alternative: "LINK ALTERNATIF",
  apk_download: "DOWNLOAD APK M188",
};

function parseDisplayOrder(value) {
  if (!value) return [...DEFAULT_DISPLAY_ORDER];
  try {
    const order = JSON.parse(value);
    const allowed = new Set(DEFAULT_DISPLAY_ORDER);
    if (
      Array.isArray(order) &&
      order.length === DEFAULT_DISPLAY_ORDER.length &&
      new Set(order).size === DEFAULT_DISPLAY_ORDER.length &&
      order.every((channel) => typeof channel === "string" && allowed.has(channel))
    ) return order;
  } catch {}
  return [...DEFAULT_DISPLAY_ORDER];
}

function parsePublicDrawer(channel, value) {
  if (!value) return { enabled: false, items: [] };
  try {
    const drawer = JSON.parse(value);
    if (!drawer || drawer.enabled !== true || !Array.isArray(drawer.items)) {
      return { enabled: false, items: [] };
    }
    const ids = new Set();
    const items = [];
    for (const item of drawer.items.slice(0, 50)) {
      const id = String(item && item.id || "").trim();
      const label = String(item && item.label || "").trim();
      if (
        !item || item.active !== true ||
        !/^[a-zA-Z0-9_-]{8,64}$/.test(id) || ids.has(id) ||
        !label || label.length > 60 || /[<>\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/i.test(label)
      ) continue;
      ids.add(id);
      items.push({ id, label, href: `/go/${channel}/${id}` });
    }
    return { enabled: true, items };
  } catch {
    return { enabled: false, items: [] };
  }
}

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "X-Content-Type-Options": "nosniff",
};

export async function onRequestGet(context) {
  if (!context.env.CONTACTS) {
    return new Response(
      JSON.stringify({ error: "CONTACTS_KV_NOT_CONFIGURED" }),
      { status: 503, headers: jsonHeaders },
    );
  }

  // shortcut: cache per data center 30 detik (37 pembacaan KV -> 1 per 30 detik);
  // perubahan admin butuh sampai 30 detik untuk tampil di lokasi lain. Simpan semua
  // konfigurasi dalam satu key KV jika pengunjung terus bertambah.
  const cacheKey = new Request(new URL("/api/contacts", context.request.url).toString());
  let cached = null;
  try { cached = await caches.default.match(cacheKey); } catch {} // tanpa cache tetap jalan
  if (cached) return new Response(cached.body, { status: 200, headers: jsonHeaders });

  const [values, statuses, labels, drawerValues, storedOrder] = await Promise.all([
    Promise.all(CHANNELS.map((channel) => context.env.CONTACTS.get(channel))),
    Promise.all(
      CHANNELS.map((channel) => context.env.CONTACTS.get(`status:${channel}`)),
    ),
    Promise.all(
      CHANNELS.map((channel) => context.env.CONTACTS.get(`label:${channel}`)),
    ),
    Promise.all(
      CHANNELS.map((channel) => context.env.CONTACTS.get(`drawer:${channel}`)),
    ),
    context.env.CONTACTS.get("display:order"),
  ]);

  const contacts = {};
  const drawers = {};
  CHANNELS.forEach((channel, index) => {
    // Status lama yang belum memiliki key dianggap aktif agar tetap kompatibel.
    const isActive = statuses[index] !== "inactive";
    const drawer = parsePublicDrawer(channel, drawerValues[index]);
    drawers[channel] = drawer;
    const hasDefaultApk = channel === "apk_download" &&
      statuses[index] === null && !values[index];
    contacts[channel] = !isActive
      ? ""
      : drawer.enabled && drawer.items.length
        ? `/drawer/${channel}`
        : values[index] || (hasDefaultApk && DEFAULT_APK_URL)
          ? `/go/${channel}`
          : "";
  });
  contacts.order = parseDisplayOrder(storedOrder);
  contacts.labels = {};
  CHANNELS.forEach((channel, index) => {
    contacts.labels[channel] = labels[index] || DEFAULT_LABELS[channel];
  });
  contacts.drawers = drawers;

  const body = JSON.stringify(contacts);
  try {
    context.waitUntil(caches.default.put(
      cacheKey,
      new Response(body, { headers: { ...jsonHeaders, "Cache-Control": "public, max-age=30" } }),
    ).catch(() => {}));
  } catch {}
  // Browser tetap no-store; hanya cache edge Cloudflare yang menyimpan 30 detik.
  return new Response(body, { status: 200, headers: jsonHeaders });
}
