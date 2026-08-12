import { ServiceProblemDetails, extractErrorMessage } from '../models/problem-details.model';

/** Per-call overrides for specific HTTP status codes, layered on top of
 *  DEFAULT_STATUS_MESSAGES below — e.g. a component-specific "This employee
 *  already exists" for 409 instead of the generic "This record already exists." */
export type ApiErrorStatusMessages = Record<number, string>;

const DEFAULT_STATUS_MESSAGES: ApiErrorStatusMessages = {
  401: 'Session expired. Please sign in again.',
  403: 'You do not have permission.',
  404: 'Not found.',
  409: 'This record already exists.',
  500: 'Server error. Please try again later.',
};

/** Single shared implementation of "turn a failed HTTP request into a
 *  user-facing message" — this used to be a ~20-line `apiErr()` method
 *  hand-rolled independently in 34 components, each drifting slightly from
 *  the others (different key lists, inconsistent `errors` handling, etc.).
 *  Every component now delegates here, optionally supplying its own
 *  `statusMessages` for status codes that need domain-specific wording.
 *
 *  Order: network failure → raw string body → structured ProblemDetails body
 *  (via extractErrorMessage, which already covers validation `errors`,
 *  `detail`/`title`, and non-standard `message`/`error` fields) → per-call
 *  status override → shared default status table → caller's fallback. */
export function apiErrorMessage(
  err: any,
  fallback: string,
  statusMessages?: ApiErrorStatusMessages,
): string {
  if (err?.status === 0) return 'Cannot connect to server.';

  const body = err?.error;
  if (!body) return fallback;
  if (typeof body === 'string' && body.trim()) return body.trim();

  const extracted = extractErrorMessage(body as ServiceProblemDetails);
  if (extracted) return extracted;

  const status = err?.status;
  if (statusMessages && status in statusMessages) return statusMessages[status];
  if (status in DEFAULT_STATUS_MESSAGES) return DEFAULT_STATUS_MESSAGES[status];
  return fallback;
}
