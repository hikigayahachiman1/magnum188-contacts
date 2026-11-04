const CHANNEL_HOSTS = {
  whatsapp: new Set(["api.whatsapp.com", "wa.me", "pasticuan.me", "www.pasticuan.me"]),
  telegram: new Set(["t.me", "telegram.me", "pasticuan.me", "www.pasticuan.me"]),
  telegram_channel: new Set(["t.me", "telegram.me", "pasticuan.me", "www.pasticuan.me"]),
  livechat: new Set(["direct.lc.chat", "pasticuan.me", "www.pasticuan.me"]),
  whatsapp_group: new Set(["chat.whatsapp.com", "pasticuan.me", "www.pasticuan.me"]),
  telegram_group: new Set(["t.me", "telegram.me", "pasticuan.me", "www.pasticuan.me"]),
  facebook_group: new Set(["facebook.com", "www.facebook.com", "pasticuan.me", "www.pasticuan.me"]),
  apk_download: new Set(["shrtl.sbs", "www.shrtl.sbs", "pasticuan.me", "www.pasticuan.me", "livemagnum188.chat", "www.livemagnum188.chat"]),
  alternative: new Set([
    "pasticuan.me", "www.pasticuan.me", "shrtl.sbs", "www.shrtl.sbs",
    "livemagnum188.chat", "www.livemagnum188.chat", "heylink.me", "www.heylink.me",
  ]),
};

function errorResponse(message, status) {
  return new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export async function onRequestGet(context) {
  const channel = String(context.params.channel || "");
  const itemId = String(context.params.item || "");
  const allowedHosts = CHANNEL_HOSTS[channel];
  if (!allowedHosts || !/^[a-zA-Z0-9_-]{8,64}$/.test(itemId)) {
    return errorResponse("Link tidak ditemukan.", 404);
  }
  if (!context.env.CONTACTS) {
    return errorResponse("Penyimpanan kontak belum dikonfigurasi.", 503);
  }

  const parentStatus = await context.env.CONTACTS.get(`status:${channel}`);
  if (parentStatus === "inactive") return errorResponse("Layanan sedang dinonaktifkan.", 404);

  let drawer;
  try {
    drawer = JSON.parse(String((await context.env.CONTACTS.get(`drawer:${channel}`)) || ""));
  } catch {
    return errorResponse("Folder link tidak tersedia.", 404);
  }
  if (!drawer || drawer.enabled !== true || !Array.isArray(drawer.items)) {
    return errorResponse("Folder link tidak tersedia.", 404);
  }

  const item = drawer.items.find((candidate) => candidate && candidate.id === itemId);
  if (!item || item.active !== true) return errorResponse("Link sedang tidak tersedia.", 404);

  let url;
  try {
    url = new URL(String(item.url || "").trim());
  } catch {
    return errorResponse("Alamat link tidak valid.", 400);
  }
  if (url.protocol !== "https:" || !allowedHosts.has(url.hostname.toLowerCase())) {
    return errorResponse("Tujuan link tidak diizinkan.", 400);
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
