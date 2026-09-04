const CHANNELS = [
  "whatsapp",
  "telegram",
  "telegram_channel",
  "livechat",
  "whatsapp_group",
  "telegram_group",
  "facebook_group",
  "alternative",
];

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
  whatsapp: "WhatsApp Official",
  telegram: "Telegram Official",
  telegram_channel: "Channel Telegram Official",
  livechat: "LiveChat Official",
  whatsapp_group: "Grup WhatsApp Official",
  telegram_group: "Grup Telegram Official",
  facebook_group: "Grup Facebook Official",
  alternative: "LINK ALTERNATIF",
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

  const [values, statuses, labels, storedOrder] = await Promise.all([
    Promise.all(CHANNELS.map((channel) => context.env.CONTACTS.get(channel))),
    Promise.all(
      CHANNELS.map((channel) => context.env.CONTACTS.get(`status:${channel}`)),
    ),
    Promise.all(
      CHANNELS.map((channel) => context.env.CONTACTS.get(`label:${channel}`)),
    ),
    context.env.CONTACTS.get("display:order"),
  ]);

  const contacts = {};
  CHANNELS.forEach((channel, index) => {
    // Status lama yang belum memiliki key dianggap aktif agar tetap kompatibel.
    const isActive = statuses[index] !== "inactive";
    contacts[channel] = values[index] && isActive ? `/go/${channel}` : "";
  });
  contacts.order = parseDisplayOrder(storedOrder);
  contacts.labels = {};
  CHANNELS.forEach((channel, index) => {
    contacts.labels[channel] = labels[index] || DEFAULT_LABELS[channel];
  });

  return new Response(JSON.stringify(contacts), {
    status: 200,
    headers: jsonHeaders,
  });
}
