import { useCallback, useState } from 'react';
import type { FieldErrorMap, FormValidationResult } from '../utils/validation';

/** Tracks which fields failed validation and the shared top banner message. */
export function useFormFieldErrors() {
  const [errorFields, setErrorFields] = useState<Record<string, boolean>>({});
  const [formErrorBanner, setFormErrorBanner] = useState<string | null>(null);

  const hasFieldError = useCallback((field: string) => !!errorFields[field], [errorFields]);

  const clearFieldError = useCallback((...fields: string[]) => {
    setErrorFields(prev => {
      let changed = false;
      const next = { ...prev };
      for (const field of fields) {
        if (next[field]) {
          delete next[field];
          changed = true;
        }
      }
      if (!changed) return prev;
      if (Object.keys(next).length === 0) setFormErrorBanner(null);
      return next;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrorFields({});
    setFormErrorBanner(null);
  }, []);

  /** Apply a validation result. Returns true when the form is invalid. */
  const applyValidation = useCallback((result: FormValidationResult): boolean => {
    if (result.ok) {
      setErrorFields({});
      setFormErrorBanner(null);
      return false;
    }
    const next: Record<string, boolean> = {};
    for (const key of Object.keys(result.errors)) next[key] = true;
    setErrorFields(next);
    setFormErrorBanner(result.banner);
    return true;
  }, []);

  /** Mark fields from a plain error map (e.g. Register / Login). */
  const applyFieldErrors = useCallback(
    (errors: FieldErrorMap, banner: string) => {
      if (Object.keys(errors).length === 0) {
        clearAllErrors();
        return false;
      }
      const next: Record<string, boolean> = {};
      for (const key of Object.keys(errors)) next[key] = true;
      setErrorFields(next);
      setFormErrorBanner(banner);
      return true;
    },
    [clearAllErrors],
  );

  const setBanner = useCallback((message: string | null) => {
    setFormErrorBanner(message);
  }, []);

  return {
    errorFields,
    formErrorBanner,
    hasFieldError,
    clearFieldError,
    clearAllErrors,
    applyValidation,
    applyFieldErrors,
    setBanner,
  };
}
