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

const cleanString = (value) => (typeof value === "string" ? value.trim() : "");

const safeJsonParse = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const getParticipantCandidateCodes = (participantData, fallbackCode) => {
  const rawCandidates = [
    fallbackCode,
    participantData?.userCode,
    participantData?.playerCode,
    participantData?.minigamePlayerCode,
    participantData?.participantCode,
    participantData?.code,
    participantData?.player?.code,
    participantData?.minigamePlayer?.code,
  ];

  return rawCandidates.reduce((codes, value) => {
    const code = cleanString(value);
    if (code && !codes.includes(code)) codes.push(code);
    return codes;
  }, []);
};

const submitScoreToUpstream = async (apiKey, payload) => {
  const upstream = await fetch(`${API_BASE_URL}/scores`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  const text = await upstream.text();
  return {
    status: upstream.status,
    contentType: upstream.headers.get("content-type") || "application/json",
    text,
    data: safeJsonParse(text),
  };
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
  const submittedUserCode = cleanString(userCode);

  if (!submittedUserCode || !gameId) {
    res.status(400).json({ message: "Missing required fields." });
    return;
  }

  try {
    const scorePayload = {
      userCode: submittedUserCode,
      gameId,
      score,
      playTime,
      metadata: metadata || {},
    };

    let upstream = await submitScoreToUpstream(apiKey, scorePayload);

    if (upstream.status === 404 && upstream.data?.message === "Minigame player not found") {
      const participantResponse = await fetch(
        `${API_BASE_URL}/participants/${encodeURIComponent(submittedUserCode)}`
      );

      if (participantResponse.ok) {
        const participantData = safeJsonParse(await participantResponse.text()) || {};
        const candidateCodes = getParticipantCandidateCodes(participantData, submittedUserCode);

        for (const candidateCode of candidateCodes) {
          if (candidateCode === scorePayload.userCode) continue;

          const retried = await submitScoreToUpstream(apiKey, {
            ...scorePayload,
            userCode: candidateCode,
          });

          if (retried.status < 400) {
            upstream = retried;
            break;
          }
        }
      }
    }

    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.contentType);
    res.send(upstream.text);
  } catch (err) {
    res.status(502).json({ message: "Upstream request failed." });
  }
}
