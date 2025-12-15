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
import { createUptimeHtmlTemplate, createDowntimeHtmlTemplate, createCreditsHtmlTemplate, createUpdatesHtmlTemplate, createInactiveHtmlTemplate, createPartialHtmlTemplate, convertTextToHtml } from '@/lib/email-templates';

interface EmailCustomizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendEmail: (emailData: EmailData, selectedOnly?: boolean) => Promise<void>;
  onSendToIndividual: (emailData: EmailData, emailAddress: string) => Promise<void>;
  isSending: boolean;
  selectedCount?: number;
  initialTab?: EmailSectionKey;
  overrideContent?: {
    section: EmailSectionKey;
    subject?: string;
    textContent: string;
  } | null;
}

export type EmailSectionKey = 'uptime' | 'downtime' | 'creditsAdded' | 'activity' | 'updates';

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

  updates: `Grand Black Friday Sale!

Thank you for being a part of the Helium AI community. Your trust and continued usage mean a great deal to us, and we are committed to delivering even more value to you in the coming months.

We are pleased to extend an exclusive annual offer for our current users.

For USD 149.99 per year, you will receive:
- 5000 credits every month
- 24,000 bonus credits for the year
- Full access to Helium AI, including A.I.M, Helix, Orbit, Vault, workflow automation, content generation, and more

This plan is designed to give you a full year of uninterrupted access to Helium AI, with sufficient credits to run your day to day work, experiments, and projects without worrying about frequent top-ups.

If you would like to activate this annual plan, please click the link below or log in to your Helium account and proceed to the billing section:

[Activate the USD 149.99 Annual Plan]

If you have any questions regarding the plan, credits, or your existing account, simply reply to this email and our team will be happy to assist you.

Thank you once again for choosing Helium AI. We look forward to supporting you as you scale your work with a single, intelligent AI platform.

Warm regards,
The Helium Team`,
};

const activitySubTemplates = {
  partial: `Hi there! 👋

We've been thinking about you and noticed you haven't been as active on Helium recently. We completely understand that life gets busy, but we wanted to reach out because we genuinely miss having you as part of our community!

We think you might love exploring some of the exciting new features we've added since you last visited.

Here's what's new that might interest you:
✨ Enhanced AI capabilities with better responses
🎨 New creative tools for your projects
📊 Improved analytics to track your progress
🤝 A more vibrant community of creators

We believe in your potential and would love to see you back in action.

Remember, every great journey has its pauses - and that's perfectly okay! When you're ready to continue, we'll be here with open arms and exciting new possibilities.

Take care, and we hope to see you back soon! 🌟

With warm regards,
The Helium Team 💙`,

  inactive: `Hello,

We hope this message finds you well. We've noticed you haven't been active on Helium lately, and we wanted to reach out - not to pressure you, but simply to let you know that you're missed and valued.

We want you to know that there's absolutely no rush to return. Life has its seasons, and we understand that sometimes you need to step back and focus on other things.

When you're ready (and only when you're ready), we'll be here with:
🌱 A welcoming community that understands
☕ A platform that adapts to your pace
💡 Tools that grow with your needs
🤗 Support without any pressure

We believe in the power of taking breaks and coming back when the time feels right. Your journey with AI and creativity is uniquely yours, and we respect that completely.

Whether you return tomorrow, next month, or next year, know that you'll always have a place here at Helium. We're not going anywhere, and we'll be excited to welcome you back whenever you're ready.

With understanding and care,
The Helium Team`
};

