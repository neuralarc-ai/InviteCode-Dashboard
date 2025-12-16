"use client"

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Mail } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createPartialHtmlTemplate, convertTextToHtml } from '@/lib/email-templates';
import type { EmailData } from './email-customization-dialog';

interface WelcomeEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendEmail: (emailData: EmailData, selectedOnly?: boolean) => Promise<void>;
  isSending: boolean;
  selectedCount: number;
}

export function WelcomeEmailDialog({
  open,
  onOpenChange,
  onSendEmail,
  isSending,
  selectedCount
}: WelcomeEmailDialogProps) {
  const [subject, setSubject] = useState("Welcome to the Helium Community! 🌟");
  const [content, setContent] = useState(`Hi there! 👋

We noticed you've been active on Helium recently, and we just wanted to say a huge thank you for being part of our community! We're thrilled to see you exploring and creating with us.

Whether you're just getting started or you're already building amazing things, we're here to support your journey. We hope you're enjoying the experience so far.

Here are a few quick tips to help you get the most out of Helium:
✨ Check out our latest features in the dashboard
📚 Explore our documentation for advanced tips
🤝 Join our community forums to connect with other creators

If you ever have any questions, feedback, or just want to share what you're working on, reply to this email - we'd love to hear from you!

Keep creating amazing things! 🚀

Warmly,
The Helium Team 💙`);

  const [emailImages, setEmailImages] = useState<{
    logo: string | null;
    partialBody: string | null;
    pattern4: string | null;
  }>({
    logo: null,
    partialBody: null,
    pattern4: null,
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
              partialBody: data.images.partialBody,
              pattern4: data.images.pattern4,
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch email images:', error);
      }
    };

    if (open) {
      fetchImages();
    }
  }, [open]);

  const handleSend = () => {
    // Generate HTML using the template
    const htmlContent = createPartialHtmlTemplate({
      logoBase64: emailImages.logo,
      partialBodyBase64: emailImages.partialBody,
      pattern4Base64: emailImages.pattern4,
      textContent: content,
      useCid: true // Use CID for sending
    });

    onSendEmail({
      subject,
      textContent: content,
      // For compatibility with the existing email sending logic which expects sections
      sections: {
        activity: {
            textContent: content,
            htmlContent
        },
        uptime: { textContent: '', htmlContent: '' },
        downtime: { textContent: '', htmlContent: '' },
        creditsAdded: { textContent: '', htmlContent: '' },
        updates: { textContent: '', htmlContent: '' }
      },
      htmlContent
    }, true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Send Welcome Email</DialogTitle>
          <DialogDescription>
            Send a welcome message to {selectedCount} active users.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="content">Message</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="h-[300px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send Welcome Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
