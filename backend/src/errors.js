class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function notFound(req, res) {
  res.status(404).json({ error: { code: "not_found", message: `Route ${req.method} ${req.path} not found` } });
}

function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }
  if (err && err.code === "P2002") {
    return res.status(409).json({ error: { code: "conflict", message: "Unique constraint violated" } });
  }
  console.error("[error]", err);
  res.status(500).json({ error: { code: "internal_error", message: "Something went wrong" } });
}

module.exports = { HttpError, notFound, errorHandler };
