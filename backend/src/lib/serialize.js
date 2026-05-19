function parseApi(row) {
  if (!row) return row;
  return {
    ...row,
    quotaPacks: typeof row.quotaPacks === "string" ? safeParse(row.quotaPacks, []) : row.quotaPacks,
    dummyResponse: typeof row.dummyResponse === "string" ? safeParse(row.dummyResponse, {}) : row.dummyResponse,
  };
}

function safeParse(s, fallback) {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

function stringifyJsonFields(data) {
  const out = { ...data };
  if ("quotaPacks" in out && typeof out.quotaPacks !== "string") {
    out.quotaPacks = JSON.stringify(out.quotaPacks);
  }
  if ("dummyResponse" in out && typeof out.dummyResponse !== "string") {
    out.dummyResponse = JSON.stringify(out.dummyResponse);
  }
  return out;
}

module.exports = { parseApi, stringifyJsonFields };
