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
  modalBackground: 'rgba(0, 0, 0, 0.5)',
  cardBackground: '#FFFFFF',
  primaryText: '#1F1F1F',
  secondaryText: '#5C5C5C',
  mutedBackground: '#F5F5F5',
  mutedBorder: '#E4D5CA',
  buttonPrimary: '#C3473D',
  buttonSecondary: '#E4D5CA',
  inputBorder: '#D1D1D1',
  inputFocus: '#C3473D',
  errorText: '#DC2626',
  successText: '#22C55E',
} as const;

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

export function CreditAssignmentDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: CreditAssignmentDialogProps): ReactElement {
  const [creditsInput, setCreditsInput] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    }
  }, [open, user]);

  const handleSubmit = useCallback(async () => {
    if (!user) {
      setError('No user selected');
      return;
    }

    const creditsValue = parseFloat(creditsInput);
    if (isNaN(creditsValue) || creditsValue <= 0) {
      setError('Please enter a valid number of credits');
      return;
    }

    // Convert credits to dollars for API (API expects dollars)
    const dollarsToAdd = creditsValue / CREDITS_PER_DOLLAR;

    setIsSubmitting(true);
    setError(null);

    try {
      const { apiBaseUrl } = getAppConfig();
      const response = await fetch(`${apiBaseUrl}/api/credit-balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.userId,
          creditsToAdd: dollarsToAdd,
          notes: notes.trim() || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        onOpenChange(false);
        onSuccess?.();
        // Reset form
        setCreditsInput('');
        setNotes('');
      } else {
        setError(result.message || 'Failed to assign credits');
      }
    } catch (err) {
      console.error('Error assigning credits:', err);
      setError('An unexpected error occurred while assigning credits');
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
        <View style={styles.modalContent}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <RemixIcon name="bank-card-line" size={20} color={palette.primaryText} />
                <ThemedText type="title" style={styles.title}>
                  Assign Credits
                </ThemedText>
              </View>
              <Pressable onPress={handleCancel} style={styles.closeButton} disabled={isSubmitting}>
                <RemixIcon name="close-line" size={24} color={palette.secondaryText} />
              </Pressable>
            </View>

            {/* Description */}
            <ThemedText type="default" style={styles.description}>
              Add credits to {user?.fullName}'s account. This will increase their current balance.
            </ThemedText>

            {/* User Info */}
            <View style={styles.section}>
              <ThemedText type="defaultSemiBold" style={styles.label}>
                User
              </ThemedText>
              <View style={styles.userInfoBox}>
                <ThemedText type="defaultSemiBold" style={styles.userName}>
                  {user?.fullName}
                </ThemedText>
                <ThemedText type="default" style={styles.userEmail}>
                  {user?.email}
                </ThemedText>
                {user?.preferredName && user.preferredName !== user.fullName && (
                  <ThemedText type="default" style={styles.userPreferredName}>
                    ({user.preferredName})
                  </ThemedText>
                )}
              </View>
            </View>

            {/* Credits Input */}
            <View style={styles.section}>
              <ThemedText type="defaultSemiBold" style={styles.label}>
                Credits <ThemedText style={styles.required}>*</ThemedText>
              </ThemedText>
              <TextInput
                style={[styles.input, isSubmitting && styles.inputDisabled]}
                placeholder="Enter number of credits"
                placeholderTextColor={palette.secondaryText}
                value={creditsInput}
                onChangeText={setCreditsInput}
                keyboardType="numeric"
                editable={!isSubmitting}
                autoFocus={false}
              />
              <ThemedText type="default" style={styles.helperText}>
                Enter the number of credits to add to this user's credit balance.
              </ThemedText>

              {/* Dollar Conversion Display */}
              {creditsInput && !isNaN(credits) && credits > 0 && (
                <View style={styles.conversionBox}>
                  <View style={styles.conversionRow}>
                    <ThemedText type="defaultSemiBold" style={styles.conversionLabel}>
                      Amount:
                    </ThemedText>
                    <ThemedText type="title" style={styles.conversionAmount}>
                      ${dollars.toFixed(2)}
                    </ThemedText>
                  </View>
                  <ThemedText type="default" style={styles.conversionFormula}>
                    {credits.toLocaleString('en-US', { maximumFractionDigits: 0 })} credits ÷ 100 = ${dollars.toFixed(2)}
                  </ThemedText>
                </View>
              )}
            </View>

            {/* Notes Input */}
            <View style={styles.section}>
              <ThemedText type="defaultSemiBold" style={styles.label}>
                Notes (Optional)
              </ThemedText>
              <TextInput
                style={[
                  styles.textarea,
                  isSubmitting && styles.inputDisabled,
                ]}
                placeholder="Add a note about this credit assignment..."
                placeholderTextColor={palette.secondaryText}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={!isSubmitting}
              />
              <ThemedText type="default" style={styles.helperText}>
                Optional note to track the reason for this credit assignment.
              </ThemedText>
            </View>

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <RemixIcon name="error-warning-line" size={16} color={palette.errorText} />
                <ThemedText type="default" style={styles.errorText}>
                  {error}
                </ThemedText>
              </View>
            )}

            {/* Footer Buttons */}
            <View style={styles.footer}>
              <Pressable
                onPress={handleCancel}
                disabled={isSubmitting}
                style={[
                  styles.button,
                  styles.cancelButton,
                  isSubmitting && styles.buttonDisabled,
                ]}>
                <ThemedText type="defaultSemiBold" style={styles.cancelButtonText}>
                  Cancel
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={handleSubmit}
                disabled={isSubmitting || !creditsInput}
                style={[
                  styles.button,
                  styles.submitButton,
                  (isSubmitting || !creditsInput) && styles.buttonDisabled,
                ]}>
                {isSubmitting ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <ThemedText type="defaultSemiBold" style={styles.submitButtonText}>
                      Assigning...
                    </ThemedText>
                  </>
                ) : (
                  <>
                    <RemixIcon name="bank-card-line" size={16} color="#FFFFFF" />
                    <ThemedText type="defaultSemiBold" style={styles.submitButtonText}>
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
    backgroundColor: palette.modalBackground,
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
    backgroundColor: palette.cardBackground,
    borderRadius: 16,
    width: '90%',
    maxWidth: 425,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
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
    color: palette.primaryText,
    fontSize: 20,
  },
  closeButton: {
    padding: 4,
  },
  description: {
    color: palette.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  section: {
    gap: 8,
  },
  label: {
    color: palette.primaryText,
    fontSize: 14,
  },
  required: {
    color: palette.errorText,
  },
  userInfoBox: {
    backgroundColor: palette.mutedBackground,
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  userName: {
    color: palette.primaryText,
    fontSize: 16,
  },
  userEmail: {
    color: palette.secondaryText,
    fontSize: 14,
  },
  userPreferredName: {
    color: palette.secondaryText,
    fontSize: 14,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: palette.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: palette.primaryText,
  },
  textarea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: palette.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: palette.primaryText,
    minHeight: 80,
    maxHeight: 120,
  },
  inputDisabled: {
    backgroundColor: palette.mutedBackground,
    opacity: 0.6,
  },
  helperText: {
    color: palette.secondaryText,
    fontSize: 12,
    lineHeight: 16,
  },
  conversionBox: {
    backgroundColor: palette.mutedBackground,
    borderWidth: 1,
    borderColor: palette.mutedBorder,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    gap: 4,
  },
  conversionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conversionLabel: {
    color: palette.secondaryText,
    fontSize: 14,
  },
  conversionAmount: {
    color: palette.buttonPrimary,
    fontSize: 18,
  },
  conversionFormula: {
    color: palette.secondaryText,
    fontSize: 12,
    marginTop: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.errorText,
  },
  errorText: {
    color: palette.errorText,
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
    borderTopColor: palette.mutedBorder,
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: palette.inputBorder,
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

