export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Field errors from a 400 VALIDATION_ERROR response, if any. */
  get fieldErrors(): Record<string, string[] | undefined> {
    const details = this.details as { fieldErrors?: Record<string, string[]> } | undefined;
    return details?.fieldErrors ?? {};
  }
}

/** The request never reached the server (offline, DNS, timeout). */
export class NetworkError extends Error {
  constructor(message = 'You appear to be offline') {
    super(message);
    this.name = 'NetworkError';
  }
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof NetworkError) return error.message;
  // Unexpected errors are bugs; don't let the friendly message hide them during development.
  if (__DEV__) console.error(error);
  return 'Something went wrong';
}
