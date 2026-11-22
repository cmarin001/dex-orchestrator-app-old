import { ApiError } from "../api/client";
export const retryRead = (count: number, error: unknown) =>
  count < 2 && (!(error instanceof ApiError) || error.status === 0 || error.status >= 500);
export const retryDelay = (attempt: number) => Math.min(1000 * 2 ** attempt, 8000);
