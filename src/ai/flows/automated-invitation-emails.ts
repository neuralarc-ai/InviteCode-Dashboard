'use server';

/**
 * @fileOverview This file contains the Genkit flow for generating automated invitation emails.
 *
 * - generateInvitationEmail - A function that generates personalized beta invitation emails with invite codes using AI.
 * - GenerateInvitationEmailInput - The input type for the generateInvitationEmail function.
 * - GenerateInvitationEmailOutput - The return type for the generateInvitationEmail function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateInvitationEmailInputSchema = z.object({
  userName: z.string().describe('The name of the user receiving the invitation.'),
  inviteCode: z.string().describe('The unique invite code for the user.'),
  companyName: z.string().optional().describe('The name of the user\'s company, if available.'),
});
export type GenerateInvitationEmailInput = z.infer<typeof GenerateInvitationEmailInputSchema>;

const GenerateInvitationEmailOutputSchema = z.object({
  subject: z.string().describe('The subject line of the email.'),
  bodyHtml: z.string().describe('The HTML body of the email.'),
  bodyText: z.string().describe('The plain text body of the email.'),
});
export type GenerateInvitationEmailOutput = z.infer<typeof GenerateInvitationEmailOutputSchema>;

export async function generateInvitationEmail(input: GenerateInvitationEmailInput): Promise<GenerateInvitationEmailOutput> {
  return generateInvitationEmailFlow(input);
}

const invitationEmailPrompt = ai.definePrompt({
  name: 'invitationEmailPrompt',
  input: {schema: GenerateInvitationEmailInputSchema},
  output: {schema: GenerateInvitationEmailOutputSchema},
  prompt: `You are an AI email marketing assistant specialized in crafting engaging beta invitation emails.

  Generate a personalized beta invitation email for {{userName}} with the invite code {{inviteCode}}.
  If available, reference that they work at {{companyName}} to make the email more relevant. The email should highlight the benefits of joining our beta program and encourage them to use their invite code to sign up.
  Create both an HTML and plain text version of the email.

  Subject: Beta Invitation - Exclusive Access for You!
  HTML Body:
  <p>Hi {{userName}},</p>
  <p>We're excited to invite you to join the beta program for Neon Access! As a valued member of our community, you've been selected to get early access and shape the future of our platform.</p>
  {{#if companyName}}
  <p>We know you're passionate about innovation at {{companyName}}, and we believe Neon Access will revolutionize how you manage access and invitations.</p>
  {{/if}}
  <p>Use this invite code: <b>{{inviteCode}}</b> to get started.</p>

  <p>Thanks,
The Neon Access Team</p>
  Text Body:
  Hi {{userName}},
  We're excited to invite you to join the beta program for Neon Access! As a valued member of our community, you've been selected to get early access and shape the future of our platform.
  {{#if companyName}}
  We know you're passionate about innovation at {{companyName}}, and we believe Neon Access will revolutionize how you manage access and invitations.
  {{/if}}
  Use this invite code: {{inviteCode}} to get started.

  Thanks,
  The Neon Access Team`,
});

const generateInvitationEmailFlow = ai.defineFlow(
  {
    name: 'generateInvitationEmailFlow',
    inputSchema: GenerateInvitationEmailInputSchema,
    outputSchema: GenerateInvitationEmailOutputSchema,
  },
  async input => {
    const {output} = await invitationEmailPrompt(input);
    return output!;
  }
);
