import { ALLOWED_HOSTS as CHANNEL_HOSTS } from "../_shared/hosts.js";

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

  const stored = String((await context.env.CONTACTS.get(channel)) || "").trim();
  const status = await context.env.CONTACTS.get(`status:${channel}`);
  // URL awal hanya aktif jika layanan APK belum pernah disimpan dari panel.
  const target = stored || (channel === "apk_download" && status === null ? "https://shrtl.sbs/apkmagnum188" : "");
  if (!target) {
    return errorResponse("Kontak sedang tidak tersedia.", 404);
  }
  if (status === "inactive") {
    return errorResponse("Kontak sedang dinonaktifkan.", 404);
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
