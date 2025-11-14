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
  tabActive: '#C3473D',
  tabInactive: '#E4D5CA',
} as const;

export type EmailSectionKey = 'uptime' | 'downtime' | 'creditsAdded' | 'activity';

interface EmailSectionData {
  textContent: string;
  htmlContent: string;
}

export interface EmailData {
  subject: string;
  sections: {
    [key in EmailSectionKey]: EmailSectionData;
  };
  textContent?: string;
  htmlContent?: string;
}

interface EmailCustomizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendEmail: (emailData: EmailData, selectedOnly?: boolean) => Promise<void>;
  onSendToIndividual: (emailData: EmailData, emailAddress: string) => Promise<void>;
  selectedCount?: number;
  isSending?: boolean;
}

// Default content for each section
const defaultSectionContent: Record<EmailSectionKey, string> = {
  uptime: `System Uptime: Helium is back online

Greetings from Helium,

We're pleased to inform you that Helium is now back online and fully operational after scheduled maintenance.

All systems are running smoothly, and you can now access all features and services as usual. We appreciate your patience during the brief maintenance window.

If you experience any issues, please don't hesitate to reach out to our support team.

Thanks,
The Helium Team`,

  downtime: `Scheduled Downtime: Helium will be unavailable for 1 hour

Greetings from Helium,

We wanted to let you know that Helium will be temporarily unavailable for 1 hour as we perform scheduled maintenance and upgrades.

During this window, you won't be able to access Helium. Once the maintenance is complete, you'll be able to log back in and experience the platform as usual.

We appreciate your patience and understanding as we work to make Helium even better for you.

Thanks,
The Helium Team`,

  creditsAdded: `Credits Added to Your Account

Greetings from Helium,

We're excited to inform you that credits have been added to your Helium account. These credits are now available for you to use across all platform features.

You can check your credit balance in your account dashboard at any time. If you have any questions about your credits or how to use them, please feel free to reach out to our support team.

Thank you for being a valued member of the Helium community.

Thanks,
The Helium Team`,

  activity: `Activity Update from Helium

Greetings from Helium,

We wanted to share an update on your recent activity on the Helium platform. Your engagement helps us continue to improve and deliver the best experience possible.

We encourage you to continue exploring all that Helium has to offer. If you have any feedback or suggestions, we'd love to hear from you.

Thank you for being an active member of our community.

Thanks,
The Helium Team`,
};

const convertTextToHtml = (text: string): string => {
  return `<html><body>${text.split('\n').map((line) => `<p>${line || '<br />'}</p>`).join('')}</body></html>`;
};

const createDefaultEmailData = (): EmailData => {
  const sections: { [key in EmailSectionKey]: EmailSectionData } = {
    uptime: {
      textContent: defaultSectionContent.uptime,
      htmlContent: convertTextToHtml(defaultSectionContent.uptime),
    },
    downtime: {
      textContent: defaultSectionContent.downtime,
      htmlContent: convertTextToHtml(defaultSectionContent.downtime),
    },
    creditsAdded: {
      textContent: defaultSectionContent.creditsAdded,
      htmlContent: convertTextToHtml(defaultSectionContent.creditsAdded),
    },
    activity: {
      textContent: defaultSectionContent.activity,
      htmlContent: convertTextToHtml(defaultSectionContent.activity),
    },
  };

  return {
    subject: 'Update from Helium',
    sections,
  };
};

const sectionLabels: Record<EmailSectionKey, string> = {
  uptime: 'Uptime',
  downtime: 'Downtime',
  creditsAdded: 'Credits Added',
  activity: 'Activity',
};

