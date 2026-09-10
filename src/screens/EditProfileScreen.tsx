import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../constants/theme';
import PhoneTextInput from '../components/PhoneTextInput';
import DropdownField from '../components/DropdownField';
import FormErrorBanner from '../components/FormErrorBanner';
import FormFieldLabel from '../components/FormFieldLabel';
import KeyboardSafeScroll, { useScrollLowerFieldsIntoView } from '../components/KeyboardSafeScroll';
import ScreenHeader from '../components/ScreenHeader';
import ReloadState from '../components/ReloadState';
import MultiSelectField from '../components/MultiSelectField';
import {
  getCoachProfileFull,
  getCoachCategories,
  getServicesForCategory,
  isPublicProfileDataSufficient,
  saveCoachProfile,
} from '../api/coachApi';
import { getCountries, type MasterOption } from '../api/masterApi';
import { uploadDocument } from '../api/documentApi';
import { getErrorMessage } from '../api/client';
import { LOCAL_LANGUAGE_OPTIONS } from '../data/localLanguages';
import { sanitizePinInput, validateCoachProfileEdit } from '../utils/validation';
import { serializeCoachEvents } from '../utils/coachEvents';
import { serializeCoachPackages } from '../utils/coachPackages';
import { useFormFieldErrors } from '../hooks/useFormFieldErrors';
import { usePinLocationLookup } from '../hooks/usePinLocationLookup';
import { getCurrentCoachId, updateSessionFullName } from '../auth/session';
import { MASTER_STALE_MS } from '../api/queryClient';
import { queryKeys } from '../api/queryKeys';
import { resolveMediaUrl } from '../utils/mediaUrl';
import { pickImageFromCameraOrLibrary } from '../utils/imagePicker';
import { buildCoachDescriptionSuggestions } from '../utils/coachDescriptionSuggestions';
import type { ProfileStackScreenProps } from '../types/navigation';
import type { CoachProfileFull } from '../api/coachApi';
import type { CoachCategory } from '../types/models';

export default function EditProfileScreen({ navigation }: ProfileStackScreenProps<'EditProfile'>) {
  const profileQuery = useQuery({
    queryKey: queryKeys.coachProfileFull,
    queryFn: getCoachProfileFull,
  });
  const categoriesQuery = useQuery({
    queryKey: queryKeys.coachCategories,
    queryFn: getCoachCategories,
    staleTime: MASTER_STALE_MS,
  });
  const countriesQuery = useQuery({
    queryKey: queryKeys.countries,
    queryFn: getCountries,
    staleTime: MASTER_STALE_MS,
  });

  const errorMessage =
    profileQuery.isError && !profileQuery.data
      ? getErrorMessage(profileQuery.error, 'Could not load your profile.')
      : null;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Edit Profile" onBack={() => navigation.goBack()} />

      {profileQuery.isPending ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
      ) : errorMessage ? (
        <ReloadState
          title="Could not load profile"
          message={errorMessage}
          onRetry={() => void profileQuery.refetch()}
          loading={profileQuery.isFetching}
          showPullHint={false}
        />
      ) : (
        <EditProfileForm
          profile={profileQuery.data!}
          categories={categoriesQuery.data?.length ? categoriesQuery.data : []}
          countries={countriesQuery.data ?? []}
          onDone={() => navigation.goBack()}
        />
      )}
    </View>
  );
}

interface EditProfileFormProps {
  profile: CoachProfileFull;
  categories: CoachCategory[];
  countries: MasterOption[];
  onDone: () => void;
}

