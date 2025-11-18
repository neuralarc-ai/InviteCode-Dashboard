import { useCallback, useEffect, useState, type ReactElement } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import RemixIcon from 'react-native-remix-icon';
import { ThemedText } from '@/components/themed-text';
import { usersApi } from '@/services/api-client';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface FormErrors {
  email?: string;
  password?: string;
  fullName?: string;
  workDescription?: string;
  planType?: string;
  accountType?: string;
  consentDate?: string;
  metadata?: string;
}

export function CreateUserDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateUserDialogProps): ReactElement {
  const theme = useColorScheme();
  const colors = Colors[theme];
  // Required fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [workDescription, setWorkDescription] = useState('');
  const [planType, setPlanType] = useState<'seed' | 'edge' | 'quantum' | ''>('');
  const [accountType, setAccountType] = useState<'individual' | 'business' | ''>('');

  // Optional fields
  const [preferredName, setPreferredName] = useState('');
  const [personalReferences, setPersonalReferences] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [referralSource, setReferralSource] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [consentDate, setConsentDate] = useState('');
  const [metadata, setMetadata] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (open) {
      setEmail('');
      setPassword('');
      setFullName('');
      setWorkDescription('');
      setPlanType('');
      setAccountType('');
      setPreferredName('');
      setPersonalReferences('');
      setAvatarUrl('');
      setReferralSource('');
      setConsentGiven(false);
      setConsentDate('');
      setMetadata('');
      setErrors({});
      setShowPassword(false);
    }
  }, [open]);

  const validateEmail = useCallback((emailValue: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailValue);
  }, []);

  const validatePassword = useCallback((passwordValue: string): { valid: boolean; message?: string } => {
    if (passwordValue.length < 6) {
      return { valid: false, message: 'Password must be at least 6 characters long' };
    }
    return { valid: true };
  }, []);

  const validateMetadata = useCallback((metadataValue: string): { valid: boolean; message?: string } => {
    if (!metadataValue.trim()) {
      return { valid: true }; // Optional field
    }
    try {
      JSON.parse(metadataValue);
      return { valid: true };
    } catch {
      return { valid: false, message: 'Metadata must be valid JSON' };
    }
  }, []);

  const getPasswordStrength = useCallback((passwordValue: string): { strength: 'weak' | 'medium' | 'strong'; color: string } => {
    if (passwordValue.length === 0) {
      return { strength: 'weak', color: colors.textSecondary };
    }
    if (passwordValue.length < 6) {
      return { strength: 'weak', color: colors.weakPassword };
    }
    if (passwordValue.length < 10) {
      return { strength: 'medium', color: colors.mediumPassword };
    }
    return { strength: 'strong', color: colors.strongPassword };
  }, [colors.textSecondary, colors.weakPassword, colors.mediumPassword, colors.strongPassword]);

  const passwordStrength = getPasswordStrength(password);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Email validation
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Invalid email format';
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
    } else {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        newErrors.password = passwordValidation.message;
      }
    }

    // Full name validation
    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    // Work description validation
    if (!workDescription.trim()) {
      newErrors.workDescription = 'Work description is required';
    }

    // Plan type validation
    if (!planType) {
      newErrors.planType = 'Plan type is required';
    } else if (!['seed', 'edge', 'quantum'].includes(planType)) {
      newErrors.planType = 'Invalid plan type';
    }

    // Account type validation
    if (!accountType) {
      newErrors.accountType = 'Account type is required';
    } else if (!['individual', 'business'].includes(accountType)) {
      newErrors.accountType = 'Invalid account type';
    }

    // Consent date validation (required if consent is given)
    if (consentGiven && !consentDate) {
      newErrors.consentDate = 'Consent date is required when consent is given';
    }

    // Metadata validation
    if (metadata.trim()) {
      const metadataValidation = validateMetadata(metadata);
      if (!metadataValidation.valid) {
        newErrors.metadata = metadataValidation.message;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [email, password, fullName, workDescription, planType, accountType, consentGiven, consentDate, metadata, validateEmail, validatePassword, validateMetadata]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Parse metadata if provided
      let parsedMetadata: Record<string, any> | null = null;
      if (metadata.trim()) {
        try {
          parsedMetadata = JSON.parse(metadata);
        } catch {
          parsedMetadata = {};
        }
      }

      await usersApi.create({
          email: email.trim().toLowerCase(),
          password: password,
        full_name: fullName.trim(),
        preferred_name: preferredName.trim() || fullName.trim(),
        work_description: workDescription.trim(),
        metadata: parsedMetadata || undefined,
      });

      // If successful, the API returns the created user
        onOpenChange(false);
        onSuccess?.();
    } catch (err) {
      console.error('Error creating user:', err);
      let errorMessage = 'An unexpected error occurred while creating the user';
      if (err instanceof Error) {
        errorMessage = err.message;
        // Handle specific error cases
        if (errorMessage.includes('already exists') || errorMessage.includes('409')) {
          errorMessage = 'A user with this email address already exists';
        } else if (errorMessage.includes('400') || errorMessage.includes('Invalid')) {
          errorMessage = 'Invalid input data. Please check your entries.';
        }

      }
      setErrors({ email: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  }, [email, password, fullName, preferredName, workDescription, personalReferences, avatarUrl, referralSource, consentGiven, consentDate, planType, accountType, metadata, validateForm, onOpenChange, onSuccess]);

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  if (!open) {
    return <></>;
  }

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <View style={[styles.dialog, { backgroundColor: colors.cardBackground }]}>
          <View style={[styles.dialogHeader, { borderBottomColor: colors.divider }]}>
            <View style={styles.dialogHeaderLeft}>
              <RemixIcon name="user-add-line" size={24} color={colors.buttonPrimary} />
              <View style={styles.dialogTitleContainer}>
                <ThemedText type="title" style={styles.dialogTitle} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                  Create New User
                </ThemedText>
                <ThemedText type="default" style={styles.dialogDescription} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                  Create a new user in Supabase Auth with a complete profile. All required fields must be filled.
                </ThemedText>
              </View>
            </View>
            <Pressable onPress={handleCancel} style={styles.closeButton}>
              <RemixIcon name="close-line" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView 
            style={styles.dialogContent} 
            contentContainerStyle={styles.dialogContentContainer}
            showsVerticalScrollIndicator={false}
            bounces={false}>
            <View style={styles.form}>
              {/* Authentication Section */}
              <View style={styles.section}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                  Authentication
                </ThemedText>

                <View style={styles.inputGroup}>
                  <ThemedText type="defaultSemiBold" style={styles.label} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                    Email <ThemedText style={styles.required} lightColor={colors.buttonDanger} darkColor={colors.buttonDanger}>*</ThemedText>
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: colors.searchBackground, borderColor: errors.email ? colors.buttonDanger : colors.inputBorder, color: colors.textPrimary },
                      errors.email && styles.inputError,
                    ]}
                    value={email}
                    onChangeText={(value) => {
                      setEmail(value);
                      if (errors.email) {
                        setErrors({ ...errors, email: undefined });
                      }
                    }}
                    placeholder="user@example.com"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSubmitting}
                  />
                  {errors.email && (
                    <View style={styles.errorContainer}>
                      <RemixIcon name="error-warning-line" size={12} color={colors.buttonDanger} />
                      <ThemedText style={styles.errorText} lightColor={colors.buttonDanger} darkColor={colors.buttonDanger}>{errors.email}</ThemedText>
                    </View>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="defaultSemiBold" style={styles.label} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                    Password <ThemedText style={styles.required} lightColor={colors.buttonDanger} darkColor={colors.buttonDanger}>*</ThemedText>
                  </ThemedText>
                  <View style={[styles.passwordContainer, { backgroundColor: colors.searchBackground, borderColor: errors.password ? colors.buttonDanger : colors.inputBorder }]}>
                    <TextInput
                      style={[styles.passwordInput, { color: colors.textPrimary }, errors.password && styles.inputError]}
                      value={password}
                      onChangeText={(value) => {
                        setPassword(value);
                        if (errors.password) {
                          setErrors({ ...errors, password: undefined });
                        }
                      }}
                      placeholder="Enter password (min 6 characters)"
                      placeholderTextColor={colors.textSecondary}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isSubmitting}
                    />
                    <Pressable
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.passwordToggle}
                      disabled={isSubmitting}>
                      <RemixIcon
                        name={showPassword ? 'eye-off-line' : 'eye-line'}
                        size={20}
                        color={colors.textSecondary}
                      />
                    </Pressable>
                  </View>
                  {errors.password && (
                    <View style={styles.errorContainer}>
                      <RemixIcon name="error-warning-line" size={12} color={colors.buttonDanger} />
                      <ThemedText style={styles.errorText} lightColor={colors.buttonDanger} darkColor={colors.buttonDanger}>{errors.password}</ThemedText>
                    </View>
                  )}
                  {password && !errors.password && (
                    <View style={styles.passwordStrengthContainer}>
                      <View style={styles.passwordStrengthBar}>
                        <View
                          style={[
                            styles.passwordStrengthFill,
                            {
                              width: `${Math.min((password.length / 12) * 100, 100)}%`,
                              backgroundColor: passwordStrength.color,
                            },
                          ]}
                        />
                      </View>
                      <ThemedText type="default" style={[styles.passwordStrengthText, { color: passwordStrength.color }]}>
                        {passwordStrength.strength.charAt(0).toUpperCase() + passwordStrength.strength.slice(1)}
                      </ThemedText>
                    </View>
                  )}
                  {password && (
                    <ThemedText type="default" style={styles.passwordHint} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                      Password must be at least 6 characters long
                    </ThemedText>
                  )}
                </View>
              </View>

              {/* Profile Information Section */}
              <View style={styles.section}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                  Profile Information
                </ThemedText>

                <View style={styles.inputGroup}>
                  <ThemedText type="defaultSemiBold" style={styles.label} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                    Full Name <ThemedText style={styles.required} lightColor={colors.buttonDanger} darkColor={colors.buttonDanger}>*</ThemedText>
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: colors.searchBackground, borderColor: errors.fullName ? colors.buttonDanger : colors.inputBorder, color: colors.textPrimary },
                      errors.fullName && styles.inputError,
                    ]}
                    value={fullName}
                    onChangeText={(value) => {
                      setFullName(value);
                      if (errors.fullName) {
                        setErrors({ ...errors, fullName: undefined });
                      }
                    }}
                    placeholder="John Doe"
                    placeholderTextColor={colors.textSecondary}
                    editable={!isSubmitting}
                  />
                  {errors.fullName && (
                    <View style={styles.errorContainer}>
                      <RemixIcon name="error-warning-line" size={12} color={colors.buttonDanger} />
                      <ThemedText style={styles.errorText} lightColor={colors.buttonDanger} darkColor={colors.buttonDanger}>{errors.fullName}</ThemedText>
                    </View>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="defaultSemiBold" style={styles.label} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                    Preferred Name (Optional)
                  </ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.searchBackground, borderColor: colors.inputBorder, color: colors.textPrimary }]}
                    value={preferredName}
                    onChangeText={setPreferredName}
                    placeholder="John (defaults to full name if not provided)"
                    placeholderTextColor={colors.textSecondary}
                    editable={!isSubmitting}
                  />
                  <ThemedText type="default" style={styles.hintText} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                    If not provided, the full name will be used as the preferred name.
                  </ThemedText>
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="defaultSemiBold" style={styles.label} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                    Work Description <ThemedText style={styles.required} lightColor={colors.buttonDanger} darkColor={colors.buttonDanger}>*</ThemedText>
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.textArea,
                      { backgroundColor: colors.searchBackground, borderColor: errors.workDescription ? colors.buttonDanger : colors.inputBorder, color: colors.textPrimary },
                      errors.workDescription && styles.inputError,
                    ]}
                    value={workDescription}
                    onChangeText={(value) => {
                      setWorkDescription(value);
                      if (errors.workDescription) {
                        setErrors({ ...errors, workDescription: undefined });
                      }
                    }}
                    placeholder="Describe the user's work or role..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    editable={!isSubmitting}
                  />
                  {errors.workDescription && (
                    <View style={styles.errorContainer}>
                      <RemixIcon name="error-warning-line" size={12} color={colors.buttonDanger} />
                      <ThemedText style={styles.errorText} lightColor={colors.buttonDanger} darkColor={colors.buttonDanger}>{errors.workDescription}</ThemedText>
                    </View>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="defaultSemiBold" style={styles.label} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                    Personal References (Optional)
                  </ThemedText>
                  <TextInput
                    style={[styles.textArea, { backgroundColor: colors.searchBackground, borderColor: colors.inputBorder, color: colors.textPrimary }]}
                    value={personalReferences}
                    onChangeText={setPersonalReferences}
                    placeholder="Any personal references or notes..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                    editable={!isSubmitting}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="defaultSemiBold" style={styles.label} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                    Avatar URL (Optional)
                  </ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.searchBackground, borderColor: colors.inputBorder, color: colors.textPrimary }]}
                    value={avatarUrl}
                    onChangeText={setAvatarUrl}
                    placeholder="https://example.com/avatar.jpg"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="url"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSubmitting}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="defaultSemiBold" style={styles.label} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                    Referral Source (Optional)
                  </ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.searchBackground, borderColor: colors.inputBorder, color: colors.textPrimary }]}
                    value={referralSource}
                    onChangeText={setReferralSource}
                    placeholder="How did this user find us?"
                    placeholderTextColor={colors.textSecondary}
                    editable={!isSubmitting}
                  />
                </View>
              </View>

              {/* Account Settings Section */}
              <View style={styles.section}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                  Account Settings
                </ThemedText>

                <View style={styles.inputGroup}>
                  <ThemedText type="defaultSemiBold" style={styles.label} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                    Plan Type <ThemedText style={styles.required} lightColor={colors.buttonDanger} darkColor={colors.buttonDanger}>*</ThemedText>
                  </ThemedText>
                  <View style={styles.radioGroup}>
                    {(['seed', 'edge', 'quantum'] as const).map((plan) => (
                      <Pressable
                        key={plan}
                        onPress={() => {
                          if (!isSubmitting) {
                            setPlanType(plan);
                            if (errors.planType) {
                              setErrors({ ...errors, planType: undefined });
                            }
                          }
                        }}
                        style={[
                          styles.radioOption,
                          { backgroundColor: colors.searchBackground, borderColor: colors.inputBorder },
                          planType === plan && { borderColor: colors.buttonPrimary, backgroundColor: colors.badgeBackground },
                        ]}
                        disabled={isSubmitting}>
                        <View style={[styles.radio, { borderColor: colors.inputBorder }]}>
                          {planType === plan && <View style={[styles.radioSelected, { backgroundColor: colors.buttonPrimary }]} />}
                        </View>
                        <ThemedText
                          type="default"
                          style={styles.radioLabel}
                          lightColor={planType === plan ? colors.buttonPrimary : colors.textSecondary}
                          darkColor={planType === plan ? colors.buttonPrimary : colors.textSecondary}>
                          {plan.charAt(0).toUpperCase() + plan.slice(1)}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                  {errors.planType && (
                    <View style={styles.errorContainer}>
                      <RemixIcon name="error-warning-line" size={12} color={colors.buttonDanger} />
                      <ThemedText style={styles.errorText} lightColor={colors.buttonDanger} darkColor={colors.buttonDanger}>{errors.planType}</ThemedText>
                    </View>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="defaultSemiBold" style={styles.label} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                    Account Type <ThemedText style={styles.required} lightColor={colors.buttonDanger} darkColor={colors.buttonDanger}>*</ThemedText>
                  </ThemedText>
                  <View style={styles.radioGroup}>
                    {(['individual', 'business'] as const).map((type) => (
                      <Pressable
                        key={type}
                        onPress={() => {
                          if (!isSubmitting) {
                            setAccountType(type);
                            if (errors.accountType) {
                              setErrors({ ...errors, accountType: undefined });
                            }
                          }
                        }}
                        style={[
                          styles.radioOption,
                          { backgroundColor: colors.searchBackground, borderColor: colors.inputBorder },
                          accountType === type && { borderColor: colors.buttonPrimary, backgroundColor: colors.badgeBackground },
                        ]}
                        disabled={isSubmitting}>
                        <View style={[styles.radio, { borderColor: colors.inputBorder }]}>
                          {accountType === type && <View style={[styles.radioSelected, { backgroundColor: colors.buttonPrimary }]} />}
                        </View>
                        <ThemedText
                          type="default"
                          style={styles.radioLabel}
                          lightColor={accountType === type ? colors.buttonPrimary : colors.textSecondary}
                          darkColor={accountType === type ? colors.buttonPrimary : colors.textSecondary}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                  {errors.accountType && (
                    <View style={styles.errorContainer}>
                      <RemixIcon name="error-warning-line" size={12} color={colors.buttonDanger} />
                      <ThemedText style={styles.errorText} lightColor={colors.buttonDanger} darkColor={colors.buttonDanger}>{errors.accountType}</ThemedText>
                    </View>
                  )}
                </View>
              </View>

              {/* Consent Section */}
              <View style={styles.section}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                  Consent
                </ThemedText>

                <View style={styles.checkboxContainer}>
                  <Pressable
                    onPress={() => {
                      if (!isSubmitting) {
                        const newValue = !consentGiven;
                        setConsentGiven(newValue);
                        if (!newValue) {
                          setConsentDate('');
                          if (errors.consentDate) {
                            setErrors({ ...errors, consentDate: undefined });
                          }
                        }
                      }
                    }}
                    style={styles.checkbox}
                    disabled={isSubmitting}>
                    {consentGiven ? (
                      <RemixIcon name="checkbox-fill" size={20} color={colors.buttonPrimary} />
                    ) : (
                      <RemixIcon name="checkbox-blank-line" size={20} color={colors.textSecondary} />
                    )}
                  </Pressable>
                  <ThemedText type="default" style={styles.checkboxLabel} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                    Consent Given (Optional)
                  </ThemedText>
                </View>

                {consentGiven && (
                  <View style={styles.inputGroup}>
                    <ThemedText type="defaultSemiBold" style={styles.label} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                      Consent Date <ThemedText style={styles.required} lightColor={colors.buttonDanger} darkColor={colors.buttonDanger}>*</ThemedText>
                    </ThemedText>
                    <TextInput
                      style={[
                        styles.input,
                        { backgroundColor: colors.searchBackground, borderColor: errors.consentDate ? colors.buttonDanger : colors.inputBorder, color: colors.textPrimary },
                        errors.consentDate && styles.inputError,
                      ]}
                      value={consentDate}
                      onChangeText={(value) => {
                        setConsentDate(value);
                        if (errors.consentDate) {
                          setErrors({ ...errors, consentDate: undefined });
                        }
                      }}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textSecondary}
                      editable={!isSubmitting}
                    />
                    {errors.consentDate && (
                      <View style={styles.errorContainer}>
                        <RemixIcon name="error-warning-line" size={12} color={colors.buttonDanger} />
                        <ThemedText style={styles.errorText} lightColor={colors.buttonDanger} darkColor={colors.buttonDanger}>{errors.consentDate}</ThemedText>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* Additional Information Section */}
              <View style={styles.section}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                  Additional Information
                </ThemedText>

                <View style={styles.inputGroup}>
                  <ThemedText type="defaultSemiBold" style={styles.label} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                    Metadata (Optional - JSON format)
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.textArea,
                      { backgroundColor: colors.searchBackground, borderColor: errors.metadata ? colors.buttonDanger : colors.inputBorder, color: colors.textPrimary },
                      errors.metadata && styles.inputError,
                    ]}
                    value={metadata}
                    onChangeText={(value) => {
                      setMetadata(value);
                      if (errors.metadata) {
                        setErrors({ ...errors, metadata: undefined });
                      }
                    }}
                    placeholder='{"key": "value"}'
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSubmitting}
                  />
                  {errors.metadata && (
                    <View style={styles.errorContainer}>
                      <RemixIcon name="error-warning-line" size={12} color={colors.buttonDanger} />
                      <ThemedText style={styles.errorText} lightColor={colors.buttonDanger} darkColor={colors.buttonDanger}>{errors.metadata}</ThemedText>
                    </View>
                  )}
                  <ThemedText type="default" style={styles.hintText} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                    Enter metadata as valid JSON. Leave empty for default empty object.
                  </ThemedText>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={[styles.dialogFooter, { borderTopColor: colors.divider }]}>
            <Pressable
              onPress={handleCancel}
              disabled={isSubmitting}
              style={[styles.button, styles.cancelButton, { backgroundColor: colors.buttonSecondary }]}>
              <ThemedText type="defaultSemiBold" style={styles.cancelButtonText} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                Cancel
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={[styles.button, styles.submitButton, { backgroundColor: colors.buttonPrimary }, isSubmitting && styles.buttonDisabled]}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color={colors.iconAccentLight} />
              ) : (
                <>
                  <RemixIcon name="user-add-line" size={16} color={colors.iconAccentLight} />
                  <ThemedText type="defaultSemiBold" style={styles.submitButtonText} lightColor={colors.iconAccentLight} darkColor={colors.iconAccentLight}>
                    Create User
                  </ThemedText>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dialog: {
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    height: '90%',
    maxHeight: '90%',
    overflow: 'hidden',
    flexDirection: 'column',
    // Background color applied inline
  },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    gap: 12,
    flexShrink: 0,
    // Border color applied inline
  },
  dialogHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  dialogTitleContainer: {
    flex: 1,
    gap: 4,
  },
  dialogTitle: {
    fontSize: 20,
  },
  dialogDescription: {
    fontSize: 14,
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
  },
  dialogContent: {
    flex: 1,
    flexShrink: 1,
  },
  dialogContentContainer: {
    paddingBottom: 20,
  },
  form: {
    padding: 20,
    gap: 24,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
  },
  required: {
    // Color applied inline
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    // Background, border, and text colors applied inline
  },
  inputError: {
    // Border color applied inline
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    // Background and border colors applied inline
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    // Color applied inline
  },
  passwordToggle: {
    padding: 10,
  },
  passwordStrengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  passwordStrengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  passwordStrengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  passwordStrengthText: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  passwordHint: {
    fontSize: 12,
    marginTop: 4,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 80,
    // Background, border, and text colors applied inline
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    // Border and background colors applied inline
  },
  radioOptionSelected: {
    // Border and background colors applied inline
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    // Border color applied inline
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    // Background color applied inline
  },
  radioLabel: {
    fontSize: 14,
  },
  radioLabelSelected: {
    // Color applied inline
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    padding: 4,
  },
  checkboxLabel: {
    fontSize: 14,
    flex: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
  },
  hintText: {
    fontSize: 12,
    marginTop: 4,
  },
  dialogFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    flexShrink: 0,
    // Border color applied inline
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    justifyContent: 'center',
  },
  cancelButton: {
    // Background color applied inline
  },
  cancelButtonText: {
    fontSize: 14,
  },
  submitButton: {
    // Background color applied inline
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

