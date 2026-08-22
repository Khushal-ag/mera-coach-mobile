import React, { useState } from 'react';
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
  validateCoachContactFields,
  validateNonNegativeInt,
  validatePinCode,
  validateRequired,
  sanitizeEmailInput,
} from '../utils/validation';
import { getCurrentCoachId } from '../auth/session';
import { queryKeys } from '../api/queryKeys';
import type { RootScreenProps } from '../types/navigation';
import type { CoachProfileFull } from '../api/coachApi';
import type { CoachCategory } from '../types/models';

export default function EditProfileScreen({ navigation }: RootScreenProps<'EditProfile'>) {
  const profileQuery = useQuery({ queryKey: ['coachProfileFull'], queryFn: getCoachProfileFull });
  const categoriesQuery = useQuery({
    queryKey: queryKeys.coachCategories,
    queryFn: getCoachCategories,
  });
  const countriesQuery = useQuery({ queryKey: ['countries'], queryFn: getCountries });

  const errorMessage =
    profileQuery.isError && !profileQuery.data
      ? getErrorMessage(profileQuery.error, 'Could not load your profile.')
      : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

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
  const [error, setError] = useState('');
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
    queryKey: ['servicesForCategory', categoryCode],
    queryFn: () => getServicesForCategory(categoryCode),
    enabled: !!categoryCode,
  });
  const serviceOptions: MasterOption[] = servicesQuery.data ?? [];

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
    const dataUrl = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
    const setUploading = target === 'logo' ? setUploadingLogo : setUploadingPhoto;
    setUploading(true);
    setError('');
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
      setError(getErrorMessage(err, 'Image upload failed. Please try again.'));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const validationError =
      validateRequired(coachName, 'Coach name') ||
      (!categoryCode ? 'Coach category is required.' : null) ||
      validateCoachContactFields(mobile, email) ||
      validatePinCode(pinCode) ||
      validateNonNegativeInt(experienceYears, 'Experience years') ||
      validateNonNegativeInt(happyClientCount, 'Happy client count');
    if (validationError) return setError(validationError);

    setError('');
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
      queryClient.invalidateQueries({ queryKey: ['coachProfileFull'] });
      Alert.alert('Profile Updated', 'Your changes have been saved.', [
        { text: 'OK', onPress: onDone },
      ]);
    } catch (err) {
      setError(getErrorMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.body}
      contentContainerStyle={styles.bodyContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={18} color={Colors.primary} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.imagesRow}>
        <ImagePickerTile
          label="Profile Photo"
          uri={profilePicUrl}
          uploading={uploadingPhoto}
          onPress={() => pickImage('photo')}
        />
        <ImagePickerTile
          label="Logo"
          uri={logoUrl}
          uploading={uploadingLogo}
          onPress={() => pickImage('logo')}
        />
      </View>

      <Field label="Coach Name" value={coachName} onChangeText={setCoachName} />
      <DropdownField
        label="Category"
        value={resolvedCategoryLabel}
        options={categories.map(c => c.label)}
        onChange={setCategoryLabel}
        placeholder="Select category"
      />
      <View style={styles.field}>
        <Text style={styles.label}>Mobile</Text>
        <PhoneTextInput
          style={styles.input}
          value={mobile}
          onChangeText={setMobile}
          placeholderTextColor={Colors.textLight}
        />
      </View>
      <Field
        label="Email"
        value={email}
        onChangeText={v => setEmail(sanitizeEmailInput(v))}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <View style={styles.divider} />

      <Field label="Business Name" value={businessName} onChangeText={setBusinessName} />
      <View style={styles.row}>
        <View style={styles.half}>
          <Field
            label="Experience (yrs)"
            value={experienceYears}
            onChangeText={setExperienceYears}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.half}>
          <Field
            label="Happy Clients"
            value={happyClientCount}
            onChangeText={setHappyClientCount}
            keyboardType="numeric"
          />
        </View>
      </View>
      <Field label="Tagline" value={tagline} onChangeText={setTagline} />

      <MultiSelectField
        label="Services"
        value={resolvedServiceLabels}
        options={serviceOptions.map(s => s.label)}
        onChange={setServiceLabels}
        placeholder={servicesQuery.isPending ? 'Loading services...' : 'Select services'}
      />

      <View style={styles.field}>
        <Text style={styles.label}>About / Description</Text>
        <TextInput
          style={styles.textarea}
          multiline
          numberOfLines={4}
          value={coachDesc}
          onChangeText={setCoachDesc}
          placeholder="Tell clients about your coaching style and experience"
          placeholderTextColor={Colors.textLight}
        />
      </View>

      <View style={styles.divider} />

      <Field label="Locality" value={locality} onChangeText={setLocality} />
      <Field label="Address Line" value={addLine} onChangeText={setAddLine} />
      <View style={styles.row}>
        <View style={styles.half}>
          <Field label="City" value={cityCd} onChangeText={setCityCd} />
        </View>
        <View style={styles.half}>
          <Field label="State" value={stateCd} onChangeText={setStateCd} />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.half}>
          <Field
            label="Pin Code"
            value={pinCode}
            onChangeText={setPinCode}
            keyboardType="numeric"
          />
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
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
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
    </ScrollView>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  maxLength,
  autoCapitalize,
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType || 'default'}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCapitalize === 'none' ? false : undefined}
        placeholderTextColor={Colors.textLight}
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
      {uploading ? (
        <ActivityIndicator color={Colors.primary} />
      ) : uri ? (
        <Image source={{ uri }} style={styles.imagePreview} />
      ) : (
        <Ionicons name="camera-outline" size={24} color={Colors.textLight} />
      )}
      <Text style={styles.imageLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.secondary,
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: Colors.white, fontSize: 18, fontWeight: '700' },
  headerSpacer: { width: 36, height: 36 },
  empty: { textAlign: 'center', color: Colors.textLight, fontSize: 13, marginTop: 40 },
  body: { flex: 1 },
  bodyContent: { padding: 20, paddingBottom: 40 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.sm,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: Colors.primary, fontSize: 13, fontWeight: '600', flex: 1 },
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
  imageLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textLight,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textDark, marginBottom: 6 },
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
