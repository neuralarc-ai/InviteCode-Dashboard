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
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

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
  const theme = useColorScheme();
  const colors = Colors[theme];
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
        <View style={[styles.dialog, { backgroundColor: colors.cardBackground }]}>
          <View style={[styles.dialogHeader, { borderBottomColor: colors.divider }]}>
            <View style={styles.dialogHeaderLeft}>
              <RemixIcon name="mail-line" size={24} color={colors.buttonPrimary} />
              <View style={styles.dialogTitleContainer}>
                <ThemedText type="title" style={styles.dialogTitle} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                  Customize Email Content
                </ThemedText>
                {selectedCount > 0 && (
                  <ThemedText type="default" style={styles.selectedCountText} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                    {selectedCount} user{selectedCount !== 1 ? 's' : ''} currently selected
                  </ThemedText>
                )}
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
              {/* Subject Line */}
              <View style={styles.inputGroup}>
                <ThemedText type="defaultSemiBold" style={styles.label} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                  Email Subject
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.searchBackground, borderColor: colors.inputBorder, color: colors.textPrimary }]}
                  value={emailData.subject}
                  onChangeText={handleSubjectChange}
                  placeholder="Enter email subject..."
                  placeholderTextColor={colors.textSecondary}
                  editable={!isSending}
                />
              </View>

              {/* Individual Email Input */}
              <View style={styles.inputGroup}>
                <ThemedText type="defaultSemiBold" style={styles.label} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                  Individual Email Address (for testing)
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.searchBackground, borderColor: colors.inputBorder, color: colors.textPrimary }]}
                  value={individualEmail}
                  onChangeText={setIndividualEmail}
                  placeholder="Enter email address for individual testing..."
                  placeholderTextColor={colors.textSecondary}
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
                  style={[styles.resetAllButton, { backgroundColor: colors.buttonSecondary }, isSending && styles.buttonDisabled]}>
                  <ThemedText type="defaultSemiBold" style={styles.resetAllButtonText} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                    Reset All to Default
                  </ThemedText>
                </Pressable>
              </View>

              {/* Email Sections Tabs */}
              <View style={styles.tabsContainer}>
                <View style={[styles.tabsList, { backgroundColor: colors.inactiveTabBackground }]}>
                  {(['uptime', 'downtime', 'creditsAdded', 'activity'] as EmailSectionKey[]).map((tab) => (
                    <Pressable
                      key={tab}
                      onPress={() => setActiveTab(tab)}
                      style={[
                        styles.tab,
                        { backgroundColor: activeTab === tab ? colors.activeTabBackground : 'transparent' },
                      ]}>
                      <ThemedText
                        type="defaultSemiBold"
                        style={styles.tabText}
                        lightColor={activeTab === tab ? colors.activeTabText : colors.inactiveTabText}
                        darkColor={activeTab === tab ? colors.activeTabText : colors.inactiveTabText}>
                        {sectionLabels[tab]}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>

                {/* Active Tab Content */}
                <View style={styles.sectionContainer}>
                  <View style={styles.sectionHeader}>
                    <ThemedText type="defaultSemiBold" style={styles.sectionTitle} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                      {sectionLabels[activeTab]}
                    </ThemedText>
                  </View>

                  {/* Content View Mode Tabs */}
                  <View style={[styles.contentViewTabs, { backgroundColor: colors.inactiveTabBackground }]}>
                    <Pressable
                      onPress={() => setContentViewMode('text')}
                      style={[
                        styles.contentViewTab,
                        { backgroundColor: contentViewMode === 'text' ? colors.activeTabBackground : 'transparent' },
                      ]}>
                      <ThemedText
                        type="defaultSemiBold"
                        style={styles.contentViewTabText}
                        lightColor={contentViewMode === 'text' ? colors.activeTabText : colors.inactiveTabText}
                        darkColor={contentViewMode === 'text' ? colors.activeTabText : colors.inactiveTabText}>
                        Plain Text
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={() => setContentViewMode('preview')}
                      style={[
                        styles.contentViewTab,
                        { backgroundColor: contentViewMode === 'preview' ? colors.activeTabBackground : 'transparent' },
                      ]}>
                      <ThemedText
                        type="defaultSemiBold"
                        style={styles.contentViewTabText}
                        lightColor={contentViewMode === 'preview' ? colors.activeTabText : colors.inactiveTabText}
                        darkColor={contentViewMode === 'preview' ? colors.activeTabText : colors.inactiveTabText}>
                        Preview
                      </ThemedText>
                    </Pressable>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.sectionActions}>
                    <Pressable
                      onPress={() => handleResetSection(activeTab)}
                      disabled={isSending}
                      style={[styles.sectionActionButton, { backgroundColor: colors.buttonSecondary }, isSending && styles.buttonDisabled]}>
                      <ThemedText type="defaultSemiBold" style={styles.sectionActionButtonText} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                        Reset to Default
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={() => handleEnhanceSection(activeTab)}
                      disabled={isEnhancing[activeTab] || isSending || !activeSection.textContent.trim()}
                      style={[
                        styles.sectionActionButton,
                        { backgroundColor: colors.buttonSecondary },
                        (isEnhancing[activeTab] || isSending || !activeSection.textContent.trim()) && styles.buttonDisabled,
                      ]}>
                      {isEnhancing[activeTab] ? (
                        <ActivityIndicator size="small" color={colors.textPrimary} />
                      ) : (
                        <>
                          <RemixIcon name="magic-line" size={16} color={colors.textPrimary} />
                          <ThemedText type="defaultSemiBold" style={styles.sectionActionButtonText} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                            Enhance
                          </ThemedText>
                        </>
                      )}
                    </Pressable>
                  </View>

                  {/* Content Area */}
                  {contentViewMode === 'text' ? (
                    <View style={styles.inputGroup}>
                      <ThemedText type="defaultSemiBold" style={styles.label} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                        Plain Text Content
                      </ThemedText>
                      <TextInput
                        style={[styles.textArea, { backgroundColor: colors.searchBackground, borderColor: colors.inputBorder, color: colors.textPrimary }]}
                        value={activeSection.textContent}
                        onChangeText={(value) => handleSectionContentChange(activeTab, value)}
                        placeholder="Enter plain text content..."
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        numberOfLines={15}
                        textAlignVertical="top"
                        editable={!isSending}
                      />
                    </View>
                  ) : (
                    <View style={styles.previewContainer}>
                      <View style={styles.previewSection}>
                        <ThemedText type="defaultSemiBold" style={styles.label} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                          Email Preview (HTML Template)
                        </ThemedText>
                        <View style={[styles.previewBox, { backgroundColor: colors.badgeBackground }]}>
                          <ScrollView style={styles.previewScroll}>
                            <ThemedText type="default" style={styles.previewText} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                              {activeSection.textContent || '(No content)'}
                            </ThemedText>
                          </ScrollView>
                        </View>
                      </View>
                      <View style={styles.previewSection}>
                        <ThemedText type="defaultSemiBold" style={styles.label} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                          Plain Text Content (as it will appear in the email)
                        </ThemedText>
                        <View style={[styles.previewBox, { backgroundColor: colors.badgeBackground }]}>
                          <ScrollView style={styles.previewScroll}>
                            <ThemedText type="default" style={styles.previewText} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
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

          <View style={[styles.dialogFooter, { borderTopColor: colors.divider }]}>
            <Pressable
              onPress={handleCancel}
              disabled={isSending}
              style={({ pressed }) => [
                styles.button,
                styles.cancelButton,
                { backgroundColor: colors.buttonSecondary },
                pressed && styles.buttonPressed,
              ]}>
              <ThemedText type="defaultSemiBold" style={styles.cancelButtonText} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                Cancel
              </ThemedText>
            </Pressable>
            <View style={styles.footerActions}>
              <Pressable
                onPress={handleSendToIndividualEmail}
                disabled={isSending || !emailData.subject.trim() || !hasContent() || !individualEmail.trim()}
                style={({ pressed }) => [
                  styles.button,
                  styles.secondaryButton,
                  { backgroundColor: colors.buttonSecondary },
                  (isSending || !emailData.subject.trim() || !hasContent() || !individualEmail.trim()) && styles.buttonDisabled,
                  pressed && !(isSending || !emailData.subject.trim() || !hasContent() || !individualEmail.trim()) && styles.buttonPressed,
                ]}>
                {isSending ? (
                  <ActivityIndicator size="small" color={colors.textPrimary} />
                ) : (
                  <>
                    <RemixIcon name="mail-line" size={16} color={colors.textPrimary} />
                    <ThemedText type="defaultSemiBold" style={styles.secondaryButtonText} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
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
                    { backgroundColor: colors.buttonPrimary },
                    (isSending || !emailData.subject.trim() || !hasContent()) && styles.buttonDisabled,
                    pressed && !(isSending || !emailData.subject.trim() || !hasContent()) && styles.buttonPressed,
                  ]}>
                  {isSending ? (
                    <ActivityIndicator size="small" color={colors.iconAccentLight} />
                  ) : (
                    <>
                      <RemixIcon name="mail-line" size={16} color={colors.iconAccentLight} />
                      <ThemedText type="defaultSemiBold" style={styles.submitButtonText} lightColor={colors.iconAccentLight} darkColor={colors.iconAccentLight}>
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
                  { backgroundColor: colors.buttonPrimary },
                  (isSending || !emailData.subject.trim() || !hasContent()) && styles.buttonDisabled,
                  pressed && !(isSending || !emailData.subject.trim() || !hasContent()) && styles.buttonPressed,
                ]}>
                {isSending ? (
                  <ActivityIndicator size="small" color={colors.iconAccentLight} />
                ) : (
                  <>
                    <RemixIcon name="mail-line" size={16} color={colors.iconAccentLight} />
                    <ThemedText type="defaultSemiBold" style={styles.submitButtonText} lightColor={colors.iconAccentLight} darkColor={colors.iconAccentLight}>
                      Send to All
                    </ThemedText>
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
  selectedCountText: {
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
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    // Background, border, and text colors applied inline
  },
  resetAllContainer: {
    alignItems: 'flex-end',
  },
  resetAllButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    // Background color applied inline
  },
  resetAllButtonText: {
    fontSize: 14,
  },
  tabsContainer: {
    gap: 16,
  },
  tabsList: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    // Background color applied inline
  },
  tab: {
    flex: 1,
    minWidth: 80,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    // Background color applied inline
  },
  tabActive: {
    // Background color applied inline
  },
  tabInactive: {
    // Background color applied inline
  },
  tabText: {
    fontSize: 14,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  tabTextInactive: {
    // Color applied inline
  },
  sectionContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    gap: 16,
    // Border color applied inline
  },
  sectionHeader: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
  },
  contentViewTabs: {
    flexDirection: 'row',
    gap: 8,
    // Background color applied inline
  },
  contentViewTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    // Background and border colors applied inline
  },
  contentViewTabActive: {
    // Background and border colors applied inline
  },
  contentViewTabInactive: {
    // Background and border colors applied inline
  },
  contentViewTabText: {
    fontSize: 14,
  },
  contentViewTabTextActive: {
    // Color applied inline
  },
  contentViewTabTextInactive: {
    // Color applied inline
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
    // Border and background colors applied inline
  },
  sectionActionButtonText: {
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 250,
    fontFamily: 'monospace',
    // Background, border, and text colors applied inline
  },
  previewContainer: {
    gap: 16,
  },
  previewSection: {
    gap: 8,
  },
  previewBox: {
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 150,
    maxHeight: 200,
    // Border and background colors applied inline
  },
  previewScroll: {
    padding: 12,
  },
  previewText: {
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
    flexShrink: 0,
    flexWrap: 'wrap',
    // Border color applied inline
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
    // Background color applied inline
  },
  cancelButtonText: {
    fontSize: 14,
  },
  secondaryButton: {
    borderWidth: 1,
    // Background and border colors applied inline
  },
  secondaryButtonText: {
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
  buttonPressed: {
    backgroundColor: '#DC2626',
  },
  buttonPressedText: {
    color: '#FFFFFF',
  },
});
