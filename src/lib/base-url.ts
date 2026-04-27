export function getBaseUrl() {
  const raw =
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";

  // Strip protocole pour analyse
  let withoutProto = raw;
  if (raw.startsWith("http://")) withoutProto = raw.slice(7);
  else if (raw.startsWith("https://")) withoutProto = raw.slice(8);

  // Localhost / 127.0.0.1 → toujours http (jamais SSL en dev)
  if (withoutProto.startsWith("localhost") || withoutProto.startsWith("127.")) {
    return `http://${withoutProto}`;
  }

  // URL avec protocole explicite : on respecte
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;

  // Tout le reste : https par défaut
  return `https://${withoutProto}`;
}