export function EmailCustomizationDialog({
  open,
  onOpenChange,
  onSendEmail,
  onSendToIndividual,
  selectedCount = 0,
  isSending = false,
}: EmailCustomizationDialogProps): ReactElement {
  const [emailData, setEmailData] = useState<EmailData>(createDefaultEmailData());
  const [individualEmail, setIndividualEmail] = useState('');
  const [activeTab, setActiveTab] = useState<EmailSectionKey>('uptime');
  const [contentViewMode, setContentViewMode] = useState<'text' | 'preview'>('text');
  const [isEnhancing, setIsEnhancing] = useState<Record<EmailSectionKey, boolean>>({
    uptime: false,
    downtime: false,
    creditsAdded: false,
    activity: false,
  });

  useEffect(() => {
    if (open) {
      setEmailData(createDefaultEmailData());
      setIndividualEmail('');
      setActiveTab('uptime');
      setContentViewMode('text');
      setIsEnhancing({
        uptime: false,
        downtime: false,
        creditsAdded: false,
        activity: false,
      });
    }
  }, [open]);

  const handleSubjectChange = useCallback((subject: string) => {
    setEmailData((prev) => ({ ...prev, subject }));
  }, []);

  const handleSectionContentChange = useCallback((sectionKey: EmailSectionKey, textContent: string) => {
    setEmailData((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionKey]: {
          textContent,
          htmlContent: convertTextToHtml(textContent),
        },
      },
    }));
  }, []);

  const handleResetSection = useCallback((sectionKey: EmailSectionKey) => {
    const defaultContent = defaultSectionContent[sectionKey];
    setEmailData((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionKey]: {
          textContent: defaultContent,
          htmlContent: convertTextToHtml(defaultContent),
        },
      },
    }));
  }, []);

  const handleResetAll = useCallback(() => {
    setEmailData(createDefaultEmailData());
  }, []);

  const enhanceTextContent = useCallback((text: string): string => {
    return text
      .replace(/Greetings from Helium,/g, 'Dear Valued Helium User,')
      .replace(/We wanted to let you know/g, 'We are writing to inform you')
      .replace(/We're pleased to inform you/g, 'We are delighted to inform you')
      .replace(/We're excited to inform you/g, 'We are thrilled to inform you')
      .replace(/temporarily unavailable/g, 'temporarily offline')
      .replace(/won't be able to access/g, 'will be unable to access')
      .replace(/Once the maintenance is complete/g, 'Upon completion of the maintenance')
      .replace(/log back in/g, 'regain access')
      .replace(/We appreciate your patience/g, 'Thank you for your understanding and patience')
      .replace(/as we work to make Helium even better/g, "as we continue to enhance Helium's capabilities")
      .replace(/Thanks,/g, 'Best regards,')
      .replace(/The Helium Team/g, 'The Helium Development Team');
  }, []);

  const handleEnhanceSection = useCallback(async (sectionKey: EmailSectionKey) => {
    setIsEnhancing((prev) => ({ ...prev, [sectionKey]: true }));
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const currentContent = emailData.sections[sectionKey].textContent;
      const enhancedContent = enhanceTextContent(currentContent);
      setEmailData((prev) => ({
        ...prev,
        sections: {
          ...prev.sections,
          [sectionKey]: {
            textContent: enhancedContent,
            htmlContent: convertTextToHtml(enhancedContent),
          },
        },
      }));
    } catch (error) {
      console.error('Error enhancing email content:', error);
    } finally {
      setIsEnhancing((prev) => ({ ...prev, [sectionKey]: false }));
    }
  }, [emailData.sections, enhanceTextContent]);

  const getActiveSectionContent = useCallback((): { textContent: string; htmlContent: string } => {
    return emailData.sections[activeTab];
  }, [emailData.sections, activeTab]);

  const handleSend = useCallback(async (selectedOnly: boolean = false) => {
    const activeContent = getActiveSectionContent();
    const emailDataToSend: EmailData = {
      ...emailData,
      textContent: activeContent.textContent,
      htmlContent: activeContent.htmlContent,
    };
    await onSendEmail(emailDataToSend, selectedOnly);
  }, [emailData, activeTab, getActiveSectionContent, onSendEmail]);

  const handleSendToIndividualEmail = useCallback(async () => {
    if (individualEmail.trim()) {
      const activeContent = getActiveSectionContent();
      const emailDataToSend: EmailData = {
        ...emailData,
        textContent: activeContent.textContent || '',
        htmlContent: activeContent.htmlContent || '',
      };
      await onSendToIndividual(emailDataToSend, individualEmail.trim());
    }
  }, [emailData, activeTab, individualEmail, getActiveSectionContent, onSendToIndividual]);

  const hasContent = useCallback(() => {
    const activeSection = emailData.sections[activeTab];
    return activeSection.textContent.trim().length > 0;
  }, [emailData.sections, activeTab]);

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  if (!open) {
    return <></>;
  }

  const activeSection = emailData.sections[activeTab];

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
              <RemixIcon name="mail-line" size={24} color={palette.buttonPrimary} />
              <View style={styles.dialogTitleContainer}>
                <ThemedText type="title" style={styles.dialogTitle}>
                  Customize Email Content
                </ThemedText>
                {selectedCount > 0 && (
                  <ThemedText type="default" style={styles.selectedCountText}>
                    {selectedCount} user{selectedCount !== 1 ? 's' : ''} currently selected
                  </ThemedText>
                )}
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
              {/* Subject Line */}
              <View style={styles.inputGroup}>
                <ThemedText type="defaultSemiBold" style={styles.label}>
                  Email Subject
                </ThemedText>
                <TextInput
                  style={styles.input}
                  value={emailData.subject}
                  onChangeText={handleSubjectChange}
                  placeholder="Enter email subject..."
                  placeholderTextColor={palette.secondaryText}
                  editable={!isSending}
                />
              </View>

              {/* Individual Email Input */}
              <View style={styles.inputGroup}>
                <ThemedText type="defaultSemiBold" style={styles.label}>
                  Individual Email Address (for testing)
                </ThemedText>
                <TextInput
                  style={styles.input}
                  value={individualEmail}
                  onChangeText={setIndividualEmail}
                  placeholder="Enter email address for individual testing..."
                  placeholderTextColor={palette.secondaryText}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isSending}
                />
              </View>

              {/* Reset All Button */}
              <View style={styles.resetAllContainer}>
                <Pressable
                  onPress={handleResetAll}
                  disabled={isSending}
                  style={[styles.resetAllButton, isSending && styles.buttonDisabled]}>
                  <ThemedText type="defaultSemiBold" style={styles.resetAllButtonText}>
                    Reset All to Default
                  </ThemedText>
                </Pressable>
              </View>

              {/* Email Sections Tabs */}
              <View style={styles.tabsContainer}>
                <View style={styles.tabsList}>
                  {(['uptime', 'downtime', 'creditsAdded', 'activity'] as EmailSectionKey[]).map((tab) => (
                    <Pressable
                      key={tab}
                      onPress={() => setActiveTab(tab)}
                      style={[
                        styles.tab,
                        activeTab === tab ? styles.tabActive : styles.tabInactive,
                      ]}>
                      <ThemedText
                        type="defaultSemiBold"
                        style={[
                          styles.tabText,
                          activeTab === tab ? styles.tabTextActive : styles.tabTextInactive,
                        ]}>
                        {sectionLabels[tab]}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>

                {/* Active Tab Content */}
                <View style={styles.sectionContainer}>
                  <View style={styles.sectionHeader}>
                    <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                      {sectionLabels[activeTab]}
                    </ThemedText>
                  </View>

                  {/* Content View Mode Tabs */}
                  <View style={styles.contentViewTabs}>
                    <Pressable
                      onPress={() => setContentViewMode('text')}
                      style={[
                        styles.contentViewTab,
                        contentViewMode === 'text' ? styles.contentViewTabActive : styles.contentViewTabInactive,
                      ]}>
                      <ThemedText
                        type="defaultSemiBold"
                        style={[
                          styles.contentViewTabText,
                          contentViewMode === 'text' ? styles.contentViewTabTextActive : styles.contentViewTabTextInactive,
                        ]}>
                        Plain Text
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={() => setContentViewMode('preview')}
                      style={[
                        styles.contentViewTab,
                        contentViewMode === 'preview' ? styles.contentViewTabActive : styles.contentViewTabInactive,
                      ]}>
                      <ThemedText
                        type="defaultSemiBold"
                        style={[
                          styles.contentViewTabText,
                          contentViewMode === 'preview' ? styles.contentViewTabTextActive : styles.contentViewTabTextInactive,
                        ]}>
                        Preview
                      </ThemedText>
                    </Pressable>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.sectionActions}>
                    <Pressable
                      onPress={() => handleResetSection(activeTab)}
                      disabled={isSending}
                      style={[styles.sectionActionButton, isSending && styles.buttonDisabled]}>
                      <ThemedText type="defaultSemiBold" style={styles.sectionActionButtonText}>
                        Reset to Default
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={() => handleEnhanceSection(activeTab)}
                      disabled={isEnhancing[activeTab] || isSending || !activeSection.textContent.trim()}
                      style={[
                        styles.sectionActionButton,
                        (isEnhancing[activeTab] || isSending || !activeSection.textContent.trim()) && styles.buttonDisabled,
                      ]}>
                      {isEnhancing[activeTab] ? (
                        <ActivityIndicator size="small" color={palette.primaryText} />
                      ) : (
                        <>
                          <RemixIcon name="magic-line" size={16} color={palette.primaryText} />
                          <ThemedText type="defaultSemiBold" style={styles.sectionActionButtonText}>
                            Enhance
                          </ThemedText>
                        </>
                      )}
                    </Pressable>
                  </View>

                  {/* Content Area */}
                  {contentViewMode === 'text' ? (
                    <View style={styles.inputGroup}>
                      <ThemedText type="defaultSemiBold" style={styles.label}>
                        Plain Text Content
                      </ThemedText>
                      <TextInput
                        style={styles.textArea}
                        value={activeSection.textContent}
                        onChangeText={(value) => handleSectionContentChange(activeTab, value)}
                        placeholder="Enter plain text content..."
                        placeholderTextColor={palette.secondaryText}
                        multiline
                        numberOfLines={15}
                        textAlignVertical="top"
                        editable={!isSending}
                      />
                    </View>
                  ) : (
                    <View style={styles.previewContainer}>
                      <View style={styles.previewSection}>
                        <ThemedText type="defaultSemiBold" style={styles.label}>
                          Email Preview (HTML Template)
                        </ThemedText>
                        <View style={styles.previewBox}>
                          <ScrollView style={styles.previewScroll}>
                            <ThemedText type="default" style={styles.previewText}>
                              {activeSection.textContent || '(No content)'}
                            </ThemedText>
                          </ScrollView>
                        </View>
                      </View>
                      <View style={styles.previewSection}>
                        <ThemedText type="defaultSemiBold" style={styles.label}>
                          Plain Text Content (as it will appear in the email)
                        </ThemedText>
                        <View style={styles.previewBox}>
                          <ScrollView style={styles.previewScroll}>
                            <ThemedText type="default" style={styles.previewText}>
                              {activeSection.textContent || '(No content)'}
                            </ThemedText>
                          </ScrollView>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.dialogFooter}>
            <Pressable
              onPress={handleCancel}
              disabled={isSending}
              style={({ pressed }) => [
                styles.button,
                styles.cancelButton,
                pressed && styles.buttonPressed,
              ]}>
              {({ pressed }) => (
                <ThemedText type="defaultSemiBold" style={[styles.cancelButtonText, pressed && styles.buttonPressedText]}>
                  Cancel
                </ThemedText>
              )}
            </Pressable>
            <View style={styles.footerActions}>
              <Pressable
                onPress={handleSendToIndividualEmail}
                disabled={isSending || !emailData.subject.trim() || !hasContent() || !individualEmail.trim()}
                style={({ pressed }) => [
                  styles.button,
                  styles.secondaryButton,
                  (isSending || !emailData.subject.trim() || !hasContent() || !individualEmail.trim()) && styles.buttonDisabled,
                  pressed && !(isSending || !emailData.subject.trim() || !hasContent() || !individualEmail.trim()) && styles.buttonPressed,
                ]}>
                {isSending ? (
                  <ActivityIndicator size="small" color={palette.primaryText} />
                ) : (
                  <>
                    <RemixIcon name="mail-line" size={16} color={palette.primaryText} />
                    <ThemedText type="defaultSemiBold" style={styles.secondaryButtonText}>
                      Send to Individual
                    </ThemedText>
                  </>
                )}
              </Pressable>
              {selectedCount > 0 && (
                <Pressable
                  onPress={() => handleSend(true)}
                  disabled={isSending || !emailData.subject.trim() || !hasContent()}
                  style={({ pressed }) => [
                    styles.button,
                    styles.submitButton,
                    (isSending || !emailData.subject.trim() || !hasContent()) && styles.buttonDisabled,
                    pressed && !(isSending || !emailData.subject.trim() || !hasContent()) && styles.buttonPressed,
                  ]}>
                  {isSending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <RemixIcon name="mail-line" size={16} color="#FFFFFF" />
                      <ThemedText type="defaultSemiBold" style={styles.submitButtonText}>
                        Send to Selected ({selectedCount})
                      </ThemedText>
                    </>
                  )}
                </Pressable>
              )}
              <Pressable
                onPress={() => handleSend(false)}
                disabled={isSending || !emailData.subject.trim() || !hasContent()}
                style={({ pressed }) => [
                  styles.button,
                  styles.submitButton,
                  (isSending || !emailData.subject.trim() || !hasContent()) && styles.buttonDisabled,
                  pressed && !(isSending || !emailData.subject.trim() || !hasContent()) && styles.buttonPressed,
                ]}>
                {({ pressed }) => (
                  <>
                    {isSending ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <RemixIcon name="mail-line" size={16} color="#FFFFFF" />
                        <ThemedText type="defaultSemiBold" style={[styles.submitButtonText, pressed && styles.buttonPressedText]}>
                          Send to All
                        </ThemedText>
                      </>
                    )}
                  </>
                )}
              </Pressable>
            </View>
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
  selectedCountText: {
    color: palette.buttonPrimary,
    fontWeight: '500',
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
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: palette.primaryText,
    fontSize: 14,
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
  resetAllContainer: {
    alignItems: 'flex-end',
  },
  resetAllButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.inputBorder,
    backgroundColor: palette.inputBackground,
  },
  resetAllButtonText: {
    color: palette.primaryText,
    fontSize: 14,
  },
  tabsContainer: {
    gap: 16,
  },
  tabsList: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  tab: {
    flex: 1,
    minWidth: 80,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: palette.tabActive,
  },
  tabInactive: {
    backgroundColor: palette.tabInactive,
  },
  tabText: {
    fontSize: 14,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  tabTextInactive: {
    color: palette.primaryText,
  },
  sectionContainer: {
    borderWidth: 1,
    borderColor: palette.inputBorder,
    borderRadius: 8,
    padding: 16,
    gap: 16,
  },
  sectionHeader: {
    marginBottom: 8,
  },
  sectionTitle: {
    color: palette.primaryText,
    fontSize: 18,
  },
  contentViewTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  contentViewTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  contentViewTabActive: {
    backgroundColor: palette.cardBackground,
    borderColor: palette.tabActive,
  },
  contentViewTabInactive: {
    backgroundColor: palette.tabInactive,
    borderColor: palette.inputBorder,
  },
  contentViewTabText: {
    fontSize: 14,
  },
  contentViewTabTextActive: {
    color: palette.tabActive,
  },
  contentViewTabTextInactive: {
    color: palette.primaryText,
  },
  sectionActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  sectionActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.inputBorder,
    backgroundColor: palette.inputBackground,
  },
  sectionActionButtonText: {
    color: palette.primaryText,
    fontSize: 14,
  },
  textArea: {
    backgroundColor: palette.inputBackground,
    borderWidth: 1,
    borderColor: palette.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: palette.primaryText,
    minHeight: 250,
    fontFamily: 'monospace',
  },
  previewContainer: {
    gap: 16,
  },
  previewSection: {
    gap: 8,
  },
  previewBox: {
    borderWidth: 1,
    borderColor: palette.inputBorder,
    borderRadius: 8,
    minHeight: 150,
    backgroundColor: '#F9F9F9',
    maxHeight: 200,
  },
  previewScroll: {
    padding: 12,
  },
  previewText: {
    color: palette.primaryText,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  dialogFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: palette.divider,
    flexShrink: 0,
    flexWrap: 'wrap',
  },
  footerActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    flex: 1,
    justifyContent: 'flex-end',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: palette.buttonSecondary,
  },
  cancelButtonText: {
    color: palette.primaryText,
    fontSize: 14,
  },
  secondaryButton: {
    backgroundColor: palette.buttonSecondary,
    borderWidth: 1,
    borderColor: palette.inputBorder,
  },
  secondaryButtonText: {
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
  buttonPressed: {
    backgroundColor: '#DC2626',
  },
  buttonPressedText: {
    color: '#FFFFFF',
  },
});
