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
import {
  Colors,
  FontFamily,
  IconSize,
  PressOpacity,
  Radius,
  Shadow,
  Spacing,
  Typography,
  formFieldStyles,
  headingFont,
} from '../../constants/theme';
import PhoneTextInput from '../../components/PhoneTextInput';
import DropdownField from '../../components/DropdownField';
import FormErrorBanner from '../../components/FormErrorBanner';
import FormFieldLabel from '../../components/FormFieldLabel';
import KeyboardSafeScroll, {
  STICKY_FOOTER_KEYBOARD_PADDING,
  useScrollLowerFieldsIntoView,
} from '../../components/KeyboardSafeScroll';
import WaveScreenHeader from '../../components/WaveScreenHeader';
import StickyFooter from '../../components/StickyFooter';
import ReloadState from '../../components/ReloadState';
import MultiSelectField from '../../components/MultiSelectField';
import ProfileCompletionCard from '../../components/profile/ProfileCompletionCard';
import type { IoniconName } from '../../types/icons';
import { navigateToDashboard } from '../../utils/navigationBack';
import {
  getCoachProfileFull,
  getCoachCategories,
  getServicesForCategory,
  isPublicProfileDataSufficient,
  saveCoachProfile,
} from '../../api/coachApi';
import { getCountries, type MasterOption } from '../../api/masterApi';
import { uploadDocument } from '../../api/documentApi';
import { getErrorMessage } from '../../api/client';
import { LOCAL_LANGUAGE_OPTIONS } from '../../data/localLanguages';
import { sanitizePinInput, validateCoachProfileEdit } from '../../utils/validation';
import { serializeCoachEvents } from '../../utils/coachEvents';
import { serializeCoachPackages } from '../../utils/coachPackages';
import { getProfileCompletion } from '../../utils/profileCompletion';
import { useFormFieldErrors } from '../../hooks/useFormFieldErrors';
import { usePinLocationLookup } from '../../hooks/usePinLocationLookup';
import { getDocumentSavedById, updateSessionFullName } from '../../auth/session';
import { MASTER_STALE_MS } from '../../api/queryClient';
import { queryKeys, invalidateCoachProfileCaches } from '../../api/queryKeys';
import { isPendingLocalMediaUrl, resolveMediaUrl } from '../../utils/mediaUrl';
import { pickImageFromCameraOrLibrary } from '../../utils/imagePicker';
import { buildCoachDescriptionSuggestions } from '../../utils/coachDescriptionSuggestions';
import type { ProfileStackScreenProps } from '../../types/navigation';
import type { CoachProfileFull } from '../../api/coachApi';
import type { CoachCategory } from '../../types/models';

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
      <WaveScreenHeader
        title="Edit Profile"
        onBack={() => navigation.goBack()}
        onHome={() => navigateToDashboard(navigation)}
      />

      {profileQuery.isPending ? (
        <ActivityIndicator color={Colors.secondary} style={{ marginTop: 60 }} />
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
  const [step, setStep] = useState<1 | 2>(1);
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
        savedBy: getDocumentSavedById(profile.coachId),
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
    if (
      uploadingLogo ||
      uploadingPhoto ||
      isPendingLocalMediaUrl(logoUrl) ||
      isPendingLocalMediaUrl(profilePicUrl)
    ) {
      setBanner('Please wait for the image upload to finish.');
      return;
    }
    const validation = validateCoachProfileEdit({
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
    });
    if (applyValidation(validation)) {
      if (!validation.ok) {
        const step1Keys = ['coachName', 'category', 'mobile', 'email'];
        if (step1Keys.some(k => validation.errors[k])) {
          setStep(1);
        }
      }
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
      invalidateCoachProfileCaches(queryClient, profile.coachCode, { gallery: true });
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

  const liveCompletion = getProfileCompletion({
    experienceYears: parseInt(experienceYears, 10) || 0,
    happyClientCount: parseInt(happyClientCount, 10) || 0,
    coachDesc,
    addLine,
    pinCode,
    profilePicUrl,
  });

  return (
    <View style={styles.formRoot}>
      <KeyboardSafeScroll
        ref={scrollRef}
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardPadding={STICKY_FOOTER_KEYBOARD_PADDING}
      >
        <StepIndicator step={step} />

        <FormErrorBanner message={formErrorBanner || pinLookup.error} />

        {!liveCompletion.isPublicReady || liveCompletion.percent < 100 ? (
          <View style={styles.completionWrap}>
            <ProfileCompletionCard
              completion={liveCompletion}
              variant="detailed"
              showAction={false}
            />
          </View>
        ) : null}

        {step === 1 ? (
          <>
            <FormSection
              icon="person-outline"
              title="Identify"
              hint="Name and category appear on your public card"
            >
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
                <View style={[styles.inputWrap, styles.inputReadOnly]}>
                  <PhoneTextInput
                    style={styles.input}
                    value={mobile}
                    onChangeText={() => {}}
                    editable={false}
                    placeholderTextColor={Colors.textLight}
                  />
                </View>
                <Text style={styles.fieldHintInline}>Mobile number cannot be changed.</Text>
              </View>
              <View style={styles.field}>
                <FormFieldLabel required>Email</FormFieldLabel>
                <View
                  style={[
                    styles.inputWrap,
                    styles.inputReadOnly,
                    errorFields.email && styles.inputError,
                  ]}
                >
                  <TextInput
                    style={styles.input}
                    value={email}
                    editable={false}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor={Colors.textLight}
                  />
                </View>
                <Text style={styles.fieldHintInline}>Email ID cannot be changed.</Text>
              </View>
            </FormSection>

            <FormSection
              icon="camera-outline"
              title="Photo"
              hint="A Clear photo helps clients recognize you."
            >
              <View style={styles.imagesDash}>
                <ImagePickerTile
                  label="Profile Photo"
                  uri={resolveMediaUrl(profilePicUrl)}
                  uploading={uploadingPhoto}
                  onPress={() => pickImage('photo')}
                />
                <View style={styles.imagesDivider} />
                <ImagePickerTile
                  label="Logo"
                  uri={resolveMediaUrl(logoUrl)}
                  uploading={uploadingLogo}
                  onPress={() => pickImage('logo')}
                />
              </View>
            </FormSection>
          </>
        ) : (
          <>
            <FormSection
              icon="briefcase-outline"
              title="Professional"
              hint="These fields power your find a coach listing"
            >
              <Field label="Business Name" value={businessName} onChangeText={setBusinessName} />
              <View style={styles.row}>
                <View style={styles.half}>
                  <Field
                    label="Experience(yrs)"
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
                    label="Happy Client(yrs)"
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
                Shown as Clients on your public card. Update it for the number others see — not your
                live roster count.
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
                    required
                    hasError={!!errorFields.certificationCount}
                  />
                </View>
                <View style={styles.half}>
                  <Field
                    label="Tagline"
                    value={tagline}
                    onChangeText={setTagline}
                    required
                  />
                </View>
              </View>

              <MultiSelectField
                label="Services"
                value={resolvedServiceLabels}
                options={serviceOptions.map(s => s.label)}
                onChange={setServiceLabels}
                placeholder={servicesQuery.isPending ? 'Loading services...' : 'Select services'}
                required
              />
            </FormSection>

            <FormSection icon="clipboard-outline" title="About/ Description">
              <View style={styles.field}>
                <FormFieldLabel required>About/ Description</FormFieldLabel>
                <TextInput
                  style={[styles.textarea, errorFields.coachDesc && styles.textareaError]}
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
                <Text style={styles.suggestLabel}>Suggested Description (tap to use)</Text>
                <View style={styles.suggestChips}>
                  {descriptionSuggestions.map((text, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.suggestChip}
                      onPress={() => {
                        setCoachDesc(text);
                        clearFieldError('coachDesc');
                      }}
                      activeOpacity={PressOpacity.default}
                      accessibilityRole="button"
                      accessibilityLabel={`Use suggestion: ${text.slice(0, 48)}`}
                    >
                      <Text style={styles.suggestChipText} numberOfLines={4}>
                        {text}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </FormSection>

            <FormSection
              icon="document-text-outline"
              title="Plan & report settings"
              hint="Used for diet plans and BMI reports. Language is stored as a code (e.g. hi)."
            >
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
            </FormSection>

            <FormSection
              icon="location-outline"
              title="Address"
              hint="Enter pincode to auto-fill city and state."
            >
              <View style={styles.row}>
                <View style={styles.half}>
                  <View style={styles.field}>
                    <FormFieldLabel required>Pin Code</FormFieldLabel>
                    <View
                      style={[
                        styles.inputWrap,
                        styles.pinInputWrap,
                        (errorFields.pinCode || !!pinLookup.error) && styles.inputError,
                      ]}
                    >
                      <TextInput
                        style={[styles.input, styles.pinInput]}
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
                        <ActivityIndicator
                          color={Colors.secondary}
                          size="small"
                          style={styles.pinLoader}
                        />
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
            </FormSection>
          </>
        )}
      </KeyboardSafeScroll>

      <StickyFooter>
        <View style={styles.stepFooter}>
          <TouchableOpacity
            style={styles.prevBtn}
            onPress={() => {
              if (step === 1) {
                onDone();
                return;
              }
              setStep(1);
              scrollRef.current?.scrollTo({ y: 0, animated: false });
            }}
            activeOpacity={PressOpacity.default}
            accessibilityRole="button"
            accessibilityLabel="Previous"
          >
            <Text style={styles.prevBtnText}>Previous</Text>
            <View style={styles.prevIconCircle}>
              <Ionicons
                name="chevron-back-outline"
                size={IconSize.sm}
                color={Colors.white}
              />
            </View>
          </TouchableOpacity>

          {step === 1 ? (
            <TouchableOpacity
              style={styles.nextBtn}
              onPress={() => {
                setStep(2);
                scrollRef.current?.scrollTo({ y: 0, animated: false });
              }}
              activeOpacity={PressOpacity.default}
              accessibilityRole="button"
              accessibilityLabel="Next"
            >
              <Text style={styles.nextBtnText}>Next</Text>
              <View style={styles.nextIconCircle}>
                <Ionicons
                  name="chevron-forward-outline"
                  size={IconSize.sm}
                  color={Colors.secondary}
                />
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.nextBtn,
                (saving || uploadingLogo || uploadingPhoto) && styles.nextBtnDisabled,
              ]}
              onPress={() => void handleSave()}
              disabled={saving || uploadingLogo || uploadingPhoto}
              activeOpacity={PressOpacity.default}
              accessibilityRole="button"
              accessibilityLabel="Save Changes"
              accessibilityState={{ busy: saving }}
            >
              {saving ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <Text style={styles.nextBtnText}>Save Changes</Text>
                  <Ionicons
                    name="checkmark-outline"
                    size={IconSize.md}
                    color={Colors.white}
                  />
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </StickyFooter>
    </View>
  );
}

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <View style={styles.stepRow} accessibilityRole="summary">
      <View style={styles.stepItem}>
        <View style={[styles.stepCircle, styles.stepCircleActive]}>
          <Text style={styles.stepCircleText}>1</Text>
        </View>
        <Text style={[styles.stepLabel, styles.stepLabelActive]} numberOfLines={2}>
          Photo/ Identify
        </Text>
      </View>
      <View style={[styles.stepLine, step === 2 && styles.stepLineActive]} />
      <View style={styles.stepItem}>
        <View style={[styles.stepCircle, step === 2 && styles.stepCircleActive]}>
          <Text style={[styles.stepCircleText, step !== 2 && styles.stepCircleTextInactive]}>
            2
          </Text>
        </View>
        <Text
          style={[styles.stepLabel, step === 2 && styles.stepLabelActive]}
          numberOfLines={2}
        >
          Professional & About/Description
        </Text>
      </View>
    </View>
  );
}

function FormSection({
  title,
  hint,
  icon,
  children,
}: {
  title: string;
  hint?: string;
  icon?: IoniconName;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        {icon ? (
          <View style={styles.sectionIconWrap}>
            <Ionicons name={icon} size={IconSize.md} color={Colors.secondary} />
          </View>
        ) : null}
        <View style={styles.sectionCopy}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
        </View>
      </View>
      {children}
    </View>
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
      <View style={[styles.inputWrap, hasError && styles.inputError]}>
        <TextInput
          style={styles.input}
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
    <TouchableOpacity
      style={styles.imageTile}
      onPress={onPress}
      disabled={uploading}
      activeOpacity={PressOpacity.default}
      accessibilityRole="button"
      accessibilityLabel={uri ? `Change ${label}` : `Upload ${label}`}
      accessibilityState={{ busy: uploading, disabled: uploading }}
    >
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
  formRoot: { flex: 1 },
  body: { flex: 1 },
  bodyContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  completionWrap: { marginBottom: Spacing.xs },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  stepItem: { flex: 1, alignItems: 'center', maxWidth: 140 },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stepCircleActive: {
    backgroundColor: Colors.secondary,
  },
  stepCircleText: {
    color: Colors.white,
    fontSize: 13,
    fontFamily: FontFamily.bold,
  },
  stepCircleTextInactive: {
    color: Colors.white,
  },
  stepLabel: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 14,
  },
  stepLabelActive: {
    color: Colors.secondary,
    fontFamily: FontFamily.semibold,
  },
  stepLine: {
    flex: 0.6,
    height: 2,
    backgroundColor: Colors.border,
    marginTop: 13,
  },
  stepLineActive: {
    backgroundColor: Colors.secondary,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCopy: { flex: 1, minWidth: 0 },
  sectionTitle: {
    fontSize: 15,
    fontFamily: headingFont.bold,
    color: Colors.textDark,
    lineHeight: 20,
  },
  sectionHint: {
    ...Typography.caption,
    marginTop: 2,
  },
  imagesDash: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
  imagesDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  imageTile: {
    flex: 1,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    overflow: 'hidden',
    backgroundColor: Colors.disabledBg,
  },
  imagePreview: { width: '100%', height: '100%', position: 'absolute' },
  imageOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.onDarkSoft,
  },
  imageOverlayFill: { backgroundColor: 'transparent' },
  imageLabel: {
    fontSize: 12,
    fontFamily: FontFamily.semibold,
    color: Colors.secondary,
    marginTop: 4,
  },
  field: { marginBottom: Spacing.md },
  inputWrap: {
    ...formFieldStyles.wrap,
    ...formFieldStyles.wrapSurface,
  },
  input: formFieldStyles.input,
  inputError: formFieldStyles.wrapError,
  inputReadOnly: formFieldStyles.wrapDisabled,
  fieldHintInline: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    marginTop: 4,
  },
  suggestLabel: {
    fontSize: 11,
    fontFamily: FontFamily.semibold,
    color: Colors.textLight,
    marginTop: Spacing.xs,
    marginBottom: 6,
  },
  suggestChips: { gap: Spacing.xs },
  suggestChip: {
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  suggestChipText: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.textDark,
    lineHeight: 17,
  },
  pinInputWrap: { position: 'relative' },
  pinInput: { paddingRight: 36 },
  pinLoader: { position: 'absolute', right: 12 },
  textarea: {
    backgroundColor: Colors.white,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.sm,
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.textDark,
    height: 90,
    textAlignVertical: 'top',
  },
  textareaError: formFieldStyles.wrapError,
  row: { flexDirection: 'row', gap: Spacing.sm },
  half: { flex: 1 },
  fieldHint: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    lineHeight: 16,
    marginTop: -8,
    marginBottom: Spacing.md,
  },
  stepFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  prevBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    minHeight: 48,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.secondary,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
  },
  prevBtnText: {
    color: Colors.secondary,
    fontSize: 15,
    fontFamily: FontFamily.bold,
  },
  prevIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtn: {
    flex: 1.15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    minHeight: 48,
    borderRadius: Radius.pill,
    backgroundColor: Colors.secondary,
    paddingHorizontal: Spacing.md,
  },
  nextBtnDisabled: { opacity: 0.7 },
  nextBtnText: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: FontFamily.bold,
  },
  nextIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
