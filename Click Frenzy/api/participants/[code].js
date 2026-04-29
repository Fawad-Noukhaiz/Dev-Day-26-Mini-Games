const API_BASE_URL = "https://minigame-manager-cc533de7be66.herokuapp.com/api";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed." });
    return;
  }

  const rawCode = Array.isArray(req.query.code) ? req.query.code[0] : req.query.code;
  const code = typeof rawCode === "string" ? rawCode.trim() : "";

  if (!code) {
    res.status(400).json({ message: "Participant code is required." });
    return;
  }

  try {
    const upstream = await fetch(
      `${API_BASE_URL}/participants/${encodeURIComponent(code)}`
    );
    const text = await upstream.text();
    const contentType = upstream.headers.get("content-type") || "application/json";

    res.status(upstream.status);
    res.setHeader("Content-Type", contentType);
    res.send(text);
  } catch (err) {
    res.status(502).json({ message: "Upstream request failed." });
  }
}
