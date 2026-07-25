export interface ServiceProblemDetails {
  title: string;
  detail?: string;
  type: string;
  instance?: string;
  extensions: Record<string, unknown>;
  /** Standard ASP.NET Core model-validation shape (ValidationProblemDetails) —
   *  field name -> list of messages for that field. */
  errors?: Record<string, string[]>;
}

export function extractErrorMessage(problem: ServiceProblemDetails | null | undefined): string | null {
  if (!problem) return null;

  // Field-level validation messages are far more actionable than the generic
  // "One or more validation errors occurred." boilerplate ASP.NET puts in `title`
  // for the same response — surface those first when present.
  if (problem.errors && typeof problem.errors === 'object') {
    const messages = Object.values(problem.errors).flat().filter((m): m is string => typeof m === 'string' && !!m);
    if (messages.length > 0) return messages.join(' ');
  }

  if (problem.detail) return problem.detail;
  if (problem.title) return problem.title;

  // Some endpoints attach a field-specific message under a key named after
  // whichever input failed (e.g. {"Code": "The verification code is invalid."},
  // {"Name": "Name must be English letters or numbers"}) as a sibling of
  // type/title/status rather than nested under `extensions` — ASP.NET Core's
  // ProblemDetails serializer flattens `Extensions` entries onto the top-level
  // object instead of keeping them under an "extensions" wrapper key. Scan for
  // any such field before falling back to `extensions` itself.
  const KNOWN_KEYS = new Set(['type', 'title', 'status', 'detail', 'instance', 'errors', 'extensions']);
  for (const [key, value] of Object.entries(problem as unknown as Record<string, unknown>)) {
    if (KNOWN_KEYS.has(key)) continue;
    if (typeof value === 'string' && value.trim()) return value.trim();
  }

  if (problem.extensions) {
    const firstValue = Object.values(problem.extensions)[0];
    if (typeof firstValue === 'string') return firstValue;
    if (Array.isArray(firstValue) && firstValue.length > 0) return String(firstValue[0]);
  }
  return null;
}