const createDefaultEmailData = (logoBase64?: string | null, uptimeBodyBase64?: string | null, downtimeBodyBase64?: string | null, creditsBodyBase64?: string | null, updatesBodyBase64?: string | null): EmailData => {
  const sections: { [key in EmailSectionKey]: EmailSectionData } = {
    uptime: {
      textContent: defaultSectionContent.uptime,
      htmlContent: createUptimeHtmlTemplate({
        logoBase64: logoBase64 || null,
        uptimeBodyBase64: uptimeBodyBase64 || null,
        textContent: defaultSectionContent.uptime,
        useCid: false, // Use base64 for preview
      }),
    },
    downtime: {
      textContent: defaultSectionContent.downtime,
      htmlContent: createDowntimeHtmlTemplate({
        logoBase64: logoBase64 || null,
        downtimeBodyBase64: downtimeBodyBase64 || uptimeBodyBase64 || null, // Use downtime image if available, otherwise fallback to uptime image
        textContent: defaultSectionContent.downtime,
        useCid: false, // Use base64 for preview
      }),
    },
    creditsAdded: {
      textContent: defaultSectionContent.creditsAdded,
      htmlContent: createCreditsHtmlTemplate({
        logoBase64: logoBase64 || null,
        creditsBodyBase64: creditsBodyBase64 || null,
        textContent: defaultSectionContent.creditsAdded,
        useCid: false, // Use base64 for preview
      }),
    },
    activity: {
      textContent: defaultSectionContent.activity,
      htmlContent: convertTextToHtml(defaultSectionContent.activity),
    },
    updates: {
      textContent: defaultSectionContent.updates,
      htmlContent: createUpdatesHtmlTemplate({
        logoBase64: logoBase64 || null,
        updatesBodyBase64: updatesBodyBase64 || null,
        textContent: defaultSectionContent.updates,
        useCid: false, // Use base64 for preview
      }),
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

        <TabsContent value="preview" className="space-y-4 min-w-0">
          <div className="space-y-2">
            <Label>Email Preview (HTML Template)</Label>
            <div className="border rounded-lg min-h-[250px] overflow-hidden overflow-x-auto">
              <div 
                className="prose max-w-none break-words"
                dangerouslySetInnerHTML={{ __html: sectionData.htmlContent }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Plain Text Content (as it will appear in the email)</Label>
            <div className="border rounded-lg p-4 min-h-[150px] bg-muted/50 overflow-auto">
              <pre className="whitespace-pre-wrap font-mono text-sm break-words">
                {sectionData.textContent || '(No content)'}
              </pre>
            </div>
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
  updates: 'Updates',
};

export function EmailCustomizationDialog({ 
  open, 
  onOpenChange, 
  onSendEmail, 
  onSendToIndividual,
  isSending,
  selectedCount = 0,
  initialTab = 'uptime',
  overrideContent = null
}: EmailCustomizationDialogProps) {
  const [emailImages, setEmailImages] = useState<{ 
    logo: string | null; 
    uptimeBody: string | null; 
    downtimeBody: string | null; 
    creditsBody: string | null; 
    updatesBody: string | null;
    partialBody: string | null;
    inactiveBody: string | null;
  }>({
    logo: null,
    uptimeBody: null,
    downtimeBody: null,
    creditsBody: null,
    updatesBody: null,
    partialBody: null,
    inactiveBody: null,
  });
  const [emailData, setEmailData] = useState<EmailData>(createDefaultEmailData());
// ... existing code ...
  const [individualEmail, setIndividualEmail] = useState('');
  const [activeTab, setActiveTab] = useState<EmailSectionKey>(initialTab);
  const [activitySubTab, setActivitySubTab] = useState<'partial' | 'inactive'>('partial');
  const [isEnhancing, setIsEnhancing] = useState<Record<EmailSectionKey, boolean>>({
    uptime: false,
    downtime: false,
    creditsAdded: false,
    activity: false,
    updates: false,
  });

  // Apply override content when provided
  useEffect(() => {
    if (open && overrideContent) {
      setActiveTab(overrideContent.section);
      
      // Auto-detect sub-tab based on content if it's the activity section
      let newSubTab = activitySubTab;
      if (overrideContent.section === 'activity') {
        if (overrideContent.subject?.toLowerCase().includes('miss you')) {
          newSubTab = 'partial';
          setActivitySubTab('partial');
        } else if (overrideContent.subject?.toLowerCase().includes('ready')) {
          newSubTab = 'inactive';
          setActivitySubTab('inactive');
        }
      }
      
      setEmailData(prev => {
        const newData = { ...prev };
        
        if (overrideContent.subject) {
          newData.subject = overrideContent.subject;
        }
        
        let htmlContent;
        if (overrideContent.section === 'activity') {
           htmlContent = newSubTab === 'partial' 
              ? createPartialHtmlTemplate({
                  logoBase64: emailImages.logo,
                  partialBodyBase64: emailImages.partialBody,
                  textContent: overrideContent.textContent,
                  useCid: false
                })
              : createInactiveHtmlTemplate({
                  logoBase64: emailImages.logo,
                  inactiveBodyBase64: emailImages.inactiveBody,
                  textContent: overrideContent.textContent,
                  useCid: false
                });
        } else {
           htmlContent = convertTextToHtml(overrideContent.textContent);
        }

        newData.sections = {
          ...newData.sections,
          [overrideContent.section]: {
            textContent: overrideContent.textContent,
            htmlContent
          }
        };
        
        return newData;
      });
    } else if (open && !overrideContent) {
      // If no override, ensure we respect initialTab if provided, or default to uptime
      // But don't reset content if it was edited
      if (initialTab) {
        setActiveTab(initialTab);
      }
    }
  }, [open, overrideContent, initialTab, emailImages]);

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
              updatesBody: data.images.updatesBody,
              partialBody: data.images.partialBody,
              inactiveBody: data.images.inactiveBody,
            });
            // Update Uptime, Downtime, Credits, and Updates sections with HTML templates containing base64 images
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
                    useCid: false, // Use base64 for preview
                  }),
                },
                downtime: {
                  textContent: prev.sections.downtime.textContent,
                  htmlContent: createDowntimeHtmlTemplate({
                    logoBase64: data.images.logo,
                    downtimeBodyBase64: data.images.downtimeBody || data.images.uptimeBody, // Use downtime image if available, otherwise fallback to uptime image
                    textContent: prev.sections.downtime.textContent,
                    useCid: false, // Use base64 for preview
                  }),
                },
                creditsAdded: {
                  textContent: prev.sections.creditsAdded.textContent,
                  htmlContent: createCreditsHtmlTemplate({
                    logoBase64: data.images.logo,
                    creditsBodyBase64: data.images.creditsBody,
                    textContent: prev.sections.creditsAdded.textContent,
                    useCid: false, // Use base64 for preview
                  }),
                },
                updates: {
                  textContent: prev.sections.updates.textContent,
                  htmlContent: createUpdatesHtmlTemplate({
                    logoBase64: data.images.logo,
                    updatesBodyBase64: data.images.updatesBody,
                    textContent: prev.sections.updates.textContent,
                    useCid: false, // Use base64 for preview
                  }),
                },
                activity: {
                  // Initialize with Partial content as it is the default sub-tab
                  textContent: (defaultSectionContent as any).partial || prev.sections.activity.textContent,
                  htmlContent: createPartialHtmlTemplate({
                    logoBase64: data.images.logo,
                    partialBodyBase64: data.images.partialBody,
                    textContent: (defaultSectionContent as any).partial || prev.sections.activity.textContent,
                    useCid: false
                  })
                }
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

  const handleActivitySubTabChange = (subTab: 'partial' | 'inactive') => {
    setActivitySubTab(subTab);
    
    // Update content to default for the selected sub-tab
    const defaultText = activitySubTemplates[subTab];
    const defaultSubject = subTab === 'partial' 
      ? 'We miss you! Come back to Helium' 
      : 'We\'re here when you\'re ready';
    
    handleSubjectChange(defaultSubject);
    
    setEmailData(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        activity: {
          textContent: defaultText,
          htmlContent: subTab === 'partial' 
            ? createPartialHtmlTemplate({
                logoBase64: emailImages.logo,
                partialBodyBase64: emailImages.partialBody,
                textContent: defaultText,
                useCid: false
              })
            : createInactiveHtmlTemplate({
                logoBase64: emailImages.logo,
                inactiveBodyBase64: emailImages.inactiveBody,
                textContent: defaultText,
                useCid: false
              })
        }
      }
    }));
  };

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
              useCid: false, // Use base64 for preview
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
              useCid: false, // Use base64 for preview
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
              useCid: false, // Use base64 for preview
            }),
          },
        },
      }));
    } else if (sectionKey === 'updates') {
      // For Updates section, use the updates HTML template with base64 images
      setEmailData(prev => ({
        ...prev,
        sections: {
          ...prev.sections,
          [sectionKey]: {
            textContent,
            htmlContent: createUpdatesHtmlTemplate({
              logoBase64: emailImages.logo,
              updatesBodyBase64: emailImages.updatesBody,
              textContent,
              useCid: false, // Use base64 for preview
            }),
          },
        },
      }));
    } else if (sectionKey === 'activity') {
      // For Activity section, use the appropriate template based on sub-tab
      setEmailData(prev => ({
        ...prev,
        sections: {
          ...prev.sections,
          [sectionKey]: {
            textContent,
            htmlContent: activitySubTab === 'partial'
              ? createPartialHtmlTemplate({
                  logoBase64: emailImages.logo,
                  partialBodyBase64: emailImages.partialBody,
                  textContent,
                  useCid: false,
                })
              : createInactiveHtmlTemplate({
                  logoBase64: emailImages.logo,
                  inactiveBodyBase64: emailImages.inactiveBody,
                  textContent,
                  useCid: false,
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
              useCid: false, // Use base64 for preview
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
              useCid: false, // Use base64 for preview
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
              useCid: false, // Use base64 for preview
            }),
          },
        },
      }));
    } else if (sectionKey === 'updates') {
      // Special handling for Updates section - use HTML template
      setEmailData(prev => ({
        ...prev,
        sections: {
          ...prev.sections,
          [sectionKey]: {
            textContent: defaultContent,
            htmlContent: createUpdatesHtmlTemplate({
              logoBase64: emailImages.logo,
              updatesBodyBase64: emailImages.updatesBody,
              textContent: defaultContent,
              useCid: false, // Use base64 for preview
            }),
          },
        },
      }));
    } else if (sectionKey === 'activity') {
      // For Activity section, reset using current sub-tab
      const defaultText = activitySubTemplates[activitySubTab] || defaultSectionContent.activity;
      setEmailData(prev => ({
        ...prev,
        sections: {
          ...prev.sections,
          [sectionKey]: {
            textContent: defaultText,
            htmlContent: activitySubTab === 'partial'
              ? createPartialHtmlTemplate({
                  logoBase64: emailImages.logo,
                  partialBodyBase64: emailImages.partialBody,
                  textContent: defaultText,
                  useCid: false,
                })
              : createInactiveHtmlTemplate({
                  logoBase64: emailImages.logo,
                  inactiveBodyBase64: emailImages.inactiveBody,
                  textContent: defaultText,
                  useCid: false,
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
    setEmailData(createDefaultEmailData(emailImages.logo, emailImages.uptimeBody, emailImages.downtimeBody, emailImages.creditsBody, emailImages.updatesBody));
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
      
      // Update HTML content based on section type
      if (sectionKey === 'uptime') {
        setEmailData(prev => ({
          ...prev,
          sections: {
            ...prev.sections,
            [sectionKey]: {
              textContent: enhancedContent,
              htmlContent: createUptimeHtmlTemplate({
                logoBase64: emailImages.logo,
                uptimeBodyBase64: emailImages.uptimeBody,
                textContent: enhancedContent,
                useCid: false, // Use base64 for preview
              }),
            },
          },
        }));
      } else if (sectionKey === 'downtime') {
        setEmailData(prev => ({
          ...prev,
          sections: {
            ...prev.sections,
            [sectionKey]: {
              textContent: enhancedContent,
              htmlContent: createDowntimeHtmlTemplate({
                logoBase64: emailImages.logo,
                downtimeBodyBase64: emailImages.downtimeBody || emailImages.uptimeBody,
                textContent: enhancedContent,
                useCid: false, // Use base64 for preview
              }),
            },
          },
        }));
      } else if (sectionKey === 'creditsAdded') {
        setEmailData(prev => ({
          ...prev,
          sections: {
            ...prev.sections,
            [sectionKey]: {
              textContent: enhancedContent,
              htmlContent: createCreditsHtmlTemplate({
                logoBase64: emailImages.logo,
                creditsBodyBase64: emailImages.creditsBody,
                textContent: enhancedContent,
                useCid: false, // Use base64 for preview
              }),
            },
          },
        }));
      } else if (sectionKey === 'updates') {
        setEmailData(prev => ({
          ...prev,
          sections: {
            ...prev.sections,
            [sectionKey]: {
              textContent: enhancedContent,
              htmlContent: createUpdatesHtmlTemplate({
                logoBase64: emailImages.logo,
                updatesBodyBase64: emailImages.updatesBody,
                textContent: enhancedContent,
                useCid: false, // Use base64 for preview
              }),
            },
          },
        }));
      } else if (sectionKey === 'activity') {
        setEmailData(prev => ({
          ...prev,
          sections: {
            ...prev.sections,
            [sectionKey]: {
              textContent: enhancedContent,
              htmlContent: activitySubTab === 'partial'
                ? createPartialHtmlTemplate({
                    logoBase64: emailImages.logo,
                    partialBodyBase64: emailImages.partialBody,
                    textContent: enhancedContent,
                    useCid: false,
                  })
                : createInactiveHtmlTemplate({
                    logoBase64: emailImages.logo,
                    inactiveBodyBase64: emailImages.inactiveBody,
                    textContent: enhancedContent,
                    useCid: false,
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
              textContent: enhancedContent,
              htmlContent: convertTextToHtml(enhancedContent),
            },
          },
        }));
      }
    } catch (error) {
      console.error('Error enhancing email content:', error);
    } finally {
      setIsEnhancing(prev => ({ ...prev, [sectionKey]: false }));
    }
  };

  // Get the active section's content for sending
  // Note: When sending, regenerate HTML with CID references for SMTP attachments
  // When previewing, use base64 data URIs
  const getActiveSectionContent = (forSending: boolean = false): { textContent: string; htmlContent: string } => {
    const section = emailData.sections[activeTab];
    
    // For uptime section, regenerate HTML with appropriate image mode
    if (activeTab === 'uptime') {
      const regeneratedHtml = createUptimeHtmlTemplate({
        logoBase64: emailImages.logo,
        uptimeBodyBase64: emailImages.uptimeBody,
        textContent: section.textContent,
        useCid: forSending, // Use CID when sending, base64 for preview
      });
      return {
        textContent: section.textContent,
        htmlContent: regeneratedHtml,
      };
    } else if (activeTab === 'downtime') {
      // For downtime section, regenerate HTML with appropriate image mode
      const regeneratedHtml = createDowntimeHtmlTemplate({
        logoBase64: emailImages.logo,
        downtimeBodyBase64: emailImages.downtimeBody || emailImages.uptimeBody, // Use downtime image if available, otherwise fallback to uptime image
        textContent: section.textContent,
        useCid: forSending, // Use CID when sending, base64 for preview
      });
      return {
        textContent: section.textContent,
        htmlContent: regeneratedHtml,
      };
    } else if (activeTab === 'creditsAdded') {
      // For credits added section, regenerate HTML with appropriate image mode
      const regeneratedHtml = createCreditsHtmlTemplate({
        logoBase64: emailImages.logo,
        creditsBodyBase64: emailImages.creditsBody,
        textContent: section.textContent,
        useCid: forSending, // Use CID when sending, base64 for preview
      });
      return {
        textContent: section.textContent,
        htmlContent: regeneratedHtml,
      };
    } else if (activeTab === 'updates') {
      // For updates section, regenerate HTML with appropriate image mode
      const regeneratedHtml = createUpdatesHtmlTemplate({
        logoBase64: emailImages.logo,
        updatesBodyBase64: emailImages.updatesBody,
        textContent: section.textContent,
        useCid: forSending, // Use CID when sending, base64 for preview
      });
      return {
        textContent: section.textContent,
        htmlContent: regeneratedHtml,
      };
    } else if (activeTab === 'activity') {
      // For activity section, regenerate HTML with appropriate image mode based on sub-tab
      const regeneratedHtml = activitySubTab === 'partial'
        ? createPartialHtmlTemplate({
            logoBase64: emailImages.logo,
            partialBodyBase64: emailImages.partialBody,
            textContent: section.textContent,
            useCid: forSending,
          })
        : createInactiveHtmlTemplate({
            logoBase64: emailImages.logo,
            inactiveBodyBase64: emailImages.inactiveBody,
            textContent: section.textContent,
            useCid: forSending,
          });
      return {
        textContent: section.textContent,
        htmlContent: regeneratedHtml,
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
    const activeContent = getActiveSectionContent(true); // Use CID for sending
    const emailDataToSend: EmailData = {
      ...emailData,
      textContent: activeContent.textContent,
      htmlContent: activeContent.htmlContent,
    };
    await onSendEmail(emailDataToSend, selectedOnly);
  };

  const handleSendToIndividual = async () => {
    if (!individualEmail.trim()) {
      console.error('Individual email address is required');
      return;
    }
    
    const activeContent = getActiveSectionContent(true); // Use CID for sending
    
    // Ensure we have valid content
    if (!activeContent.textContent || activeContent.textContent.trim().length === 0) {
      console.error('Missing text content for active section:', {
        activeTab,
        textContent: activeContent.textContent,
        sectionTextContent: emailData.sections[activeTab]?.textContent,
      });
      return;
    }
    
    if (!activeContent.htmlContent || activeContent.htmlContent.trim().length === 0) {
      console.error('Missing HTML content for active section:', {
        activeTab,
        htmlContent: activeContent.htmlContent ? 'exists but empty' : 'missing',
      });
      return;
    }
    
    if (!emailData.subject || emailData.subject.trim().length === 0) {
      console.error('Email subject is required');
      return;
    }
    
    const emailDataToSend: EmailData = {
      ...emailData,
      subject: emailData.subject.trim(),
      textContent: activeContent.textContent.trim(),
      htmlContent: activeContent.htmlContent.trim(),
    };
    
    await onSendToIndividual(emailDataToSend, individualEmail.trim());
  };

  // Check if the active section has content
  const hasContent = () => {
    const activeSection = emailData.sections[activeTab];
    return activeSection.textContent.trim().length > 0;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-x-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
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

        <div className="flex-1 overflow-y-auto px-6 py-4">
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
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="uptime">{sectionLabels.uptime}</TabsTrigger>
              <TabsTrigger value="downtime">{sectionLabels.downtime}</TabsTrigger>
              <TabsTrigger value="creditsAdded">{sectionLabels.creditsAdded}</TabsTrigger>
              <TabsTrigger value="activity">{sectionLabels.activity}</TabsTrigger>
              <TabsTrigger value="updates">{sectionLabels.updates}</TabsTrigger>
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
              <div className="flex space-x-4 mb-4">
                <Button 
                  variant={activitySubTab === 'partial' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleActivitySubTabChange('partial')}
                >
                  Partial Users
                </Button>
                <Button 
                  variant={activitySubTab === 'inactive' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleActivitySubTabChange('inactive')}
                >
                  Inactive Users
                </Button>
              </div>
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

            <TabsContent value="updates" className="mt-4">
              <EmailSection
                sectionKey="updates"
                sectionData={emailData.sections.updates}
                sectionLabel={sectionLabels.updates}
                isEnhancing={isEnhancing.updates}
                isSending={isSending}
                onContentChange={handleSectionContentChange}
                onReset={handleResetSection}
                onEnhance={handleEnhanceSection}
              />
            </TabsContent>
          </Tabs>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t shrink-0 flex justify-between flex-wrap gap-2">
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
