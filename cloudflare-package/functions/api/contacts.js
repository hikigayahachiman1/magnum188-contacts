const CHANNELS = [
  "whatsapp",
  "telegram",
  "livechat",
  "whatsapp_group",
  "telegram_group",
  "facebook_group",
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

  const values = await Promise.all(
    CHANNELS.map((channel) => context.env.CONTACTS.get(channel)),
  );

  const contacts = {};
  CHANNELS.forEach((channel, index) => {
    contacts[channel] = values[index] ? `/go/${channel}` : "";
  });

  return new Response(JSON.stringify(contacts), {
    status: 200,
    headers: jsonHeaders,
  });
}
