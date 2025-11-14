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
import { getAppConfig } from '@/utils/config';

const palette = {
  background: '#F5ECE4',
  cardBackground: '#FFFFFF',
  primaryText: '#1F1F1F',
  secondaryText: '#5C5C5C',
  buttonPrimary: '#C3473D',
  buttonSecondary: '#E4D5CA',
  inputBackground: '#FFFFFF',
  inputBorder: '#E4D5CA',
  error: '#DC2626',
  divider: '#E4D5CA',
  weakPassword: '#DC2626',
  mediumPassword: '#F59E0B',
  strongPassword: '#22C55E',
} as const;

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
      return { strength: 'weak', color: palette.secondaryText };
    }
    if (passwordValue.length < 6) {
      return { strength: 'weak', color: palette.weakPassword };
    }
    if (passwordValue.length < 10) {
      return { strength: 'medium', color: palette.mediumPassword };
    }
    return { strength: 'strong', color: palette.strongPassword };
  }, []);

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

      const { apiBaseUrl } = getAppConfig();
      const response = await fetch(`${apiBaseUrl}/api/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password,
          fullName: fullName.trim(),
          preferredName: preferredName.trim() || fullName.trim(),
          workDescription: workDescription.trim(),
          personalReferences: personalReferences.trim() || null,
          avatarUrl: avatarUrl.trim() || null,
          referralSource: referralSource.trim() || null,
          consentGiven: consentGiven || null,
          consentDate: consentGiven && consentDate ? consentDate : null,
          planType: planType as 'seed' | 'edge' | 'quantum',
          accountType: accountType as 'individual' | 'business',
          metadata: parsedMetadata,
          emailConfirm: true,
        }),
      });

      const result = await response.json();

      if (result.success) {
        onOpenChange(false);
        onSuccess?.();
      } else {
        let errorMessage = result.message || 'Failed to create user';
        if (response.status === 409) {
          errorMessage = 'A user with this email address already exists';
        } else if (response.status === 400) {
          errorMessage = result.message || 'Invalid input data';
        }
        setErrors({ email: errorMessage });
      }
    } catch (err) {
      console.error('Error creating user:', err);
      setErrors({ email: 'An unexpected error occurred while creating the user' });
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
        <View style={styles.dialog}>
          <View style={styles.dialogHeader}>
            <View style={styles.dialogHeaderLeft}>
              <RemixIcon name="user-add-line" size={24} color={palette.buttonPrimary} />
              <View style={styles.dialogTitleContainer}>
                <ThemedText type="title" style={styles.dialogTitle}>
                  Create New User
                </ThemedText>
                <ThemedText type="default" style={styles.dialogDescription}>
                  Create a new user in Supabase Auth with a complete profile. All required fields must be filled.
                </ThemedText>
              </View>
            </View>
            <Pressable onPress={handleCancel} style={styles.closeButton}>
              <RemixIcon name="close-line" size={24} color={palette.primaryText} />
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
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                  Authentication
                </ThemedText>

                <View style={styles.inputGroup}>
                  <ThemedText type="defaultSemiBold" style={styles.label}>
                    Email <ThemedText style={styles.required}>*</ThemedText>
                  </ThemedText>
                  <TextInput
                    style={[styles.input, errors.email && styles.inputError]}
                    value={email}
                    onChangeText={(value) => {
                      setEmail(value);
                      if (errors.email) {
                        setErrors({ ...errors, email: undefined });
                      }
                    }}
                    placeholder="user@example.com"
                    placeholderTextColor={palette.secondaryText}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSubmitting}
                  />
                  {errors.email && (
                    <View style={styles.errorContainer}>
                      <RemixIcon name="error-warning-line" size={12} color={palette.error} />
                      <ThemedText style={styles.errorText}>{errors.email}</ThemedText>
                    </View>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="defaultSemiBold" style={styles.label}>
                    Password <ThemedText style={styles.required}>*</ThemedText>
                  </ThemedText>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[styles.passwordInput, errors.password && styles.inputError]}
                      value={password}
                      onChangeText={(value) => {
                        setPassword(value);
                        if (errors.password) {
                          setErrors({ ...errors, password: undefined });
                        }
                      }}
                      placeholder="Enter password (min 6 characters)"
                      placeholderTextColor={palette.secondaryText}
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
                        color={palette.secondaryText}
                      />
                    </Pressable>
                  </View>
                  {errors.password && (
                    <View style={styles.errorContainer}>
                      <RemixIcon name="error-warning-line" size={12} color={palette.error} />
                      <ThemedText style={styles.errorText}>{errors.password}</ThemedText>
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
                    <ThemedText type="default" style={styles.passwordHint}>
                      Password must be at least 6 characters long
                    </ThemedText>
                  )}
                </View>
              </View>

              {/* Profile Information Section */}
              <View style={styles.section}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                  Profile Information
                </ThemedText>

                <View style={styles.inputGroup}>
                  <ThemedText type="defaultSemiBold" style={styles.label}>
                    Full Name <ThemedText style={styles.required}>*</ThemedText>
                  </ThemedText>
                  <TextInput
                    style={[styles.input, errors.fullName && styles.inputError]}
                    value={fullName}
                    onChangeText={(value) => {
                      setFullName(value);
                      if (errors.fullName) {
                        setErrors({ ...errors, fullName: undefined });
                      }
                    }}
                    placeholder="John Doe"
                    placeholderTextColor={palette.secondaryText}
                    editable={!isSubmitting}
                  />
                  {errors.fullName && (
                    <View style={styles.errorContainer}>
                      <RemixIcon name="error-warning-line" size={12} color={palette.error} />
                      <ThemedText style={styles.errorText}>{errors.fullName}</ThemedText>
                    </View>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="defaultSemiBold" style={styles.label}>
                    Preferred Name (Optional)
                  </ThemedText>
                  <TextInput
                    style={styles.input}
                    value={preferredName}
                    onChangeText={setPreferredName}
                    placeholder="John (defaults to full name if not provided)"
                    placeholderTextColor={palette.secondaryText}
                    editable={!isSubmitting}
                  />
                  <ThemedText type="default" style={styles.hintText}>
                    If not provided, the full name will be used as the preferred name.
                  </ThemedText>
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="defaultSemiBold" style={styles.label}>
                    Work Description <ThemedText style={styles.required}>*</ThemedText>
                  </ThemedText>
                  <TextInput
                    style={[styles.textArea, errors.workDescription && styles.inputError]}
                    value={workDescription}
                    onChangeText={(value) => {
                      setWorkDescription(value);
                      if (errors.workDescription) {
                        setErrors({ ...errors, workDescription: undefined });
                      }
                    }}
                    placeholder="Describe the user's work or role..."
                    placeholderTextColor={palette.secondaryText}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    editable={!isSubmitting}
                  />
                  {errors.workDescription && (
                    <View style={styles.errorContainer}>
                      <RemixIcon name="error-warning-line" size={12} color={palette.error} />
                      <ThemedText style={styles.errorText}>{errors.workDescription}</ThemedText>
                    </View>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="defaultSemiBold" style={styles.label}>
                    Personal References (Optional)
                  </ThemedText>
                  <TextInput
                    style={styles.textArea}
                    value={personalReferences}
                    onChangeText={setPersonalReferences}
                    placeholder="Any personal references or notes..."
                    placeholderTextColor={palette.secondaryText}
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                    editable={!isSubmitting}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="defaultSemiBold" style={styles.label}>
                    Avatar URL (Optional)
                  </ThemedText>
                  <TextInput
                    style={styles.input}
                    value={avatarUrl}
                    onChangeText={setAvatarUrl}
                    placeholder="https://example.com/avatar.jpg"
                    placeholderTextColor={palette.secondaryText}
                    keyboardType="url"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSubmitting}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="defaultSemiBold" style={styles.label}>
                    Referral Source (Optional)
                  </ThemedText>
                  <TextInput
                    style={styles.input}
                    value={referralSource}
                    onChangeText={setReferralSource}
                    placeholder="How did this user find us?"
                    placeholderTextColor={palette.secondaryText}
                    editable={!isSubmitting}
                  />
                </View>
              </View>

              {/* Account Settings Section */}
              <View style={styles.section}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                  Account Settings
                </ThemedText>

                <View style={styles.inputGroup}>
                  <ThemedText type="defaultSemiBold" style={styles.label}>
                    Plan Type <ThemedText style={styles.required}>*</ThemedText>
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
                          planType === plan && styles.radioOptionSelected,
                        ]}
                        disabled={isSubmitting}>
                        <View style={styles.radio}>
                          {planType === plan && <View style={styles.radioSelected} />}
                        </View>
                        <ThemedText
                          type="default"
                          style={[
                            styles.radioLabel,
                            planType === plan && styles.radioLabelSelected,
                          ]}>
                          {plan.charAt(0).toUpperCase() + plan.slice(1)}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                  {errors.planType && (
                    <View style={styles.errorContainer}>
                      <RemixIcon name="error-warning-line" size={12} color={palette.error} />
                      <ThemedText style={styles.errorText}>{errors.planType}</ThemedText>
                    </View>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="defaultSemiBold" style={styles.label}>
                    Account Type <ThemedText style={styles.required}>*</ThemedText>
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
                          accountType === type && styles.radioOptionSelected,
                        ]}
                        disabled={isSubmitting}>
                        <View style={styles.radio}>
                          {accountType === type && <View style={styles.radioSelected} />}
                        </View>
                        <ThemedText
                          type="default"
                          style={[
                            styles.radioLabel,
                            accountType === type && styles.radioLabelSelected,
                          ]}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                  {errors.accountType && (
                    <View style={styles.errorContainer}>
                      <RemixIcon name="error-warning-line" size={12} color={palette.error} />
                      <ThemedText style={styles.errorText}>{errors.accountType}</ThemedText>
                    </View>
                  )}
                </View>
              </View>

              {/* Consent Section */}
              <View style={styles.section}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
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
                      <RemixIcon name="checkbox-fill" size={20} color={palette.buttonPrimary} />
                    ) : (
                      <RemixIcon name="checkbox-blank-line" size={20} color={palette.secondaryText} />
                    )}
                  </Pressable>
                  <ThemedText type="default" style={styles.checkboxLabel}>
                    Consent Given (Optional)
                  </ThemedText>
                </View>

                {consentGiven && (
                  <View style={styles.inputGroup}>
                    <ThemedText type="defaultSemiBold" style={styles.label}>
                      Consent Date <ThemedText style={styles.required}>*</ThemedText>
                    </ThemedText>
                    <TextInput
                      style={[styles.input, errors.consentDate && styles.inputError]}
                      value={consentDate}
                      onChangeText={(value) => {
                        setConsentDate(value);
                        if (errors.consentDate) {
                          setErrors({ ...errors, consentDate: undefined });
                        }
                      }}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={palette.secondaryText}
                      editable={!isSubmitting}
                    />
                    {errors.consentDate && (
                      <View style={styles.errorContainer}>
                        <RemixIcon name="error-warning-line" size={12} color={palette.error} />
                        <ThemedText style={styles.errorText}>{errors.consentDate}</ThemedText>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* Additional Information Section */}
              <View style={styles.section}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                  Additional Information
                </ThemedText>

                <View style={styles.inputGroup}>
                  <ThemedText type="defaultSemiBold" style={styles.label}>
                    Metadata (Optional - JSON format)
                  </ThemedText>
                  <TextInput
                    style={[styles.textArea, errors.metadata && styles.inputError]}
                    value={metadata}
                    onChangeText={(value) => {
                      setMetadata(value);
                      if (errors.metadata) {
                        setErrors({ ...errors, metadata: undefined });
                      }
                    }}
                    placeholder='{"key": "value"}'
                    placeholderTextColor={palette.secondaryText}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSubmitting}
                  />
                  {errors.metadata && (
                    <View style={styles.errorContainer}>
                      <RemixIcon name="error-warning-line" size={12} color={palette.error} />
                      <ThemedText style={styles.errorText}>{errors.metadata}</ThemedText>
                    </View>
                  )}
                  <ThemedText type="default" style={styles.hintText}>
                    Enter metadata as valid JSON. Leave empty for default empty object.
                  </ThemedText>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.dialogFooter}>
            <Pressable
              onPress={handleCancel}
              disabled={isSubmitting}
              style={[styles.button, styles.cancelButton]}>
              <ThemedText type="defaultSemiBold" style={styles.cancelButtonText}>
                Cancel
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={[styles.button, styles.submitButton, isSubmitting && styles.buttonDisabled]}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <RemixIcon name="user-add-line" size={16} color="#FFFFFF" />
                  <ThemedText type="defaultSemiBold" style={styles.submitButtonText}>
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
    backgroundColor: palette.cardBackground,
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    height: '90%',
    maxHeight: '90%',
    overflow: 'hidden',
    flexDirection: 'column',
  },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: palette.divider,
    gap: 12,
    flexShrink: 0,
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
    color: palette.primaryText,
    fontSize: 20,
  },
  dialogDescription: {
    color: palette.secondaryText,
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
    color: palette.primaryText,
    fontSize: 14,
    marginBottom: 4,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: palette.primaryText,
    fontSize: 14,
  },
  required: {
    color: palette.error,
  },
  input: {
    backgroundColor: palette.inputBackground,
    borderWidth: 1,
    borderColor: palette.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: palette.primaryText,
  },
  inputError: {
    borderColor: palette.error,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.inputBackground,
    borderWidth: 1,
    borderColor: palette.inputBorder,
    borderRadius: 8,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: palette.primaryText,
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
    color: palette.secondaryText,
    fontSize: 12,
    marginTop: 4,
  },
  textArea: {
    backgroundColor: palette.inputBackground,
    borderWidth: 1,
    borderColor: palette.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: palette.primaryText,
    minHeight: 80,
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
    borderColor: palette.inputBorder,
    backgroundColor: palette.inputBackground,
  },
  radioOptionSelected: {
    borderColor: palette.buttonPrimary,
    backgroundColor: '#FFF5F3',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: palette.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.buttonPrimary,
  },
  radioLabel: {
    color: palette.secondaryText,
    fontSize: 14,
  },
  radioLabelSelected: {
    color: palette.buttonPrimary,
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
    color: palette.primaryText,
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
    color: palette.error,
    fontSize: 12,
  },
  hintText: {
    color: palette.secondaryText,
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
    borderTopColor: palette.divider,
    flexShrink: 0,
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
    backgroundColor: palette.buttonSecondary,
  },
  cancelButtonText: {
    color: palette.primaryText,
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: palette.buttonPrimary,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
