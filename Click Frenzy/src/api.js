const API_BASE = "/api";

const parseJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const extractMessage = (data, fallback) =>
  data?.message || data?.errors?.[0]?.msg || fallback;

export const getParticipant = async (code) => {
  const response = await fetch(`${API_BASE}/participants/${encodeURIComponent(code)}`);
  const data = await parseJson(response);

  if (!response.ok) {
    throw new Error(extractMessage(data, "Could not verify participant code."));
  }

  return data || {};
};

export const postScore = async (payload) => {
  const response = await fetch(`${API_BASE}/scores`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(extractMessage(data, "Score submission failed."));
  }

  return data || {};
};
