function escapeField(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function logsToCsv(logs) {
  const header = [
    "id",
    "createdAt",
    "apiSlug",
    "apiName",
    "status",
    "responseTimeMs",
    "ipAddress",
    "errorReason",
    "userEmail",
  ];
  const lines = [header.join(",")];
  for (const log of logs) {
    lines.push(
      [
        log.id,
        log.createdAt instanceof Date ? log.createdAt.toISOString() : log.createdAt,
        log.api ? log.api.slug : "",
        log.api ? log.api.name : "",
        log.status,
        log.responseTimeMs,
        log.ipAddress,
        log.errorReason || "",
        log.user ? log.user.email : "",
      ]
        .map(escapeField)
        .join(","),
    );
  }
  return lines.join("\n") + "\n";
}

module.exports = { logsToCsv };
