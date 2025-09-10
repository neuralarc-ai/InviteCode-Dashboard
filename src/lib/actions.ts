
'use server';

import { generateInvitationEmail } from '@/ai/flows/automated-invitation-emails';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const sendInviteSchema = z.object({
  userName: z.string(),
  inviteCode: z.string(),
  email: z.string().email(),
  companyName: z.string().optional(),
});

export async function sendInviteEmailAction(formData: FormData) {
  const rawFormData = Object.fromEntries(formData.entries());
  const validation = sendInviteSchema.safeParse(rawFormData);

  if (!validation.success) {
    return { success: false, message: 'Invalid form data.' };
  }
  
  const { userName, inviteCode, companyName, email } = validation.data;

  try {
    const emailContent = await generateInvitationEmail({
      userName,
      inviteCode,
      companyName: companyName || '',
    });

    // Here you would integrate with an email sending service (e.g., SendGrid, Mailgun)
    // For this example, we'll just log the content to the console
    console.log(`Email prepared for: ${email}`);
    console.log(`Subject: ${emailContent.subject}`);
    console.log(`Text Body: ${emailContent.bodyText}`);
    
    // In a real app, you would update the database here to mark the user as notified
    
    revalidatePath('/');
    return { success: true, message: `Invitation sent to ${userName}.` };
  } catch (error) {
    console.error('Failed to send invitation:', error);
    // In a real app, you'd want to log this error to a monitoring service
    return { success: false, message: 'An error occurred while generating the email.' };
  }
}

const generateCodesSchema = z.object({
  count: z.coerce.number().min(1).max(100),
});

export async function generateCodesAction(formData: FormData) {
    const rawFormData = Object.fromEntries(formData.entries());
    const validation = generateCodesSchema.safeParse(rawFormData);

    if (!validation.success) {
        return { success: false, message: 'Invalid number of codes.' };
    }

    const { count } = validation.data;

    // In a real app, you'd generate and save these to the database
    console.log(`Simulating generation of ${count} new invite codes...`);

    // Simulate a delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    revalidatePath('/');
    return { success: true, message: `${count} new invite codes have been generated.` };
}
