'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Copy, Check, Mail, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { saveGeneratedCodesAction, sendInviteEmailAction } from '@/lib/actions';
import { usePreviewCodes } from '@/contexts/preview-codes-context';

interface GeneratedCode {
  code: string;
  maxUses: number;
  emailSentTo?: string[];
}

interface GenerateCodesDialogProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  prefilledEmail?: string;
  prefilledName?: string;
  userId?: string;
  userName?: string;
  companyName?: string;
}

export function GenerateCodesDialog({ 
  isOpen: externalIsOpen, 
  onOpenChange: externalOnOpenChange,
  prefilledEmail = '',
  prefilledName = '',
  userId,
  userName,
  companyName,
}: GenerateCodesDialogProps = {}) {
  const [internalIsOpen, setInternalIsOpen] = React.useState(false);
  const [generatedCode, setGeneratedCode] = React.useState<GeneratedCode | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [copiedCode, setCopiedCode] = React.useState(false);
  const [email, setEmail] = React.useState(prefilledEmail);
  const [firstName, setFirstName] = React.useState(prefilledName);
  const [isSendingEmail, setIsSendingEmail] = React.useState(false);
  const { toast } = useToast();
  const { addPreviewCodes, clearPreviewCodes } = usePreviewCodes();

  // Use external state if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = externalOnOpenChange || setInternalIsOpen;

  const generatePreviewCode = React.useCallback(() => {
    setIsGenerating(true);
    
    // Generate 7-digit alphanumeric code starting with NA
    const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    const code = `NA${randomPart}`;
    
    const newCode: GeneratedCode = {
      code,
      maxUses: 1, // Fixed to 1 as per database constraint
      emailSentTo: [],
    };
    
    setGeneratedCode(newCode);
    addPreviewCodes([newCode]); // Add to global preview context
    setIsGenerating(false);
  }, [addPreviewCodes]);

  // Update email and firstName when prefilled values change
  React.useEffect(() => {
    if (prefilledEmail) {
      setEmail(prefilledEmail);
    }
    if (prefilledName) {
      setFirstName(prefilledName);
    }
  }, [prefilledEmail, prefilledName]);

  // Auto-generate code when dialog opens
  React.useEffect(() => {
    if (isOpen && !generatedCode) {
      generatePreviewCode();
    }
  }, [isOpen, generatedCode, generatePreviewCode]);

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => {
        setCopiedCode(false);
      }, 2000);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to copy code',
      });
    }
  };

  const saveToDatabase = async () => {
    if (!generatedCode) return;
    
    try {
      const formData = new FormData();
      formData.append('codes', JSON.stringify([generatedCode]));
      
      const result = await saveGeneratedCodesAction(formData);
      
      if (result.success) {
        toast({
          title: 'Success!',
          description: result.message,
        });
        setIsOpen(false);
        setGeneratedCode(null);
        clearPreviewCodes(); // Clear preview codes after saving
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save code to database',
      });
    }
  };

  const sendEmail = async () => {
    if (!generatedCode || !email || !firstName) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please fill in all required fields',
      });
      return;
    }

    setIsSendingEmail(true);
    
    try {
      const formData = new FormData();
      // Use the action that also marks waitlist user as notified
      if (userId) formData.append('userId', userId);
      formData.append('userName', userName || firstName);
      formData.append('inviteCode', generatedCode.code);
      formData.append('email', email);
      if (companyName) formData.append('companyName', companyName);
      
      const result = await sendInviteEmailAction(formData);
      
      if (result.success) {
        toast({
          title: 'Email Sent!',
          description: result.message,
        });
        
        // Update the preview code to include the sent email
        if (generatedCode) {
          const currentEmails = generatedCode.emailSentTo || [];
          // Check if email already exists to prevent duplicates
          if (!currentEmails.includes(email)) {
            const updatedCode = {
              ...generatedCode,
              emailSentTo: [...currentEmails, email]
            };
            setGeneratedCode(updatedCode);
            addPreviewCodes([updatedCode]); // Keep preview with email until database updates
          }
        }
        
        // Clear form after sending
        setEmail('');
        setFirstName('');
        
        // Close dialog
        setIsOpen(false);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message,
        });
      }
      
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send email',
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const resetForm = () => {
    setGeneratedCode(null);
    setEmail('');
    setFirstName('');
    clearPreviewCodes(); // Clear preview codes when resetting
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) {
        resetForm();
      }
    }}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Generate Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Invite Code</DialogTitle>
          <DialogDescription>
            Generate a single 7-digit alphanumeric invite code starting with "NA". The code will expire in 7 days and be automatically saved to the database when an email is sent.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {isGenerating ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Generating code...</p>
            </div>
          ) : generatedCode ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-sm">
                  Code Generated
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetForm}
                  className="h-8"
                >
                  Generate New
                </Button>
              </div>
              
              <div className="border rounded-md p-4 bg-muted/50">
                <div className="flex items-center justify-between p-3 bg-background rounded border">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-lg font-medium">
                      {generatedCode.code}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      1 use
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyCode(generatedCode.code)}
                    className="h-8 w-8 p-0"
                  >
                    {copiedCode ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Email Form */}
              <div className="border rounded-md p-4 bg-muted/50">
                <h4 className="font-medium mb-3">Send Invitation Email</h4>
                <div className="grid gap-3">
                  <div className="grid grid-cols-4 items-center gap-2">
                    <Label htmlFor="firstName" className="text-sm">
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Enter first name"
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-2">
                    <Label htmlFor="email" className="text-sm">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email address"
                      className="col-span-3"
                    />
                  </div>
                </div>
                
                {/* Email Preview */}
                {firstName && email && generatedCode && (
                  <div className="mt-4">
                    <h5 className="text-sm font-medium mb-2">Email Preview</h5>
                    <div className="border rounded-md p-3 bg-background text-sm max-h-96 overflow-y-auto">
                      <div className="space-y-2">
                        <p><strong>To:</strong> {email}</p>
                        <p><strong>Subject:</strong> Welcome to Helium OS - Your Invitation is Here!</p>
                        <hr className="my-2" />
                        <div className="border rounded-md overflow-hidden">
                          <div 
                            className="p-4 text-sm"
                          >
                            <div 
                              className="bg-white/95 p-6 rounded-lg shadow-lg"
                              style={{ maxWidth: '500px', margin: '0 auto' }}
                            >
                              <h3 className="text-lg text-center mb-4 text-foreground">Welcome to Helium OS</h3>
                              <p className="text-muted-foreground mb-3">Dear {firstName},</p>
                              <p className="text-muted-foreground mb-3">
                                Congratulations! You have been selected to join Helium the OS for your business, our first-ever Public Beta experience for businesses. Your account has been credited with 1500 free Helium credits to explore and experience the power of Helium.
                              </p>
                              <div className="text-center my-4 p-4 bg-muted rounded-lg border-2 border-border">
                                <p className="text-foreground font-bold mb-2">Your Invite Code:</p>
                                <div className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-bold text-xl font-mono tracking-wider inline-block">
                                  {generatedCode.code}
                                </div>
                                <p className="text-muted-foreground text-sm mt-3">
                                  Use this code to activate your account at <a href="https://he2.ai" className="text-primary">https://he2.ai</a>
                                </p>
                              </div>
                              <p className="text-muted-foreground mb-3">
                                Helium is designed to be the operating system for business intelligence, giving you a single, seamless layer to connect data, decisions, and workflows. As this is our first public beta, you may notice minor bugs or quirks. If you do, your feedback will help us make Helium even better.
                              </p>
                              <p className="text-muted-foreground mb-3">
                                You are not just testing a product. You are helping shape the future of business intelligence.
                              </p>
                              <p className="text-muted-foreground mb-3">
                                Welcome to Helium OS. The future of work is here.
                              </p>
                              <p className="text-muted-foreground mb-3">
                                Cheers,<br />
                                Team Helium
                              </p>
                              <div className="text-center mt-4">
                                <a href="https://he2.ai" className="text-primary">https://he2.ai</a>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No code generated yet.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          {generatedCode ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetForm}>
                Generate New
              </Button>
              <Button 
                onClick={sendEmail} 
                disabled={isSendingEmail || !email || !firstName}
                className="flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                {isSendingEmail ? 'Sending...' : 'Send Email'}
              </Button>
              <Button onClick={saveToDatabase}>
                Save to Database
              </Button>
            </div>
          ) : (
            <Button onClick={generatePreviewCode} disabled={isGenerating}>
              {isGenerating ? 'Generating...' : 'Generate Code'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
