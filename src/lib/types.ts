export type UserStatus = 'Used' | 'Not Used' | 'Expired';

export type WaitlistUser = {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  code: string;
  status: UserStatus;
  notified: boolean;
  referralSource: string;
  createdAt: Date;
};
