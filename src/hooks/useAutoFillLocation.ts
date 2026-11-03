import { useEffect } from 'react';
import * as Location from 'expo-location';
import { useQueryClient } from '@tanstack/react-query';

import { getCoachProfileFull, saveCoachProfile } from '../api/coachApi';
import { getLocationByPin } from '../api/masterApi';
import { invalidateCoachProfileCaches, queryKeys } from '../api/queryKeys';
import { detectCurrentPlace } from '../utils/currentPlace';

let attempted = false;

/** When the coach has no pin code yet, asks for location once per launch and saves what it finds. Silent on any failure. */
export function useAutoFillLocation() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (attempted) return;
    attempted = true;
    void (async () => {
      try {
        const profile = await queryClient.fetchQuery({
          queryKey: queryKeys.coachProfileFull,
          queryFn: getCoachProfileFull,
        });
        if (profile.pinCode.trim()) return;
        const existing = await Location.getForegroundPermissionsAsync();
        if (existing.status === 'denied' && !existing.canAskAgain) return;

        const place = await detectCurrentPlace();
        const country = profile.countryCd || 'IN';
        const city = await getLocationByPin(country, place.pinCode).catch(() => null);
        await saveCoachProfile({
          coachId: profile.coachId,
          coachName: profile.coachName,
          coachTypeCode: profile.coachTypeCode,
          mobile: profile.mobile,
          email: profile.email,
          businessName: profile.businessName,
          serviceCodes: profile.serviceCodes,
          experienceYears: profile.experienceYears,
          happyClientCount: profile.happyClientCount,
          certificationCount: profile.certificationCount,
          tagline: profile.tagline,
          localLanguage: profile.localLanguage,
          bmiReportTemplate: profile.bmiReportTemplate,
          dietChartTemplate: profile.dietChartTemplate,
          recheckupDays: profile.recheckupDays,
          locality: profile.locality || place.locality,
          add_Line: profile.addLine || place.addLine,
          city_Cd: profile.cityCd || city?.city || '',
          state_Cd: profile.stateCd || city?.state || '',
          pinCode: place.pinCode,
          country_Cd: country,
          logo_Url: profile.logoUrl,
          profile_Pic_Url: profile.profilePicUrl,
          cover_Url: profile.coverUrl,
          coachDesc: profile.coachDesc,
        });
        invalidateCoachProfileCaches(queryClient, profile.coachCode);
      } catch {
        // Location is a convenience; the coach can still type the address in Edit Profile.
      }
    })();
  }, [queryClient]);
}
