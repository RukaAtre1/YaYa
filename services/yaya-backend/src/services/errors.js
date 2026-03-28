export class ServiceError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "ServiceError";
    this.status = options.status ?? 500;
    this.code = options.code ?? "service_error";
    this.details = options.details ?? null;
  }
}

export function normalizeError(error) {
  if (error instanceof ServiceError) {
    return error;
  }

  return new ServiceError("Unexpected backend error.", {
    status: 500,
    code: "unexpected_error",
    details: error instanceof Error ? error.message : String(error)
  });
}

export function extractJsonObject(text) {
  const trimmed = String(text ?? "").trim();

  if (!trimmed) {
    throw new ServiceError("Model returned an empty response.", {
      status: 502,
      code: "empty_model_response"
    });
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new ServiceError("Model response did not contain a valid JSON object.", {
      status: 502,
      code: "invalid_model_json",
      details: candidate
    });
  }

  const jsonSlice = candidate.slice(start, end + 1);

  try {
    return JSON.parse(jsonSlice);
  } catch (error) {
    throw new ServiceError("Failed to parse model JSON response.", {
      status: 502,
      code: "json_parse_failed",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
