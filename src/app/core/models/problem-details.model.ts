export interface ServiceProblemDetails {
  title: string;
  detail?: string;
  type: string;
  instance?: string;
  extensions: Record<string, unknown>;
  /** Standard ASP.NET Core model-validation shape (ValidationProblemDetails) —
   *  field name -> list of messages for that field. A few endpoints instead
   *  send a plain array of strings, or of `{ message }` objects. */
  errors?: Record<string, string[]> | Array<string | { message?: string }>;
}

/** Messages longer than this are almost certainly a raw HTML error page or a
 *  stack trace leaking through rather than an actual user-facing message —
 *  fall through to the caller's fallback instead of displaying that. */
const MAX_MESSAGE_LENGTH = 400;

function asDisplayString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() && value.length < MAX_MESSAGE_LENGTH ? value.trim() : null;
}

export function extractErrorMessage(problem: ServiceProblemDetails | null | undefined): string | null {
  if (!problem) return null;

  // Field-level validation messages are far more actionable than the generic
  // "One or more validation errors occurred." boilerplate ASP.NET puts in `title`
  // for the same response — surface those first when present.
  if (problem.errors) {
    const raw = Array.isArray(problem.errors) ? problem.errors : Object.values(problem.errors).flat();
    const messages = raw
      .map(e => (typeof e === 'string' ? e : e?.message))
      .filter((m): m is string => typeof m === 'string' && !!m);
    if (messages.length > 0) return messages.join(' ');
  }

  const detail = asDisplayString(problem.detail);
  if (detail) return detail;
  const title = asDisplayString(problem.title);
  if (title) return title;

  // Some endpoints attach a field-specific message under a key named after
  // whichever input failed (e.g. {"Code": "The verification code is invalid."},
  // {"Name": "Name must be English letters or numbers"}) as a sibling of
  // type/title/status rather than nested under `extensions` — ASP.NET Core's
  // ProblemDetails serializer flattens `Extensions` entries onto the top-level
  // object instead of keeping them under an "extensions" wrapper key. Scan for
  // any such field (this also covers non-standard shapes like `message`/`error`
  // that aren't part of ProblemDetails at all) before falling back to `extensions`.
  const KNOWN_KEYS = new Set(['type', 'title', 'status', 'detail', 'instance', 'errors', 'extensions']);
  for (const [key, value] of Object.entries(problem as unknown as Record<string, unknown>)) {
    if (KNOWN_KEYS.has(key)) continue;
    const str = asDisplayString(value);
    if (str) return str;
  }

  if (problem.extensions) {
    const firstValue = Object.values(problem.extensions)[0];
    if (typeof firstValue === 'string') return firstValue;
    if (Array.isArray(firstValue) && firstValue.length > 0) return String(firstValue[0]);
  }
  return null;
}
