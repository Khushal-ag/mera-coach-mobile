import * as Location from 'expo-location';

import { SUPPORT_EMAIL } from '../config/appConfig';

export interface DetectedPlace {
  pinCode: string;
  locality: string;
  addLine: string;
}

interface NominatimAddress {
  postcode?: string;
  suburb?: string;
  neighbourhood?: string;
  city_district?: string;
  village?: string;
  road?: string;
  house_number?: string;
}

/** Picks the fields the profile form asks for out of an OpenStreetMap reverse-geocode answer. */
export function parseNominatimPlace(json: unknown): DetectedPlace {
  const address = ((json as { address?: NominatimAddress } | null)?.address ??
    {}) as NominatimAddress;
  const pin = (address.postcode ?? '').replace(/\D/g, '').slice(0, 6);
  const locality =
    address.suburb ?? address.neighbourhood ?? address.city_district ?? address.village ?? '';
  const addLine = [address.house_number, address.road].filter(Boolean).join(' ');
  return { pinCode: pin.length === 6 ? pin : '', locality, addLine };
}

/** Asks for location permission, reads the position and looks up the address. City and state follow from the pin code. */
export async function detectCurrentPlace(): Promise<DetectedPlace> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new Error('Location permission was not given. You can type your address instead.');
  }
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const { latitude, longitude } = position.coords;
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${latitude}&lon=${longitude}`,
    { headers: { 'Accept-Language': 'en', 'User-Agent': `MeraCoach/1.0 (${SUPPORT_EMAIL})` } },
  );
  if (!response.ok) throw new Error('Could not look up your address. You can type it instead.');
  const place = parseNominatimPlace(await response.json());
  if (!place.pinCode)
    throw new Error('Your pin code could not be found here. You can type your address instead.');
  return place;
}
