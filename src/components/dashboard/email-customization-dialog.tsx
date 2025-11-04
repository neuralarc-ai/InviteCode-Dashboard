"use client"

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Eye, EyeOff, Wand2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { createUptimeHtmlTemplate, createDowntimeHtmlTemplate, createCreditsHtmlTemplate, convertTextToHtml } from '@/lib/email-templates';

interface EmailCustomizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendEmail: (emailData: EmailData, selectedOnly?: boolean) => Promise<void>;
  onSendToIndividual: (emailData: EmailData, emailAddress: string) => Promise<void>;
  isSending: boolean;
  selectedCount?: number;
}

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
  // For backward compatibility with API
  textContent?: string;
  htmlContent?: string;
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

const createDefaultEmailData = (logoBase64?: string | null, uptimeBodyBase64?: string | null, downtimeBodyBase64?: string | null, creditsBodyBase64?: string | null): EmailData => {
  const sections: { [key in EmailSectionKey]: EmailSectionData } = {
    uptime: {
      textContent: defaultSectionContent.uptime,
      htmlContent: createUptimeHtmlTemplate({
        logoBase64: logoBase64 || null,
        uptimeBodyBase64: uptimeBodyBase64 || null,
        textContent: defaultSectionContent.uptime,
      }),
    },
    downtime: {
      textContent: defaultSectionContent.downtime,
      htmlContent: createDowntimeHtmlTemplate({
        logoBase64: logoBase64 || null,
        downtimeBodyBase64: downtimeBodyBase64 || uptimeBodyBase64 || null, // Use downtime image if available, otherwise fallback to uptime image
        textContent: defaultSectionContent.downtime,
      }),
    },
    creditsAdded: {
      textContent: defaultSectionContent.creditsAdded,
      htmlContent: createCreditsHtmlTemplate({
        logoBase64: logoBase64 || null,
        creditsBodyBase64: creditsBodyBase64 || null,
        textContent: defaultSectionContent.creditsAdded,
      }),
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

interface EmailSectionProps {
  sectionKey: EmailSectionKey;
  sectionData: EmailSectionData;
  sectionLabel: string;
  isEnhancing: boolean;
  isSending: boolean;
  onContentChange: (sectionKey: EmailSectionKey, textContent: string) => void;
  onReset: (sectionKey: EmailSectionKey) => void;
  onEnhance: (sectionKey: EmailSectionKey) => void;
}

function EmailSection({
  sectionKey,
  sectionData,
  sectionLabel,
  isEnhancing,
  isSending,
  onContentChange,
  onReset,
  onEnhance,
}: EmailSectionProps) {
  return (
    <div className="space-y-4 border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{sectionLabel}</h3>
      </div>

      <Tabs defaultValue="text" className="w-full min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <TabsList>
            <TabsTrigger value="text">Plain Text</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReset(sectionKey)}
              disabled={isSending}
            >
              Reset to Default
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEnhance(sectionKey)}
              disabled={isEnhancing || isSending || !sectionData.textContent.trim()}
              className="flex items-center gap-2"
            >
              {isEnhancing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enhancing...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Enhance
                </>
              )}
            </Button>
          </div>
        </div>

        <TabsContent value="text" className="space-y-2 min-w-0">
          <Label htmlFor={`${sectionKey}-text-content`}>Plain Text Content</Label>
          <Textarea
            id={`${sectionKey}-text-content`}
            value={sectionData.textContent}
            onChange={(e) => onContentChange(sectionKey, e.target.value)}
            placeholder="Enter plain text content..."
            className="min-h-[250px] font-mono text-sm w-full"
            disabled={isSending}
          />
        </TabsContent>

        <TabsContent value="preview" className="space-y-2 min-w-0">
          <Label>Email Preview</Label>
          <div className="border rounded-lg min-h-[250px] overflow-hidden overflow-x-auto">
            <div 
              className="prose max-w-none break-words"
              dangerouslySetInnerHTML={{ __html: sectionData.htmlContent }}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

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
  isSending,
  selectedCount = 0
}: EmailCustomizationDialogProps) {
  const [emailImages, setEmailImages] = useState<{ logo: string | null; uptimeBody: string | null; downtimeBody: string | null; creditsBody: string | null }>({
    logo: null,
    uptimeBody: null,
    downtimeBody: null,
    creditsBody: null,
  });
  const [emailData, setEmailData] = useState<EmailData>(createDefaultEmailData());
// ... existing code ...
  const [individualEmail, setIndividualEmail] = useState('');
  const [activeTab, setActiveTab] = useState<EmailSectionKey>('uptime');
  const [isEnhancing, setIsEnhancing] = useState<Record<EmailSectionKey, boolean>>({
    uptime: false,
    downtime: false,
    creditsAdded: false,
    activity: false,
  });

  // Fetch base64 images on component mount
  useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await fetch('/api/get-email-images');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.images) {
            setEmailImages({
              logo: data.images.logo,
              uptimeBody: data.images.uptimeBody,
              downtimeBody: data.images.downtimeBody,
              creditsBody: data.images.creditsBody,
            });
            // Update Uptime, Downtime, and Credits sections with HTML templates containing base64 images
            setEmailData(prev => ({
              ...prev,
              sections: {
                ...prev.sections,
                uptime: {
                  textContent: prev.sections.uptime.textContent,
                  htmlContent: createUptimeHtmlTemplate({
                    logoBase64: data.images.logo,
                    uptimeBodyBase64: data.images.uptimeBody,
                    textContent: prev.sections.uptime.textContent,
                  }),
                },
                downtime: {
                  textContent: prev.sections.downtime.textContent,
                  htmlContent: createDowntimeHtmlTemplate({
                    logoBase64: data.images.logo,
                    downtimeBodyBase64: data.images.downtimeBody || data.images.uptimeBody, // Use downtime image if available, otherwise fallback to uptime image
                    textContent: prev.sections.downtime.textContent,
                  }),
                },
                creditsAdded: {
                  textContent: prev.sections.creditsAdded.textContent,
                  htmlContent: createCreditsHtmlTemplate({
                    logoBase64: data.images.logo,
                    creditsBodyBase64: data.images.creditsBody,
                    textContent: prev.sections.creditsAdded.textContent,
                  }),
                },
              },
            }));
          }
        }
      } catch (error) {
        console.error('Failed to fetch email images:', error);
      }
    };

    fetchImages();
  }, []);

  const handleSubjectChange = (subject: string) => {
    setEmailData(prev => ({ ...prev, subject }));
  };

  const handleSectionContentChange = (sectionKey: EmailSectionKey, textContent: string) => {
    // For Uptime section, keep the HTML template with base64 images
    if (sectionKey === 'uptime') {
      setEmailData(prev => ({
        ...prev,
        sections: {
          ...prev.sections,
          [sectionKey]: {
            textContent,
            htmlContent: createUptimeHtmlTemplate({
              logoBase64: emailImages.logo,
              uptimeBodyBase64: emailImages.uptimeBody,
              textContent,
            }),
          },
        },
      }));
    } else if (sectionKey === 'downtime') {
      // For Downtime section, use the downtime HTML template with base64 images
      setEmailData(prev => ({
        ...prev,
        sections: {
          ...prev.sections,
          [sectionKey]: {
            textContent,
            htmlContent: createDowntimeHtmlTemplate({
              logoBase64: emailImages.logo,
              downtimeBodyBase64: emailImages.downtimeBody || emailImages.uptimeBody, // Use downtime image if available, otherwise fallback to uptime image
              textContent,
            }),
          },
        },
      }));
    } else if (sectionKey === 'creditsAdded') {
      // For Credits Added section, use the credits HTML template with base64 images
      setEmailData(prev => ({
        ...prev,
        sections: {
          ...prev.sections,
          [sectionKey]: {
            textContent,
            htmlContent: createCreditsHtmlTemplate({
              logoBase64: emailImages.logo,
              creditsBodyBase64: emailImages.creditsBody,
              textContent,
            }),
          },
        },
      }));
    } else {
      setEmailData(prev => ({ 
        ...prev, 
        sections: {
          ...prev.sections,
          [sectionKey]: {
            textContent,
            htmlContent: convertTextToHtml(textContent),
          },
        },
      }));
    }
  };

  const handleResetSection = (sectionKey: EmailSectionKey) => {
    const defaultContent = defaultSectionContent[sectionKey];
    
    // Special handling for Uptime section - use HTML template
    if (sectionKey === 'uptime') {
      setEmailData(prev => ({
        ...prev,
        sections: {
          ...prev.sections,
          [sectionKey]: {
            textContent: defaultContent,
            htmlContent: createUptimeHtmlTemplate({
              logoBase64: emailImages.logo,
              uptimeBodyBase64: emailImages.uptimeBody,
              textContent: defaultContent,
            }),
          },
        },
      }));
    } else if (sectionKey === 'downtime') {
      // Special handling for Downtime section - use HTML template
      setEmailData(prev => ({
        ...prev,
        sections: {
          ...prev.sections,
          [sectionKey]: {
            textContent: defaultContent,
            htmlContent: createDowntimeHtmlTemplate({
              logoBase64: emailImages.logo,
              downtimeBodyBase64: emailImages.downtimeBody || emailImages.uptimeBody, // Use downtime image if available, otherwise fallback to uptime image
              textContent: defaultContent,
            }),
          },
        },
      }));
    } else if (sectionKey === 'creditsAdded') {
      // Special handling for Credits Added section - use HTML template
      setEmailData(prev => ({
        ...prev,
        sections: {
          ...prev.sections,
          [sectionKey]: {
            textContent: defaultContent,
            htmlContent: createCreditsHtmlTemplate({
              logoBase64: emailImages.logo,
              creditsBodyBase64: emailImages.creditsBody,
              textContent: defaultContent,
            }),
          },
        },
      }));
    } else {
      setEmailData(prev => ({
        ...prev,
        sections: {
          ...prev.sections,
          [sectionKey]: {
            textContent: defaultContent,
            htmlContent: convertTextToHtml(defaultContent),
          },
        },
      }));
    }
  };

  const handleResetAll = () => {
    setEmailData(createDefaultEmailData(emailImages.logo, emailImages.uptimeBody, emailImages.downtimeBody, emailImages.creditsBody));
  };

  const enhanceTextContent = (text: string): string => {
    // Simple enhancement logic - in a real implementation, this would use AI
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
      .replace(/as we work to make Helium even better/g, 'as we continue to enhance Helium\'s capabilities')
      .replace(/Thanks,/g, 'Best regards,')
      .replace(/The Helium Team/g, 'The Helium Development Team');
  };

  const handleEnhanceSection = async (sectionKey: EmailSectionKey) => {
    setIsEnhancing(prev => ({ ...prev, [sectionKey]: true }));
    try {
      // Simulate AI enhancement - in a real implementation, this would call an AI service
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const currentContent = emailData.sections[sectionKey].textContent;
      const enhancedContent = enhanceTextContent(currentContent);
      
      setEmailData(prev => ({
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
      setIsEnhancing(prev => ({ ...prev, [sectionKey]: false }));
    }
  };

  // Get the active section's content for sending
  const getActiveSectionContent = (): { textContent: string; htmlContent: string } => {
    const section = emailData.sections[activeTab];
    
    // For uptime section, ensure HTML is generated with images if needed
    if (activeTab === 'uptime') {
      // If htmlContent is missing or doesn't include images, regenerate it
      if (!section.htmlContent || (!section.htmlContent.includes('data:image') && (emailImages.logo || emailImages.uptimeBody))) {
        const regeneratedHtml = createUptimeHtmlTemplate({
          logoBase64: emailImages.logo,
          uptimeBodyBase64: emailImages.uptimeBody,
          textContent: section.textContent,
        });
        return {
          textContent: section.textContent,
          htmlContent: regeneratedHtml,
        };
      }
      return {
        textContent: section.textContent,
        htmlContent: section.htmlContent,
      };
    } else if (activeTab === 'downtime') {
      // For downtime section, ensure HTML is generated with images if needed
      if (!section.htmlContent || (!section.htmlContent.includes('data:image') && (emailImages.logo || emailImages.uptimeBody))) {
        const regeneratedHtml = createDowntimeHtmlTemplate({
          logoBase64: emailImages.logo,
          downtimeBodyBase64: emailImages.downtimeBody || emailImages.uptimeBody, // Use downtime image if available, otherwise fallback to uptime image
          textContent: section.textContent,
        });
        return {
          textContent: section.textContent,
          htmlContent: regeneratedHtml,
        };
      }
      return {
        textContent: section.textContent,
        htmlContent: section.htmlContent,
      };
    } else if (activeTab === 'creditsAdded') {
      // For credits added section, ensure HTML is generated with images if needed
      if (!section.htmlContent || (!section.htmlContent.includes('data:image') && (emailImages.logo || emailImages.creditsBody))) {
        const regeneratedHtml = createCreditsHtmlTemplate({
          logoBase64: emailImages.logo,
          creditsBodyBase64: emailImages.creditsBody,
          textContent: section.textContent,
        });
        return {
          textContent: section.textContent,
          htmlContent: regeneratedHtml,
        };
      }
      return {
        textContent: section.textContent,
        htmlContent: section.htmlContent,
      };
    } else {
      // For simple templates, return as-is (they already have html wrapper)
      return {
        textContent: section.textContent || '',
        htmlContent: section.htmlContent || '',
      };
    }
  };

  const handleSend = async (selectedOnly: boolean = false) => {
    const activeContent = getActiveSectionContent();
    const emailDataToSend: EmailData = {
      ...emailData,
      textContent: activeContent.textContent,
      htmlContent: activeContent.htmlContent,
    };
    await onSendEmail(emailDataToSend, selectedOnly);
  };

  const handleSendToIndividual = async () => {
    if (individualEmail.trim()) {
      const activeContent = getActiveSectionContent();
      
      // Ensure we have valid content
      if (!activeContent.textContent || !activeContent.htmlContent) {
        console.error('Missing content for active section:', {
          activeTab,
          textContent: activeContent.textContent,
          htmlContent: activeContent.htmlContent ? 'exists' : 'missing',
        });
        return;
      }
      
      const emailDataToSend: EmailData = {
        ...emailData,
        textContent: activeContent.textContent || '',
        htmlContent: activeContent.htmlContent || '',
      };
      await onSendToIndividual(emailDataToSend, individualEmail.trim());
    }
  };

  // Check if the active section has content
  const hasContent = () => {
    const activeSection = emailData.sections[activeTab];
    return activeSection.textContent.trim().length > 0;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Customize Email Content
          </DialogTitle>
          <DialogDescription>
            Customize the email subject and content sections before sending. Only the currently active tab will be sent. You can send to all users or only selected users.
            {selectedCount > 0 && (
              <span className="block mt-1 text-primary font-medium">
                {selectedCount} user{selectedCount !== 1 ? 's' : ''} currently selected
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 w-full min-w-0">
          {/* Subject Line */}
          <div className="space-y-2">
            <Label htmlFor="subject">Email Subject</Label>
            <Input
              id="subject"
              value={emailData.subject}
              onChange={(e) => handleSubjectChange(e.target.value)}
              placeholder="Enter email subject..."
              disabled={isSending}
            />
          </div>

          {/* Individual Email Input */}
          <div className="space-y-2">
            <Label htmlFor="individual-email">Individual Email Address (for testing)</Label>
            <Input
              id="individual-email"
              type="email"
              value={individualEmail}
              onChange={(e) => setIndividualEmail(e.target.value)}
              placeholder="Enter email address for individual testing..."
              disabled={isSending}
            />
          </div>

          {/* Reset All Button */}
          <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
              onClick={handleResetAll}
                  disabled={isSending}
                >
              Reset All to Default
                </Button>
              </div>

          {/* Email Sections */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as EmailSectionKey)} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="uptime">{sectionLabels.uptime}</TabsTrigger>
              <TabsTrigger value="downtime">{sectionLabels.downtime}</TabsTrigger>
              <TabsTrigger value="creditsAdded">{sectionLabels.creditsAdded}</TabsTrigger>
              <TabsTrigger value="activity">{sectionLabels.activity}</TabsTrigger>
            </TabsList>

            <TabsContent value="uptime" className="mt-4">
              <EmailSection
                sectionKey="uptime"
                sectionData={emailData.sections.uptime}
                sectionLabel={sectionLabels.uptime}
                isEnhancing={isEnhancing.uptime}
                isSending={isSending}
                onContentChange={handleSectionContentChange}
                onReset={handleResetSection}
                onEnhance={handleEnhanceSection}
              />
            </TabsContent>

            <TabsContent value="downtime" className="mt-4">
              <EmailSection
                sectionKey="downtime"
                sectionData={emailData.sections.downtime}
                sectionLabel={sectionLabels.downtime}
                isEnhancing={isEnhancing.downtime}
                isSending={isSending}
                onContentChange={handleSectionContentChange}
                onReset={handleResetSection}
                onEnhance={handleEnhanceSection}
              />
            </TabsContent>

            <TabsContent value="creditsAdded" className="mt-4">
              <EmailSection
                sectionKey="creditsAdded"
                sectionData={emailData.sections.creditsAdded}
                sectionLabel={sectionLabels.creditsAdded}
                isEnhancing={isEnhancing.creditsAdded}
                isSending={isSending}
                onContentChange={handleSectionContentChange}
                onReset={handleResetSection}
                onEnhance={handleEnhanceSection}
              />
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              <EmailSection
                sectionKey="activity"
                sectionData={emailData.sections.activity}
                sectionLabel={sectionLabels.activity}
                isEnhancing={isEnhancing.activity}
                isSending={isSending}
                onContentChange={handleSectionContentChange}
                onReset={handleResetSection}
                onEnhance={handleEnhanceSection}
              />
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="flex justify-between flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Cancel
          </Button>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleSendToIndividual}
              disabled={isSending || !emailData.subject.trim() || !hasContent() || !individualEmail.trim()}
              variant="secondary"
              className="flex items-center gap-2"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Send to Individual
                </>
              )}
            </Button>
            {selectedCount > 0 && (
              <Button
                onClick={() => handleSend(true)}
                disabled={isSending || !emailData.subject.trim() || !hasContent()}
                variant="default"
                className="flex items-center gap-2"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Send to Selected ({selectedCount})
                  </>
                )}
              </Button>
            )}
            <Button
              onClick={() => handleSend(false)}
              disabled={isSending || !emailData.subject.trim() || !hasContent()}
              className="flex items-center gap-2"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Send to All
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
