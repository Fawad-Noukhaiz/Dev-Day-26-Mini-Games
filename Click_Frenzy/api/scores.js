const API_BASE_URL = "https://minigame-manager-cc533de7be66.herokuapp.com/api";

const parseBody = (body) => {
  if (!body) return {};
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return body;
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed." });
    return;
  }

  const apiKey =
    process.env.CLICK_FRENZY_API_KEY ||
    "mgk_184172a0170a7259dc73bcd9326833e7bb307189b92ded87fa4f84f28f0151ec";
  if (!apiKey) {
    res.status(500).json({ message: "Server API key is not configured." });
    return;
  }

  const payload = parseBody(req.body);
  const { userCode, gameId, score, playTime, metadata } = payload;

  if (!userCode || !gameId) {
    res.status(400).json({ message: "Missing required fields." });
    return;
  }

  try {
    const upstream = await fetch(`${API_BASE_URL}/scores`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        userCode,
        gameId,
        score,
        playTime,
        metadata: metadata || {},
      }),
    });

    const text = await upstream.text();
    const contentType = upstream.headers.get("content-type") || "application/json";

    res.status(upstream.status);
    res.setHeader("Content-Type", contentType);
    res.send(text);
  } catch (err) {
    res.status(502).json({ message: "Upstream request failed." });
  }
}
