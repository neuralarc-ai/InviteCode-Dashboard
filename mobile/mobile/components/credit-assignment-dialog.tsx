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
import { creditsApi } from '@/services/api-client';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type UserProfile = {
  readonly id: string;
  readonly userId: string;
  readonly fullName: string;
  readonly preferredName: string | null;
  readonly email: string;
};

interface CreditAssignmentDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly user: UserProfile | null;
  readonly onSuccess?: () => void;
}

// Default email content for credits added (matching web version)
const defaultCreditsEmailContent = `Credits Added to Your Account

Greetings from Helium,

We're excited to inform you that credits have been added to your Helium account. These credits are now available for you to use across all platform features.

You can check your credit balance in your account dashboard at any time. If you have any questions about your credits or how to use them, please feel free to reach out to our support team.

Thank you for being a valued member of the Helium community.

Thanks,
The Helium Team`;

export function CreditAssignmentDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: CreditAssignmentDialogProps): ReactElement {
  const theme = useColorScheme();
  const colors = Colors[theme];
  const [creditsInput, setCreditsInput] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendEmailNotification, setSendEmailNotification] = useState(false);
  const [emailContent, setEmailContent] = useState(defaultCreditsEmailContent);
  const [emailViewMode, setEmailViewMode] = useState<'edit' | 'preview'>('edit');

  // Conversion rate: $1 = 100 credits
  const CREDITS_PER_DOLLAR = 100;

  // Calculate dollars from credits
  const credits = creditsInput ? parseFloat(creditsInput) : 0;
  const dollars = credits > 0 ? credits / CREDITS_PER_DOLLAR : 0;

  // Reset form when dialog opens/closes or user changes
  useEffect(() => {
    if (open) {
      setCreditsInput('');
      setNotes('');
      setError(null);
      setSendEmailNotification(false);
      setEmailContent(defaultCreditsEmailContent);
      setEmailViewMode('edit');
    }
  }, [open, user]);

  const handleSubmit = useCallback(async () => {
    if (!user) {
      setError('No user selected');
      return;
    }

    const creditsValue = parseFloat(creditsInput);
    if (isNaN(creditsValue) || creditsValue < 1) {
      setError('Please enter a valid number of credits (minimum 1)');
      return;
    }

    // Convert credits to dollars for API (API expects dollars)
    const dollarsToAdd = creditsValue / CREDITS_PER_DOLLAR;

    setIsSubmitting(true);
    setError(null);

    try {
      await creditsApi.assign(
        user.userId,
        dollarsToAdd,
        notes.trim() || undefined
      );

        onOpenChange(false);
        onSuccess?.();
        // Reset form
        setCreditsInput('');
        setNotes('');
    } catch (err) {
      console.error('Error assigning credits:', err);
      let errorMessage = 'An unexpected error occurred while assigning credits';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [user, creditsInput, notes, onOpenChange, onSuccess]);

  const handleCancel = useCallback(() => {
    if (!isSubmitting) {
      onOpenChange(false);
      setError(null);
    }
  }, [isSubmitting, onOpenChange]);

  if (!open) {
    return <></>;
  }

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.overlayPressable} onPress={handleCancel} />
        <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <RemixIcon name="bank-card-line" size={20} color={colors.textPrimary} />
                <ThemedText type="title" style={styles.title} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                  Assign Credits
                </ThemedText>
              </View>
              <Pressable onPress={handleCancel} style={styles.closeButton} disabled={isSubmitting}>
                <RemixIcon name="close-line" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Description */}
            <ThemedText type="default" style={styles.description} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
              Add credits to {user?.fullName}'s account. This will increase their current balance.
            </ThemedText>

            {/* User Info */}
            <View style={styles.section}>
              <ThemedText type="defaultSemiBold" style={styles.label} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                User
              </ThemedText>
              <View style={[styles.userInfoBox, { backgroundColor: colors.badgeBackground }]}>
                <ThemedText type="defaultSemiBold" style={styles.userName} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                  {user?.fullName}
                </ThemedText>
                <ThemedText type="default" style={styles.userEmail} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                  {user?.email}
                </ThemedText>
                {user?.preferredName && user.preferredName !== user.fullName && (
                  <ThemedText type="default" style={styles.userPreferredName} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                    ({user.preferredName})
                  </ThemedText>
                )}
              </View>
            </View>

            {/* Credits Input */}
            <View style={styles.section}>
              <ThemedText type="defaultSemiBold" style={styles.label} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                Credits <ThemedText style={styles.required} lightColor={colors.buttonDanger} darkColor={colors.buttonDanger}>*</ThemedText>
              </ThemedText>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.inputWithSpinner,
                    { borderColor: colors.inputBorder, color: colors.textPrimary },
                    isSubmitting && { backgroundColor: colors.badgeBackground },
                    isSubmitting && styles.inputDisabled,
                  ]}
                  placeholder="Enter number of credits"
                  placeholderTextColor={colors.textSecondary}
                  value={creditsInput}
                  onChangeText={setCreditsInput}
                  keyboardType="numeric"
                  editable={!isSubmitting}
                  autoFocus={false}
                />
                <View style={styles.spinnerContainer}>
                  <Pressable
                    onPress={() => {
                      if (!isSubmitting) {
                        // If empty, start from 1; otherwise increment
                        if (!creditsInput || isNaN(parseFloat(creditsInput))) {
                          setCreditsInput('1');
                        } else {
                          const current = parseFloat(creditsInput);
                          setCreditsInput(String(current + 1));
                        }
                      }
                    }}
                    disabled={isSubmitting}
                    style={styles.spinnerButton}>
                    <RemixIcon name="arrow-up-s-line" size={16} color={colors.textSecondary} />
                  </Pressable>
                  <View style={[styles.spinnerDivider, { backgroundColor: colors.divider }]} />
                  <Pressable
                    onPress={() => {
                      if (!isSubmitting) {
                        // If empty, start from 1; otherwise decrement (min 1)
                        if (!creditsInput || isNaN(parseFloat(creditsInput))) {
                          setCreditsInput('1');
                        } else {
                          const current = parseFloat(creditsInput);
                          if (current > 1) {
                            setCreditsInput(String(current - 1));
                          }
                        }
                      }
                    }}
                    disabled={isSubmitting || (!creditsInput || parseFloat(creditsInput) <= 1)}
                    style={[
                      styles.spinnerButton,
                      (!creditsInput || (creditsInput && parseFloat(creditsInput) <= 1)) && styles.spinnerButtonDisabled,
                    ]}>
                    <RemixIcon 
                      name="arrow-down-s-line" 
                      size={16} 
                      color={(!creditsInput || (creditsInput && parseFloat(creditsInput) <= 1)) ? colors.textSecondary + '40' : colors.textSecondary} 
                    />
                  </Pressable>
                </View>
              </View>
              <ThemedText type="default" style={styles.helperText} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                Enter the number of credits to add to this user's credit balance.
              </ThemedText>

              {/* Dollar Conversion Display */}
              {creditsInput && !isNaN(credits) && credits > 0 && (
                <View style={[styles.conversionBox, { backgroundColor: colors.badgeBackground, borderColor: colors.divider }]}>
                  <View style={styles.conversionRow}>
                    <ThemedText type="defaultSemiBold" style={styles.conversionLabel} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                      Amount:
                    </ThemedText>
                    <ThemedText type="title" style={styles.conversionAmount} lightColor={colors.buttonPrimary} darkColor={colors.buttonPrimary}>
                      ${dollars.toFixed(2)}
                    </ThemedText>
                  </View>
                  <ThemedText type="default" style={styles.conversionFormula} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                    {credits.toLocaleString('en-US', { maximumFractionDigits: 0 })} credits ÷ 100 = ${dollars.toFixed(2)}
                  </ThemedText>
                </View>
              )}
            </View>

            {/* Notes Input */}
            <View style={styles.section}>
              <ThemedText type="defaultSemiBold" style={styles.label} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                Notes (Optional)
              </ThemedText>
              <TextInput
                style={[
                  styles.textarea,
                  { borderColor: colors.inputBorder, color: colors.textPrimary },
                  isSubmitting && { backgroundColor: colors.badgeBackground },
                  isSubmitting && styles.inputDisabled,
                ]}
                placeholder="Add a note about this credit assignment..."
                placeholderTextColor={colors.textSecondary}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={!isSubmitting}
              />
              <ThemedText type="default" style={styles.helperText} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                Optional note to track the reason for this credit assignment.
              </ThemedText>
            </View>

            {/* Email Notification Section */}
            <View style={styles.section}>
              <Pressable
                onPress={() => !isSubmitting && setSendEmailNotification(!sendEmailNotification)}
                disabled={isSubmitting}
                style={[styles.checkboxBox, { backgroundColor: colors.badgeBackground }]}>
                <View style={styles.checkbox}>
                  {sendEmailNotification ? (
                    <RemixIcon name="checkbox-fill" size={20} color={colors.buttonPrimary} />
                  ) : (
                    <RemixIcon name="checkbox-blank-line" size={20} color={colors.buttonPrimary} />
                  )}
                </View>
                <View style={styles.checkboxLabelContainer}>
                  <ThemedText type="defaultSemiBold" style={styles.checkboxLabel} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                    Send custom email notification
                  </ThemedText>
                  <ThemedText type="default" style={styles.checkboxDescription} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                    Send a custom email with Credits.png image to notify the user about the credit assignment.
                  </ThemedText>
                </View>
              </Pressable>

              {/* Email Customization Section - Only shown when checkbox is checked */}
              {sendEmailNotification && (
                <View style={[styles.emailCustomizationSection, { borderColor: colors.divider }]}>
                  <ThemedText type="defaultSemiBold" style={styles.sectionTitle} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                    Customize Email Template
                  </ThemedText>

                  {/* Edit/Preview Toggle Buttons */}
                  <View style={styles.emailViewToggle}>
                    <Pressable
                      onPress={() => setEmailViewMode('edit')}
                      disabled={isSubmitting}
                      style={[
                        styles.emailViewButton,
                        { 
                          backgroundColor: emailViewMode === 'edit' ? colors.buttonPrimary : colors.buttonSecondary,
                          borderColor: colors.inputBorder,
                        },
                        isSubmitting && styles.buttonDisabled,
                      ]}>
                      <ThemedText 
                        type="defaultSemiBold" 
                        style={styles.emailViewButtonText} 
                        lightColor={emailViewMode === 'edit' ? colors.iconAccentLight : colors.textPrimary} 
                        darkColor={emailViewMode === 'edit' ? colors.iconAccentLight : colors.textPrimary}>
                        Edit Text
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={() => setEmailViewMode('preview')}
                      disabled={isSubmitting}
                      style={[
                        styles.emailViewButton,
                        { 
                          backgroundColor: emailViewMode === 'preview' ? colors.buttonPrimary : colors.buttonSecondary,
                          borderColor: colors.inputBorder,
                        },
                        isSubmitting && styles.buttonDisabled,
                      ]}>
                      <ThemedText 
                        type="defaultSemiBold" 
                        style={styles.emailViewButtonText} 
                        lightColor={emailViewMode === 'preview' ? colors.iconAccentLight : colors.textPrimary} 
                        darkColor={emailViewMode === 'preview' ? colors.iconAccentLight : colors.textPrimary}>
                        Preview
                      </ThemedText>
                    </Pressable>
                  </View>

                  {/* Email Content */}
                  <View style={styles.emailContentSection}>
                    <ThemedText type="defaultSemiBold" style={styles.label} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                      Email Content
                    </ThemedText>
                    {emailViewMode === 'edit' ? (
                      <TextInput
                        style={[
                          styles.emailTextarea,
                          { borderColor: colors.inputBorder, color: colors.textPrimary },
                          isSubmitting && { backgroundColor: colors.badgeBackground },
                          isSubmitting && styles.inputDisabled,
                        ]}
                        placeholder="Enter email content..."
                        placeholderTextColor={colors.textSecondary}
                        value={emailContent}
                        onChangeText={setEmailContent}
                        multiline
                        numberOfLines={12}
                        textAlignVertical="top"
                        editable={!isSubmitting}
                      />
                    ) : (
                      <View style={[styles.emailPreviewBox, { backgroundColor: colors.badgeBackground, borderColor: colors.inputBorder }]}>
                        <ScrollView style={styles.emailPreviewScroll}>
                          <ThemedText type="default" style={styles.emailPreviewText} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                            {emailContent || '(No content)'}
                          </ThemedText>
                        </ScrollView>
                      </View>
                    )}
                    <ThemedText type="default" style={styles.helperText} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                      Edit the email text content that will be sent to the user.
                    </ThemedText>
                  </View>
                </View>
              )}
            </View>

            {/* Error Message */}
            {error && (
              <View style={[styles.errorContainer, { borderColor: colors.buttonDanger }]}>
                <RemixIcon name="error-warning-line" size={16} color={colors.buttonDanger} />
                <ThemedText type="default" style={styles.errorText} lightColor={colors.buttonDanger} darkColor={colors.buttonDanger}>
                  {error}
                </ThemedText>
              </View>
            )}

            {/* Footer Buttons */}
            <View style={[styles.footer, { borderTopColor: colors.divider }]}>
              <Pressable
                onPress={handleCancel}
                disabled={isSubmitting}
                style={[
                  styles.button,
                  styles.cancelButton,
                  { backgroundColor: colors.cardBackground, borderColor: colors.inputBorder },
                  isSubmitting && styles.buttonDisabled,
                ]}>
                <ThemedText type="defaultSemiBold" style={styles.cancelButtonText} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                  Cancel
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={handleSubmit}
                disabled={isSubmitting || !creditsInput || isNaN(parseFloat(creditsInput)) || parseFloat(creditsInput) < 1}
                style={[
                  styles.button,
                  styles.submitButton,
                  { backgroundColor: colors.buttonPrimary },
                  (isSubmitting || !creditsInput || isNaN(parseFloat(creditsInput)) || parseFloat(creditsInput) < 1) && styles.buttonDisabled,
                ]}>
                {isSubmitting ? (
                  <>
                    <ActivityIndicator size="small" color={colors.iconAccentLight} />
                    <ThemedText type="defaultSemiBold" style={styles.submitButtonText} lightColor={colors.iconAccentLight} darkColor={colors.iconAccentLight}>
                      Assigning...
                    </ThemedText>
                  </>
                ) : (
                  <>
                    <RemixIcon name="bank-card-line" size={16} color={colors.iconAccentLight} />
                    <ThemedText type="defaultSemiBold" style={styles.submitButtonText} lightColor={colors.iconAccentLight} darkColor={colors.iconAccentLight}>
                      Assign Credits
                    </ThemedText>
                  </>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayPressable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    borderRadius: 16,
    width: '90%',
    maxWidth: 425,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
    // Background color applied inline
  },
  scrollContent: {
    padding: 24,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
  },
  closeButton: {
    padding: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  section: {
    gap: 8,
  },
  label: {
    fontSize: 14,
  },
  required: {
    // Color applied inline
  },
  userInfoBox: {
    borderRadius: 8,
    padding: 12,
    gap: 4,
    // Background color applied inline
  },
  userName: {
    fontSize: 16,
  },
  userEmail: {
    fontSize: 14,
  },
  userPreferredName: {
    fontSize: 14,
  },
  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    // Border and text colors applied inline
  },
  inputWithSpinner: {
    flex: 1,
    paddingRight: 40,
  },
  spinnerContainer: {
    position: 'absolute',
    right: 1,
    top: 1,
    bottom: 1,
    width: 32,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderTopRightRadius: 7,
    borderBottomRightRadius: 7,
    borderLeftWidth: 1,
    borderLeftColor: '#E4D5CA',
  },
  spinnerButton: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  spinnerButtonDisabled: {
    opacity: 0.5,
  },
  spinnerDivider: {
    width: '100%',
    height: 1,
  },
  textarea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 80,
    maxHeight: 120,
    // Border and text colors applied inline
  },
  inputDisabled: {
    opacity: 0.6,
    // Background color applied inline
  },
  helperText: {
    fontSize: 12,
    lineHeight: 16,
  },
  conversionBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    gap: 4,
    // Background and border colors applied inline - matches web bg-muted/50
  },
  conversionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conversionLabel: {
    fontSize: 14,
  },
  conversionAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  conversionFormula: {
    fontSize: 12,
    marginTop: 4,
    // Color matches web text-muted-foreground
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    // Border color applied inline
  },
  errorText: {
    fontSize: 14,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    // Border color applied inline
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
  },
  cancelButton: {
    borderWidth: 1,
    // Background and border colors applied inline
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
  checkboxBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 8,
    // Background color applied inline
  },
  checkbox: {
    marginTop: 2,
  },
  checkboxLabelContainer: {
    flex: 1,
    gap: 6,
  },
  checkboxLabel: {
    fontSize: 14,
    lineHeight: 20,
  },
  checkboxDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  emailCustomizationSection: {
    marginTop: 16,
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
    gap: 16,
    // Border color applied inline
  },
  sectionTitle: {
    fontSize: 16,
  },
  emailViewToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  emailViewButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // Background and border colors applied inline
  },
  emailViewButtonText: {
    fontSize: 14,
    // Color applied inline
  },
  emailContentSection: {
    gap: 8,
  },
  emailTextarea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 200,
    maxHeight: 300,
    fontFamily: 'monospace',
    // Border and text colors applied inline
  },
  emailPreviewBox: {
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 200,
    maxHeight: 300,
    // Border and background colors applied inline
  },
  emailPreviewScroll: {
    padding: 12,
  },
  emailPreviewText: {
    fontSize: 14,
    fontFamily: 'monospace',
    lineHeight: 20,
  },
});

