'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserPlus, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  onSuccess
}: CreateUserDialogProps) {
  // Required fields
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [fullName, setFullName] = React.useState('');
  const [workDescription, setWorkDescription] = React.useState('');
  const [planType, setPlanType] = React.useState<'seed' | 'edge' | 'quantum' | ''>('');
  const [accountType, setAccountType] = React.useState<'individual' | 'business' | ''>('');
  
  // Optional fields
  const [preferredName, setPreferredName] = React.useState('');
  const [personalReferences, setPersonalReferences] = React.useState('');
  const [avatarUrl, setAvatarUrl] = React.useState('');
  const [referralSource, setReferralSource] = React.useState('');
  const [consentGiven, setConsentGiven] = React.useState(false);
  const [consentDate, setConsentDate] = React.useState('');
  const [metadata, setMetadata] = React.useState('');
  
  // UI state
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const { toast } = useToast();

  // Reset form when dialog opens/closes
  React.useEffect(() => {
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

  // Validate email format
  const validateEmail = (emailValue: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailValue);
  };

  // Validate password strength
  const validatePassword = (passwordValue: string): { valid: boolean; message?: string } => {
    if (passwordValue.length < 6) {
      return { valid: false, message: 'Password must be at least 6 characters long' };
    }
    return { valid: true };
  };

  // Validate JSON format for metadata
  const validateMetadata = (metadataValue: string): { valid: boolean; message?: string } => {
    if (!metadataValue.trim()) {
      return { valid: true }; // Optional field
    }
    try {
      JSON.parse(metadataValue);
      return { valid: true };
    } catch {
      return { valid: false, message: 'Metadata must be valid JSON' };
    }
  };

  // Validate form
  const validateForm = (): boolean => {
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
  };

  // Get password strength indicator
  const getPasswordStrength = (passwordValue: string): { strength: 'weak' | 'medium' | 'strong'; color: string } => {
    if (passwordValue.length === 0) {
      return { strength: 'weak', color: 'bg-gray-300' };
    }
    if (passwordValue.length < 6) {
      return { strength: 'weak', color: 'bg-red-500' };
    }
    if (passwordValue.length < 10) {
      return { strength: 'medium', color: 'bg-yellow-500' };
    }
    return { strength: 'strong', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive",
      });
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
          // Should not happen due to validation, but handle gracefully
          parsedMetadata = {};
        }
      }

      const response = await fetch('/api/create-user', {
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
          emailConfirm: true, // Auto-confirm email
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: `User ${result.user?.email} created successfully!`,
        });
        onOpenChange(false);
        onSuccess?.();
      } else {
        // Handle specific error cases
        let errorMessage = result.message || "Failed to create user";
        
        if (response.status === 409) {
          errorMessage = "A user with this email address already exists";
        } else if (response.status === 400) {
          errorMessage = result.message || "Invalid input data";
        }

        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while creating the user",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create New User
          </DialogTitle>
          <DialogDescription>
            Create a new user in Supabase Auth with a complete profile. All required fields must be filled.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Authentication Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Authentication</h3>
            
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) {
                    setErrors({ ...errors, email: undefined });
                  }
                }}
                disabled={isSubmitting}
                required
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password (min 6 characters)"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) {
                      setErrors({ ...errors, password: undefined });
                    }
                  }}
                  disabled={isSubmitting}
                  required
                  className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.password}
                </p>
              )}
              {password && !errors.password && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${passwordStrength.color} transition-all`}
                        style={{ width: `${Math.min((password.length / 12) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground capitalize">
                      {passwordStrength.strength}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Password must be at least 6 characters long
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Profile Information Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Profile Information</h3>
            
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (errors.fullName) {
                    setErrors({ ...errors, fullName: undefined });
                  }
                }}
                disabled={isSubmitting}
                required
                className={errors.fullName ? 'border-red-500' : ''}
              />
              {errors.fullName && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.fullName}
                </p>
              )}
            </div>

            {/* Preferred Name */}
            <div className="space-y-2">
              <Label htmlFor="preferredName">Preferred Name (Optional)</Label>
              <Input
                id="preferredName"
                type="text"
                placeholder="John (defaults to full name if not provided)"
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                If not provided, the full name will be used as the preferred name.
              </p>
            </div>

            {/* Work Description */}
            <div className="space-y-2">
              <Label htmlFor="workDescription">Work Description *</Label>
              <Textarea
                id="workDescription"
                placeholder="Describe the user's work or role..."
                value={workDescription}
                onChange={(e) => {
                  setWorkDescription(e.target.value);
                  if (errors.workDescription) {
                    setErrors({ ...errors, workDescription: undefined });
                  }
                }}
                disabled={isSubmitting}
                required
                rows={3}
                className={errors.workDescription ? 'border-red-500' : ''}
              />
              {errors.workDescription && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.workDescription}
                </p>
              )}
            </div>

            {/* Personal References */}
            <div className="space-y-2">
              <Label htmlFor="personalReferences">Personal References (Optional)</Label>
              <Textarea
                id="personalReferences"
                placeholder="Any personal references or notes..."
                value={personalReferences}
                onChange={(e) => setPersonalReferences(e.target.value)}
                disabled={isSubmitting}
                rows={2}
              />
            </div>

            {/* Avatar URL */}
            <div className="space-y-2">
              <Label htmlFor="avatarUrl">Avatar URL (Optional)</Label>
              <Input
                id="avatarUrl"
                type="url"
                placeholder="https://example.com/avatar.jpg"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {/* Referral Source */}
            <div className="space-y-2">
              <Label htmlFor="referralSource">Referral Source (Optional)</Label>
              <Input
                id="referralSource"
                type="text"
                placeholder="How did this user find us?"
                value={referralSource}
                onChange={(e) => setReferralSource(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Account Settings Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Account Settings</h3>
            
            {/* Plan Type */}
            <div className="space-y-2">
              <Label htmlFor="planType">Plan Type *</Label>
              <Select
                value={planType}
                onValueChange={(value) => {
                  setPlanType(value as 'seed' | 'edge' | 'quantum');
                  if (errors.planType) {
                    setErrors({ ...errors, planType: undefined });
                  }
                }}
                disabled={isSubmitting}
                required
              >
                <SelectTrigger className={errors.planType ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select a plan type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="seed">Seed</SelectItem>
                  <SelectItem value="edge">Edge</SelectItem>
                  <SelectItem value="quantum">Quantum</SelectItem>
                </SelectContent>
              </Select>
              {errors.planType && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.planType}
                </p>
              )}
            </div>

            {/* Account Type */}
            <div className="space-y-2">
              <Label htmlFor="accountType">Account Type *</Label>
              <Select
                value={accountType}
                onValueChange={(value) => {
                  setAccountType(value as 'individual' | 'business');
                  if (errors.accountType) {
                    setErrors({ ...errors, accountType: undefined });
                  }
                }}
                disabled={isSubmitting}
                required
              >
                <SelectTrigger className={errors.accountType ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select an account type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
              {errors.accountType && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.accountType}
                </p>
              )}
            </div>
          </div>

          {/* Consent Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Consent</h3>
            
            {/* Consent Given */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="consentGiven"
                checked={consentGiven}
                onCheckedChange={(checked) => {
                  setConsentGiven(checked === true);
                  if (!checked) {
                    setConsentDate('');
                    if (errors.consentDate) {
                      setErrors({ ...errors, consentDate: undefined });
                    }
                  }
                }}
                disabled={isSubmitting}
              />
              <Label htmlFor="consentGiven" className="text-sm font-normal cursor-pointer">
                Consent Given (Optional)
              </Label>
            </div>

            {/* Consent Date */}
            {consentGiven && (
              <div className="space-y-2">
                <Label htmlFor="consentDate">Consent Date *</Label>
                <Input
                  id="consentDate"
                  type="date"
                  value={consentDate}
                  onChange={(e) => {
                    setConsentDate(e.target.value);
                    if (errors.consentDate) {
                      setErrors({ ...errors, consentDate: undefined });
                    }
                  }}
                  disabled={isSubmitting}
                  required={consentGiven}
                  className={errors.consentDate ? 'border-red-500' : ''}
                />
                {errors.consentDate && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.consentDate}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Metadata Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Additional Information</h3>
            
            {/* Metadata */}
            <div className="space-y-2">
              <Label htmlFor="metadata">Metadata (Optional - JSON format)</Label>
              <Textarea
                id="metadata"
                placeholder='{"key": "value"}'
                value={metadata}
                onChange={(e) => {
                  setMetadata(e.target.value);
                  if (errors.metadata) {
                    setErrors({ ...errors, metadata: undefined });
                  }
                }}
                disabled={isSubmitting}
                rows={3}
                className={errors.metadata ? 'border-red-500' : ''}
              />
              {errors.metadata && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.metadata}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Enter metadata as valid JSON. Leave empty for default empty object.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Create User
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
