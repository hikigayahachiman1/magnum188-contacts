// Satu-satunya daftar domain tujuan yang diizinkan per channel.
// Dipakai panel admin (saat simpan) dan kedua redirect /go/ (saat diklik).
// File ini tidak meng-export onRequest, jadi tidak menjadi route publik.
export const ALLOWED_HOSTS = {
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