function EditProfileForm({ profile, categories, countries, onDone }: EditProfileFormProps) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollLowerFieldsIntoView = useScrollLowerFieldsIntoView(scrollRef);
  const [coachName, setCoachName] = useState(profile.coachName);
  // Empty until categories load or user picks; display falls back to profile type label.
  const [categoryLabel, setCategoryLabel] = useState(
    categories.find(c => c.code === profile.coachTypeCode)?.label ?? '',
  );
  const [mobile] = useState(profile.mobile);
  const [email] = useState(profile.email);
  const [businessName, setBusinessName] = useState(profile.businessName);
  const [experienceYears, setExperienceYears] = useState(String(profile.experienceYears ?? ''));
  const [happyClientCount, setHappyClientCount] = useState(String(profile.happyClientCount ?? ''));
  const [certificationCount, setCertificationCount] = useState(
    String(profile.certificationCount ?? ''),
  );
  const [tagline, setTagline] = useState(profile.tagline);
  const [localLanguage, setLocalLanguage] = useState(profile.localLanguage);
  const [bmiReportTemplate, setBmiReportTemplate] = useState(profile.bmiReportTemplate);
  const [dietChartTemplate, setDietChartTemplate] = useState(profile.dietChartTemplate);
  const [coachDesc, setCoachDesc] = useState(profile.coachDesc);
  const [locality, setLocality] = useState(profile.locality);
  const [addLine, setAddLine] = useState(profile.addLine);
  const [cityCd, setCityCd] = useState(profile.cityCd);
  const [stateCd, setStateCd] = useState(profile.stateCd);
  const [pinCode, setPinCode] = useState(profile.pinCode);
  const [countryLabel, setCountryLabel] = useState(
    countries.find(c => c.code === profile.countryCd || c.label === profile.countryCd)?.label ??
      profile.countryCd,
  );
  // null = not edited yet => derive from profile; [] = user cleared all services.
  const [serviceLabels, setServiceLabels] = useState<string[] | null>(null);
  const [servicesForCategory, setServicesForCategory] = useState(profile.coachTypeCode);
  // Auto-select all services when category has none saved yet.
  const [autoSelectServices, setAutoSelectServices] = useState(
    () => !!profile.coachTypeCode && profile.serviceCodes.length === 0,
  );
  const [logoUrl, setLogoUrl] = useState(profile.logoUrl);
  const [profilePicUrl, setProfilePicUrl] = useState(profile.profilePicUrl);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const {
    errorFields,
    formErrorBanner,
    clearFieldError,
    clearAllErrors,
    applyValidation,
    setBanner,
  } = useFormFieldErrors();
  const queryClient = useQueryClient();

  const resolvedCategoryLabel =
    categoryLabel || categories.find(c => c.code === profile.coachTypeCode)?.label || '';
  const categoryCode =
    categories.find(c => c.label === resolvedCategoryLabel)?.code ?? profile.coachTypeCode;

  // Reset service selection when category changes (setState during render).
  if (servicesForCategory !== categoryCode) {
    setServicesForCategory(categoryCode);
    setServiceLabels(null);
    setAutoSelectServices(true);
  }

  const servicesQuery = useQuery({
    queryKey: queryKeys.servicesForCategory(categoryCode),
    queryFn: () => getServicesForCategory(categoryCode),
    enabled: !!categoryCode,
    staleTime: MASTER_STALE_MS,
  });
  const serviceOptions: MasterOption[] = servicesQuery.data ?? [];

  if (autoSelectServices && serviceOptions.length > 0) {
    setAutoSelectServices(false);
    setServiceLabels(serviceOptions.map(s => s.label));
  }

  const countryCode =
    countries.find(c => c.label === countryLabel)?.code ??
    countries.find(c => c.code === profile.countryCd)?.code ??
    profile.countryCd;

  const pinLookup = usePinLocationLookup(pinCode, countryCode);
  // Apply pin lookup autofill once per completed lookup.
  const [appliedLookup, setAppliedLookup] = useState<{
    key: string;
    at: number;
    failed: boolean;
  } | null>(null);
  if (
    pinLookup.lookupKey &&
    (pinLookup.location || pinLookup.isError) &&
    (appliedLookup?.key !== pinLookup.lookupKey ||
      appliedLookup.at !== pinLookup.dataUpdatedAt ||
      appliedLookup.failed !== pinLookup.isError)
  ) {
    setAppliedLookup({
      key: pinLookup.lookupKey,
      at: pinLookup.dataUpdatedAt,
      failed: pinLookup.isError,
    });
    if (pinLookup.isError) {
      setCityCd('');
      setStateCd('');
    } else if (pinLookup.location) {
      setCityCd(pinLookup.location.city);
      setStateCd(pinLookup.location.state);
    }
  }

  const resolvedServiceLabels =
    serviceLabels !== null
      ? serviceLabels
      : categoryCode === profile.coachTypeCode && serviceOptions.length > 0
        ? serviceOptions.filter(s => profile.serviceCodes.includes(s.code)).map(s => s.label)
        : [];

  const pickImage = async (target: 'logo' | 'photo') => {
    const picked = await pickImageFromCameraOrLibrary({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!picked) return;

    const localUri = picked.uri;
    const previousUrl = target === 'logo' ? logoUrl : profilePicUrl;
    if (target === 'logo') setLogoUrl(localUri);
    else setProfilePicUrl(localUri);

    const dataUrl = `data:${picked.mimeType};base64,${picked.base64}`;
    const setUploading = target === 'logo' ? setUploadingLogo : setUploadingPhoto;
    setUploading(true);
    setBanner(null);
    try {
      const url = await uploadDocument({
        base64DataUrl: dataUrl,
        coachCode: profile.coachCode,
        refCode: profile.coachCode,
        refType: 'COACH',
        docType: target === 'logo' ? 'LOGO' : 'PROFILE_PIC',
        savedBy: Number(getCurrentCoachId()) || profile.coachId,
      });
      if (target === 'logo') setLogoUrl(url);
      else setProfilePicUrl(url);
    } catch (err) {
      if (target === 'logo') setLogoUrl(previousUrl);
      else setProfilePicUrl(previousUrl);
      setBanner(getErrorMessage(err, 'Image upload failed. Please try again.'));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (uploadingLogo || uploadingPhoto) {
      setBanner('Please wait for the image upload to finish.');
      return;
    }
    if (
      applyValidation(
        validateCoachProfileEdit({
          coachName,
          categoryCode,
          mobile,
          email,
          pinCode,
          experienceYears,
          happyClientCount,
          certificationCount,
          coachDesc,
          addLine,
        }),
      )
    ) {
      return;
    }

    clearAllErrors();
    setSaving(true);
    try {
      const country = countries.find(c => c.label === countryLabel);
      const experienceYearsNum = parseInt(experienceYears, 10) || 0;
      const happyClientCountNum = parseInt(happyClientCount, 10) || 0;
      const addLineTrimmed = addLine.trim();
      const pinCodeTrimmed = pinCode.trim();
      const coachDescTrimmed = coachDesc.trim();
      // Preserve packages/events from the latest profile so core save cannot wipe them.
      const latest = await getCoachProfileFull();
      await saveCoachProfile({
        coachId: profile.coachId,
        coachName: coachName.trim(),
        coachTypeCode: categoryCode,
        mobile: mobile.trim(),
        email: email.trim(),
        businessName: businessName.trim(),
        serviceCodes: resolvedServiceLabels
          .map(label => serviceOptions.find(s => s.label === label)?.code)
          .filter((code): code is string => !!code),
        experienceYears: experienceYearsNum,
        happyClientCount: happyClientCountNum,
        certificationCount: parseInt(certificationCount, 10) || 0,
        tagline: tagline.trim(),
        localLanguage: localLanguage.trim(),
        locality: locality.trim(),
        add_Line: addLineTrimmed,
        city_Cd: cityCd.trim(),
        state_Cd: stateCd.trim(),
        pinCode: pinCodeTrimmed,
        country_Cd: country?.code ?? countryLabel,
        logo_Url: logoUrl,
        profile_Pic_Url: profilePicUrl,
        coachDesc: coachDescTrimmed,
        bmiReportTemplate: bmiReportTemplate.trim(),
        dietChartTemplate: dietChartTemplate.trim(),
        packages: serializeCoachPackages(latest.packages),
        events: serializeCoachEvents(latest.events),
        isProfileVisible: isPublicProfileDataSufficient({
          experienceYears: experienceYearsNum,
          happyClientCount: happyClientCountNum,
          coachDesc: coachDescTrimmed,
          add_Line: addLineTrimmed,
          pinCode: pinCodeTrimmed,
        })
          ? 1
          : 0,
      });
      await updateSessionFullName(coachName.trim());
      queryClient.invalidateQueries({ queryKey: queryKeys.coachProfile });
      queryClient.invalidateQueries({ queryKey: queryKeys.coachProfileFull });
      queryClient.invalidateQueries({ queryKey: queryKeys.coachGallery(profile.coachCode) });
      queryClient.invalidateQueries({ queryKey: ['coachPublicList'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.coachProfileByCode(profile.coachCode) });
      Alert.alert('Profile Updated', 'Your changes have been saved.', [
        { text: 'OK', onPress: onDone },
      ]);
    } catch (err) {
      setBanner(getErrorMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const descriptionSuggestions = buildCoachDescriptionSuggestions({
    coachName,
    categoryLabel: resolvedCategoryLabel,
    categoryDescription: categories.find(c => c.label === resolvedCategoryLabel)?.description,
    serviceLabels: resolvedServiceLabels,
    experienceYears,
    happyClientCount,
  });

  return (
    <KeyboardSafeScroll
      ref={scrollRef}
      style={styles.body}
      contentContainerStyle={styles.bodyContent}
      keyboardPadding={180}
    >
      <FormErrorBanner message={formErrorBanner || pinLookup.error} />

      {profile.isProfileVisible !== true ? (
        <Text style={styles.visibilityHint}>
          Complete public fields (experience, happy clients, description, address, pincode) and save
          to appear on Find a Coach.
        </Text>
      ) : null}

      <View style={styles.imagesRow}>
        <ImagePickerTile
          label="Profile Photo"
          uri={resolveMediaUrl(profilePicUrl)}
          uploading={uploadingPhoto}
          onPress={() => pickImage('photo')}
        />
        <ImagePickerTile
          label="Logo"
          uri={resolveMediaUrl(logoUrl)}
          uploading={uploadingLogo}
          onPress={() => pickImage('logo')}
        />
      </View>

      <Field
        label="Coach Name"
        value={coachName}
        onChangeText={v => {
          setCoachName(v);
          clearFieldError('coachName');
        }}
        required
        hasError={!!errorFields.coachName}
      />
      <DropdownField
        label="Category"
        value={resolvedCategoryLabel}
        options={categories.map(c => c.label)}
        onChange={v => {
          setCategoryLabel(v);
          clearFieldError('category');
        }}
        placeholder="Select category"
        required
        hasError={!!errorFields.category}
      />
      <View style={styles.field}>
        <FormFieldLabel required>Mobile</FormFieldLabel>
        <PhoneTextInput
          style={[styles.input, styles.inputReadOnly]}
          value={mobile}
          onChangeText={() => {}}
          editable={false}
          placeholderTextColor={Colors.textLight}
        />
        <Text style={styles.fieldHintInline}>Mobile number cannot be changed.</Text>
      </View>
      <View style={styles.field}>
        <FormFieldLabel required>Email</FormFieldLabel>
        <TextInput
          style={[styles.input, styles.inputReadOnly, errorFields.email && styles.inputError]}
          value={email}
          editable={false}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor={Colors.textLight}
        />
        <Text style={styles.fieldHintInline}>Email ID cannot be changed.</Text>
      </View>

      <View style={styles.divider} />

      <Field label="Business Name" value={businessName} onChangeText={setBusinessName} />
      <View style={styles.row}>
        <View style={styles.half}>
          <Field
            label="Experience (yrs)"
            value={experienceYears}
            onChangeText={v => {
              setExperienceYears(v);
              clearFieldError('experienceYears');
            }}
            keyboardType="numeric"
            required
            hasError={!!errorFields.experienceYears}
          />
        </View>
        <View style={styles.half}>
          <Field
            label="Happy Clients"
            value={happyClientCount}
            onChangeText={v => {
              setHappyClientCount(v);
              clearFieldError('happyClientCount');
            }}
            keyboardType="numeric"
            required
            hasError={!!errorFields.happyClientCount}
          />
        </View>
      </View>
      <Text style={styles.fieldHint}>
        Shown as Clients on your public card and profile. Update it here for the number others see,
        not your live client list count.
      </Text>
      <View style={styles.row}>
        <View style={styles.half}>
          <Field
            label="Certifications"
            value={certificationCount}
            onChangeText={v => {
              setCertificationCount(v);
              clearFieldError('certificationCount');
            }}
            keyboardType="numeric"
            hasError={!!errorFields.certificationCount}
          />
        </View>
        <View style={styles.half}>
          <Field label="Tagline" value={tagline} onChangeText={setTagline} />
        </View>
      </View>

      <MultiSelectField
        label="Services"
        value={resolvedServiceLabels}
        options={serviceOptions.map(s => s.label)}
        onChange={setServiceLabels}
        placeholder={servicesQuery.isPending ? 'Loading services...' : 'Select services'}
      />

      <View style={styles.field}>
        <FormFieldLabel required>About / Description</FormFieldLabel>
        <TextInput
          style={[styles.textarea, errorFields.coachDesc && styles.inputError]}
          multiline
          numberOfLines={4}
          value={coachDesc}
          onChangeText={v => {
            setCoachDesc(v);
            clearFieldError('coachDesc');
          }}
          placeholder="Tell clients about your coaching style and experience"
          placeholderTextColor={Colors.textLight}
          onFocus={scrollLowerFieldsIntoView}
        />
        <Text style={styles.suggestLabel}>Suggested descriptions (tap to use)</Text>
        <View style={styles.suggestChips}>
          {descriptionSuggestions.map((text, i) => (
            <TouchableOpacity
              key={i}
              style={styles.suggestChip}
              onPress={() => {
                setCoachDesc(text);
                clearFieldError('coachDesc');
              }}
            >
              <Text style={styles.suggestChipText} numberOfLines={3}>
                {text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>Plan & report settings</Text>
      <Text style={styles.fieldHint}>
        Used for diet plans and BMI reports. Local language is stored as a code (e.g. hi for Hindi).
      </Text>
      <DropdownField
        label="Local language"
        value={localLanguage}
        options={LOCAL_LANGUAGE_OPTIONS}
        onChange={setLocalLanguage}
        placeholder="Select language"
      />
      <Field
        label="BMI report template"
        value={bmiReportTemplate}
        onChangeText={setBmiReportTemplate}
        onFocus={scrollLowerFieldsIntoView}
        autoCapitalize="none"
      />
      <Field
        label="Diet plan template"
        value={dietChartTemplate}
        onChangeText={setDietChartTemplate}
        onFocus={scrollLowerFieldsIntoView}
        autoCapitalize="none"
      />

      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>Address</Text>
      <Text style={styles.fieldHint}>Enter pincode to auto-fill city and state.</Text>
      <View style={styles.row}>
        <View style={styles.half}>
          <View style={styles.field}>
            <FormFieldLabel required>Pin Code</FormFieldLabel>
            <View style={styles.pinInputWrap}>
              <TextInput
                style={[
                  styles.input,
                  styles.pinInput,
                  (errorFields.pinCode || !!pinLookup.error) && styles.inputError,
                ]}
                value={pinCode}
                onChangeText={v => {
                  setPinCode(sanitizePinInput(v));
                  clearFieldError('pinCode');
                }}
                keyboardType="number-pad"
                maxLength={6}
                placeholderTextColor={Colors.textLight}
                onFocus={scrollLowerFieldsIntoView}
              />
              {pinLookup.lookingUp ? (
                <ActivityIndicator color={Colors.primary} size="small" style={styles.pinLoader} />
              ) : null}
            </View>
          </View>
        </View>
        <View style={styles.half}>
          <DropdownField
            label="Country"
            value={countryLabel}
            options={countries.map(c => c.label)}
            onChange={setCountryLabel}
            placeholder="Select country"
          />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.half}>
          <Field
            label="City"
            value={cityCd}
            onChangeText={setCityCd}
            onFocus={scrollLowerFieldsIntoView}
          />
        </View>
        <View style={styles.half}>
          <Field
            label="State"
            value={stateCd}
            onChangeText={setStateCd}
            onFocus={scrollLowerFieldsIntoView}
          />
        </View>
      </View>
      <Field
        label="Locality"
        value={locality}
        onChangeText={setLocality}
        onFocus={scrollLowerFieldsIntoView}
      />
      <Field
        label="Address Line"
        value={addLine}
        onChangeText={v => {
          setAddLine(v);
          clearFieldError('addLine');
        }}
        required
        hasError={!!errorFields.addLine}
        onFocus={scrollLowerFieldsIntoView}
      />

      <TouchableOpacity
        style={[
          styles.saveBtn,
          (saving || uploadingLogo || uploadingPhoto) && styles.saveBtnDisabled,
        ]}
        onPress={handleSave}
        disabled={saving || uploadingLogo || uploadingPhoto}
      >
        {saving ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <>
            <Text style={styles.saveText}>Save Changes</Text>
            <Ionicons name="checkmark" size={18} color={Colors.white} />
          </>
        )}
      </TouchableOpacity>
    </KeyboardSafeScroll>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  required?: boolean;
  hasError?: boolean;
  onFocus?: () => void;
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  maxLength,
  autoCapitalize,
  required,
  hasError,
  onFocus,
}: FieldProps) {
  return (
    <View style={styles.field}>
      <FormFieldLabel required={required}>{label}</FormFieldLabel>
      <TextInput
        style={[styles.input, hasError && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType || 'default'}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCapitalize === 'none' ? false : undefined}
        placeholderTextColor={Colors.textLight}
        onFocus={onFocus}
      />
    </View>
  );
}

function ImagePickerTile({
  label,
  uri,
  uploading,
  onPress,
}: {
  label: string;
  uri: string;
  uploading: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.imageTile} onPress={onPress} disabled={uploading}>
      {uri ? <Image source={{ uri }} style={styles.imagePreview} /> : null}
      {uploading ? (
        <View style={[styles.imageOverlay, !uri && styles.imageOverlayFill]}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : !uri ? (
        <Ionicons name="camera-outline" size={24} color={Colors.textLight} />
      ) : null}
      <Text style={styles.imageLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  body: { flex: 1 },
  bodyContent: { padding: 20 },
  imagesRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  imageTile: {
    flex: 1,
    height: 96,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  imagePreview: { width: '100%', height: '100%', position: 'absolute' },
  imageOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  imageOverlayFill: { backgroundColor: 'transparent' },
  imageLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textLight,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  field: { marginBottom: 16 },
  input: {
    backgroundColor: Colors.white,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 48,
    fontSize: 14,
    color: Colors.textDark,
  },
  inputError: { borderColor: Colors.destructive },
  inputReadOnly: { backgroundColor: Colors.background, color: Colors.textLight },
  fieldHintInline: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 4,
  },
  visibilityHint: {
    fontSize: 12,
    color: Colors.textLight,
    lineHeight: 17,
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  suggestLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textLight,
    marginTop: 8,
    marginBottom: 6,
  },
  suggestChips: { gap: 8 },
  suggestChip: {
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  suggestChipText: { fontSize: 12, color: Colors.textDark, lineHeight: 17 },
  pinInputWrap: { position: 'relative', justifyContent: 'center' },
  pinInput: { paddingRight: 36 },
  pinLoader: { position: 'absolute', right: 12 },
  textarea: {
    backgroundColor: Colors.white,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 12,
    fontSize: 14,
    color: Colors.textDark,
    height: 90,
    textAlignVertical: 'top',
  },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  fieldHint: {
    fontSize: 11,
    color: Colors.textLight,
    lineHeight: 16,
    marginTop: -8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 8,
  },
  divider: { height: 1, backgroundColor: Colors.border, marginBottom: 16, marginTop: 4 },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    ...Shadow.md,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
