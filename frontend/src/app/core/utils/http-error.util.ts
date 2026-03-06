import { HttpErrorResponse } from '@angular/common/http';

export const extractApiErrorMessage = (
  errorResponse: unknown,
  fallback: string
): string => {
  if (!(errorResponse instanceof HttpErrorResponse)) {
    return fallback;
  }

  const responseMessage = errorResponse.error?.message;
  if (typeof responseMessage === 'string' && responseMessage.trim()) {
    return responseMessage;
  }

  const fieldErrors = errorResponse.error?.details?.fieldErrors;
  if (fieldErrors && typeof fieldErrors === 'object') {
    const firstEntry = Object.values(fieldErrors).find(
      (value): value is unknown[] => Array.isArray(value) && value.length > 0
    );
    if (firstEntry?.length) {
      return String(firstEntry[0]);
    }
  }

  if (errorResponse.status === 0) {
    return 'No hay conexion con el backend.';
  }

  return fallback;
};
