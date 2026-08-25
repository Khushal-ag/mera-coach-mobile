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
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../constants/theme';
import PhoneTextInput from '../components/PhoneTextInput';
import DropdownField from '../components/DropdownField';
import FormErrorBanner from '../components/FormErrorBanner';
import FormFieldLabel from '../components/FormFieldLabel';
import KeyboardSafeScroll, { useScrollLowerFieldsIntoView } from '../components/KeyboardSafeScroll';
import ScreenHeader from '../components/ScreenHeader';
import MultiSelectField from '../components/MultiSelectField';
import {
  getCoachProfileFull,
  getCoachCategories,
  getServicesForCategory,
  saveCoachProfile,
} from '../api/coachApi';
import { getCountries, type MasterOption } from '../api/masterApi';
import { uploadDocument } from '../api/documentApi';
import { getErrorMessage } from '../api/client';
import {
  sanitizeEmailInput,
  sanitizePinInput,
  validateCoachProfileEdit,
} from '../utils/validation';
import { useFormFieldErrors } from '../hooks/useFormFieldErrors';
import { usePinLocationLookup } from '../hooks/usePinLocationLookup';
import { getCurrentCoachId } from '../auth/session';
import { queryKeys } from '../api/queryKeys';
import { resolveMediaUrl } from '../utils/mediaUrl';
import type { RootScreenProps } from '../types/navigation';
import type { CoachProfileFull } from '../api/coachApi';
import type { CoachCategory } from '../types/models';

export default function EditProfileScreen({ navigation }: RootScreenProps<'EditProfile'>) {
  const profileQuery = useQuery({
    queryKey: queryKeys.coachProfileFull,
    queryFn: getCoachProfileFull,
  });
  const categoriesQuery = useQuery({
    queryKey: queryKeys.coachCategories,
    queryFn: getCoachCategories,
  });
  const countriesQuery = useQuery({ queryKey: queryKeys.countries, queryFn: getCountries });

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
        <Text style={styles.empty}>{errorMessage}</Text>
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
  // Empty until categories load or user picks — display falls back to profile type label.
  const [categoryLabel, setCategoryLabel] = useState(
    categories.find(c => c.code === profile.coachTypeCode)?.label ?? '',
  );
  const [mobile, setMobile] = useState(profile.mobile);
  const [email, setEmail] = useState(profile.email);
  const [businessName, setBusinessName] = useState(profile.businessName);
  const [experienceYears, setExperienceYears] = useState(String(profile.experienceYears || ''));
  const [happyClientCount, setHappyClientCount] = useState(String(profile.happyClientCount || ''));
  const [tagline, setTagline] = useState(profile.tagline);
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
  // null = not edited yet → derive from profile; [] = user cleared all services.
  const [serviceLabels, setServiceLabels] = useState<string[] | null>(null);
  const [servicesForCategory, setServicesForCategory] = useState(profile.coachTypeCode);
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

  // Adjust state during render when category changes (React-recommended pattern).
  if (servicesForCategory !== categoryCode) {
    setServicesForCategory(categoryCode);
    setServiceLabels(null);
  }

  const servicesQuery = useQuery({
    queryKey: queryKeys.servicesForCategory(categoryCode),
    queryFn: () => getServicesForCategory(categoryCode),
    enabled: !!categoryCode,
  });
  const serviceOptions: MasterOption[] = servicesQuery.data ?? [];

  const countryCode =
    countries.find(c => c.label === countryLabel)?.code ??
    countries.find(c => c.code === profile.countryCd)?.code ??
    profile.countryCd;

  const pinLookup = usePinLocationLookup(pinCode, countryCode);
  // Apply autofill when a new lookup completes (React: adjust state during render).
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
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to upload an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]?.base64) return;

    const asset = result.assets[0];
    const localUri = asset.uri;
    const previousUrl = target === 'logo' ? logoUrl : profilePicUrl;
    // Show local file URI immediately — upload returns a relative `/document/…` path.
    if (target === 'logo') setLogoUrl(localUri);
    else setProfilePicUrl(localUri);

    const dataUrl = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
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
        }),
      )
    ) {
      return;
    }

    clearAllErrors();
    setSaving(true);
    try {
      const country = countries.find(c => c.label === countryLabel);
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
        experienceYears: parseInt(experienceYears, 10) || 0,
        happyClientCount: parseInt(happyClientCount, 10) || 0,
        tagline: tagline.trim(),
        locality: locality.trim(),
        add_Line: addLine.trim(),
        city_Cd: cityCd.trim(),
        state_Cd: stateCd.trim(),
        pinCode: pinCode.trim(),
        country_Cd: country?.code ?? countryLabel,
        logo_Url: logoUrl,
        profile_Pic_Url: profilePicUrl,
        coachDesc: coachDesc.trim(),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.coachProfile });
      queryClient.invalidateQueries({ queryKey: queryKeys.coachProfileFull });
      Alert.alert('Profile Updated', 'Your changes have been saved.', [
        { text: 'OK', onPress: onDone },
      ]);
    } catch (err) {
      setBanner(getErrorMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardSafeScroll
      ref={scrollRef}
      style={styles.body}
      contentContainerStyle={styles.bodyContent}
      keyboardPadding={180}
    >
      <FormErrorBanner message={formErrorBanner || pinLookup.error} />

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
          style={[styles.input, errorFields.mobile && styles.inputError]}
          value={mobile}
          onChangeText={v => {
            setMobile(v);
            clearFieldError('mobile');
          }}
          placeholderTextColor={Colors.textLight}
        />
      </View>
      <Field
        label="Email"
        value={email}
        onChangeText={v => {
          setEmail(sanitizeEmailInput(v));
          clearFieldError('email');
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        required
        hasError={!!errorFields.email}
      />

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
            hasError={!!errorFields.happyClientCount}
          />
        </View>
      </View>
      <Text style={styles.fieldHint}>
        Shown as Clients on your public card and profile. Update it here for the number others see,
        not your live client list count.
      </Text>
      <Field label="Tagline" value={tagline} onChangeText={setTagline} />

      <MultiSelectField
        label="Services"
        value={resolvedServiceLabels}
        options={serviceOptions.map(s => s.label)}
        onChange={setServiceLabels}
        placeholder={servicesQuery.isPending ? 'Loading services...' : 'Select services'}
      />

      <View style={styles.field}>
        <FormFieldLabel>About / Description</FormFieldLabel>
        <TextInput
          style={styles.textarea}
          multiline
          numberOfLines={4}
          value={coachDesc}
          onChangeText={setCoachDesc}
          placeholder="Tell clients about your coaching style and experience"
          placeholderTextColor={Colors.textLight}
          onFocus={scrollLowerFieldsIntoView}
        />
      </View>

      <View style={styles.divider} />

      <Field
        label="Locality"
        value={locality}
        onChangeText={setLocality}
        onFocus={scrollLowerFieldsIntoView}
      />
      <Field
        label="Address Line"
        value={addLine}
        onChangeText={setAddLine}
        onFocus={scrollLowerFieldsIntoView}
      />
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
      <View style={styles.row}>
        <View style={styles.half}>
          <View style={styles.field}>
            <FormFieldLabel>Pin Code</FormFieldLabel>
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
  empty: { textAlign: 'center', color: Colors.textLight, fontSize: 13, marginTop: 40 },
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
