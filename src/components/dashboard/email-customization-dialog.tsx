"use client"

import { useState } from 'react';
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

interface EmailCustomizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendEmail: (emailData: EmailData, selectedOnly?: boolean) => Promise<void>;
  onSendToIndividual: (emailData: EmailData, emailAddress: string) => Promise<void>;
  isSending: boolean;
  selectedCount?: number;
}

interface EmailData {
  subject: string;
  textContent: string;
  htmlContent: string;
}

// Function to convert plain text to HTML with background color
const convertTextToHtml = (textContent: string): string => {
  // Split by double newlines to separate the heading from the content
  const parts = textContent.split(/\n\n+/);
  const firstLine = parts[0]?.trim() || '';
  const restOfContent = parts.slice(1).join('\n\n');
  
  // Convert the rest of the content: double newlines become paragraph breaks, single newlines become line breaks
  let htmlContent = '';
  if (restOfContent.trim()) {
    htmlContent = restOfContent
      .replace(/\n\n+/g, '</p><p>')
      .replace(/\n/g, '<br>');
  }
  
  return `<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #CFEBD5;">
    <h2 style="font-size: 24px; font-weight: bold; margin-bottom: 16px; color: #1a1a1a;">${firstLine}</h2>
    ${htmlContent ? `<p>${htmlContent}</p>` : ''}
  </body>
</html>`;
};

const defaultTextContent = `Scheduled Downtime: Helium will be unavailable for 1 hour

Greetings from Helium,

We wanted to let you know that Helium will be temporarily unavailable for 1 hour as we perform scheduled maintenance and upgrades.

During this window, you won't be able to access Helium. Once the maintenance is complete, you'll be able to log back in and experience the platform as usual.

We appreciate your patience and understanding as we work to make Helium even better for you.

Thanks,
The Helium Team`;

const defaultEmailData: EmailData = {
  subject: 'Scheduled Downtime: Helium will be unavailable for 1 hour',
  textContent: defaultTextContent,
  htmlContent: convertTextToHtml(defaultTextContent)
};

export function EmailCustomizationDialog({ 
  open, 
  onOpenChange, 
  onSendEmail, 
  onSendToIndividual,
  isSending,
  selectedCount = 0
}: EmailCustomizationDialogProps) {
  const [emailData, setEmailData] = useState<EmailData>(defaultEmailData);
  const [showPreview, setShowPreview] = useState(false);
  const [individualEmail, setIndividualEmail] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);

  const handleSubjectChange = (subject: string) => {
    setEmailData(prev => ({ ...prev, subject }));
  };

  const handleTextContentChange = (textContent: string) => {
    setEmailData(prev => ({ 
      ...prev, 
      textContent,
      htmlContent: convertTextToHtml(textContent)
    }));
  };

  const handleSend = async (selectedOnly: boolean = false) => {
    await onSendEmail(emailData, selectedOnly);
  };

  const handleSendToIndividual = async () => {
    if (individualEmail.trim()) {
      await onSendToIndividual(emailData, individualEmail.trim());
    }
  };

  const resetToDefault = () => {
    setEmailData(defaultEmailData);
  };

  const enhanceEmailContent = async () => {
    setIsEnhancing(true);
    try {
      // Simulate AI enhancement - in a real implementation, this would call an AI service
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const enhancedContent = enhanceTextContent(emailData.textContent);
      setEmailData(prev => ({
        ...prev,
        textContent: enhancedContent,
        htmlContent: convertTextToHtml(enhancedContent)
      }));
    } catch (error) {
      console.error('Error enhancing email content:', error);
    } finally {
      setIsEnhancing(false);
    }
  };

  const enhanceTextContent = (text: string): string => {
    // Simple enhancement logic - in a real implementation, this would use AI
    return text
      .replace(/Greetings from Helium,/g, 'Dear Valued Helium User,')
      .replace(/We wanted to let you know/g, 'We are writing to inform you')
      .replace(/temporarily unavailable/g, 'temporarily offline')
      .replace(/won't be able to access/g, 'will be unable to access')
      .replace(/Once the maintenance is complete/g, 'Upon completion of the maintenance')
      .replace(/log back in/g, 'regain access')
      .replace(/We appreciate your patience/g, 'Thank you for your understanding and patience')
      .replace(/as we work to make Helium even better/g, 'as we continue to enhance Helium\'s capabilities')
      .replace(/Thanks,/g, 'Best regards,')
      .replace(/The Helium Team/g, 'The Helium Development Team');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Customize Email Content
          </DialogTitle>
          <DialogDescription>
            Customize the email subject and content before sending. You can send to all users or only selected users.
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

          {/* Content Tabs */}
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
                  onClick={() => setShowPreview(!showPreview)}
                  disabled={isSending}
                >
                  {showPreview ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Hide Preview
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Show Preview
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetToDefault}
                  disabled={isSending}
                >
                  Reset to Default
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={enhanceEmailContent}
                  disabled={isEnhancing || isSending || !emailData.textContent.trim()}
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
              <Label htmlFor="text-content">Plain Text Content</Label>
              <Textarea
                id="text-content"
                value={emailData.textContent}
                onChange={(e) => handleTextContentChange(e.target.value)}
                placeholder="Enter plain text content..."
                className="min-h-[300px] font-mono text-sm w-full"
                disabled={isSending}
              />
            </TabsContent>

            <TabsContent value="preview" className="space-y-2 min-w-0">
              <Label>Email Preview</Label>
              <div className="border rounded-lg min-h-[300px] overflow-hidden overflow-x-auto">
                <div className="space-y-2 mb-4 p-4 bg-gray-100 min-w-0">
                  <div className="text-sm text-gray-600 break-words">
                    <strong>Subject:</strong> {emailData.subject}
                  </div>
                </div>
                <div 
                  className="prose max-w-none break-words"
                  dangerouslySetInnerHTML={{ __html: emailData.htmlContent }}
                />
              </div>
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
              disabled={isSending || !emailData.subject.trim() || !emailData.textContent.trim() || !individualEmail.trim()}
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
                disabled={isSending || !emailData.subject.trim() || !emailData.textContent.trim()}
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
              disabled={isSending || !emailData.subject.trim() || !emailData.textContent.trim()}
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
