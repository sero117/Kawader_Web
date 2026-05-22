export interface ServiceProblemDetails {
  title: string;
  detail?: string;
  type: string;
  instance?: string;
  extensions: Record<string, unknown>;
}

export function extractErrorMessage(problem: ServiceProblemDetails | null | undefined): string | null {
  if (!problem) return null;
  if (problem.title) return problem.title;
  if (problem.detail) return problem.detail;
  if (problem.extensions) {
    const firstValue = Object.values(problem.extensions)[0];
    if (typeof firstValue === 'string') return firstValue;
    if (Array.isArray(firstValue) && firstValue.length > 0) return String(firstValue[0]);
  }
  return null;
}
