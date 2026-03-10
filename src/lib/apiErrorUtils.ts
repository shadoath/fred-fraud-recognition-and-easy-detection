import type { ApiErrorResponse } from "../types/fraudTypes"

export const toastApiError = (
  toastError: (msg: string) => void,
  error: ApiErrorResponse,
  fallback = "Failed to analyze. Please try again later."
): void => {
  toastError(
    error.status === 401
      ? "Invalid API key. Please check your OpenAI API key."
      : (error.message ?? fallback)
  )
}
