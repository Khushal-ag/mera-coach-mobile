import { useQuery } from '@tanstack/react-query';
import { getLocationByPin } from '../api/masterApi';
import { getErrorMessage } from '../api/client';
import { MASTER_STALE_MS } from '../api/queryClient';
import { queryKeys } from '../api/queryKeys';
import { useDebouncedValue } from './useDebouncedValue';

const PIN_LENGTH = 6;
const DEBOUNCE_MS = 400;

interface PinLocationResult {
  city: string;
  state: string;
}

/**
 * Debounced pin → city/state. Caller should apply `location` when `dataUpdatedAt` changes.
 */
export function usePinLocationLookup(
  pinDigits: string,
  countryCode: string,
): {
  lookingUp: boolean;
  error: string | null;
  location: PinLocationResult | null;
  lookupKey: string | null;
  dataUpdatedAt: number;
  isError: boolean;
} {
  const debouncedPin = useDebouncedValue(pinDigits, DEBOUNCE_MS);
  const enabled = !!countryCode && debouncedPin.length === PIN_LENGTH;
  const lookupKey = enabled ? `${countryCode}:${debouncedPin}` : null;

  const query = useQuery({
    queryKey: queryKeys.locationByPin(countryCode, debouncedPin),
    queryFn: () => getLocationByPin(countryCode, debouncedPin),
    enabled,
    retry: false,
    staleTime: MASTER_STALE_MS,
  });

  const city = (query.data?.city ?? '').trim();
  const state = (query.data?.state ?? '').trim();
  const emptySuccess = query.isSuccess && !city && !state;

  const error = !enabled
    ? null
    : query.isError
      ? getErrorMessage(query.error, 'Pin code not found.')
      : emptySuccess
        ? 'Pin code not found.'
        : null;

  return {
    lookingUp: enabled && query.isFetching,
    error,
    location: enabled && query.isSuccess ? { city, state } : null,
    lookupKey,
    dataUpdatedAt: query.dataUpdatedAt,
    isError: !!error,
  };
}
