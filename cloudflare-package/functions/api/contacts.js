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

  const [values, statuses] = await Promise.all([
    Promise.all(CHANNELS.map((channel) => context.env.CONTACTS.get(channel))),
    Promise.all(
      CHANNELS.map((channel) => context.env.CONTACTS.get(`status:${channel}`)),
    ),
  ]);

  const contacts = {};
  CHANNELS.forEach((channel, index) => {
    // Status lama yang belum memiliki key dianggap aktif agar tetap kompatibel.
    const isActive = statuses[index] !== "inactive";
    contacts[channel] = values[index] && isActive ? `/go/${channel}` : "";
  });

  return new Response(JSON.stringify(contacts), {
    status: 200,
    headers: jsonHeaders,
  });
}
