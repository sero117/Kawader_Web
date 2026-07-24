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
  if (problem.extensions) {
    const firstValue = Object.values(problem.extensions)[0];
    if (typeof firstValue === 'string') return firstValue;
    if (Array.isArray(firstValue) && firstValue.length > 0) return String(firstValue[0]);
  }
  return null;
}
