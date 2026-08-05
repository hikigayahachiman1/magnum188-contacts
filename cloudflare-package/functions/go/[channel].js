const CHANNEL_HOSTS = {
  whatsapp: new Set([
  "api.whatsapp.com",
  "wa.me",
  "pasticuan.me",
  "www.pasticuan.me"
]),
  telegram: new Set(["t.me", "telegram.me"]),
  livechat: new Set(["direct.lc.chat"]),
  whatsapp_group: new Set(["chat.whatsapp.com"]),
  telegram_group: new Set(["t.me", "telegram.me"]),
  facebook_group: new Set(["facebook.com", "www.facebook.com"]),
};

function errorResponse(message, status) {
  return new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}

export async function onRequestGet(context) {
  const channel = String(context.params.channel || "");
  const allowedHosts = CHANNEL_HOSTS[channel];

  if (!allowedHosts) {
    return errorResponse("Kontak tidak ditemukan.", 404);
  }

  if (!context.env.CONTACTS) {
    return errorResponse("Penyimpanan kontak belum dikonfigurasi.", 503);
  }

  const target = String((await context.env.CONTACTS.get(channel)) || "").trim();
  if (!target) {
    return errorResponse("Kontak sedang tidak tersedia.", 404);
  }

  let url;
  try {
    url = new URL(target);
  } catch {
    return errorResponse("Alamat kontak tidak valid.", 400);
  }

  if (url.protocol !== "https:" || !allowedHosts.has(url.hostname.toLowerCase())) {
    return errorResponse("Tujuan kontak tidak diizinkan.", 400);
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
