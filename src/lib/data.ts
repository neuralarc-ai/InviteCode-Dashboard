import type { WaitlistUser } from '@/lib/types';

const waitlistUsers: WaitlistUser[] = [
  {
    id: '1',
    name: 'Alice Johnson',
    email: 'alice.j@example.com',
    company: 'Innovate Inc.',
    phone: '123-456-7890',
    code: 'NA-A9B3D',
    status: 'Not Used',
    notified: false,
    referralSource: 'Twitter',
    createdAt: new Date('2023-10-01T10:00:00Z'),
  },
  {
    id: '2',
    name: 'Bob Smith',
    email: 'bob.smith@example.com',
    company: 'Tech Solutions',
    phone: '234-567-8901',
    code: 'NA-FGH8J',
    status: 'Used',
    notified: true,
    referralSource: 'LinkedIn',
    createdAt: new Date('2023-10-02T11:30:00Z'),
  },
  {
    id: '3',
    name: 'Charlie Brown',
    email: 'charlie.b@example.com',
    company: 'Data Corp',
    phone: '345-678-9012',
    code: 'NA-KL2MN',
    status: 'Expired',
    notified: true,
    referralSource: 'Friend',
    createdAt: new Date('2023-09-05T09:00:00Z'),
  },
  {
    id: '4',
    name: 'Diana Prince',
    email: 'diana.p@example.com',
    company: 'StartupX',
    phone: '456-789-0123',
    code: 'NA-PQR7S',
    status: 'Not Used',
    notified: false,
    referralSource: 'Blog Post',
    createdAt: new Date('2023-10-15T14:00:00Z'),
  },
    {
    id: '5',
    name: 'Ethan Hunt',
    email: 'ethan.h@example.com',
    company: 'Synergy LLC',
    phone: '567-890-1234',
    code: 'NA-TUV5W',
    status: 'Used',
    notified: true,
    referralSource: 'Google',
    createdAt: new Date('2023-10-10T18:00:00Z'),
  },
  {
    id: '6',
    name: 'Fiona Glenanne',
    email: 'fiona.g@example.com',
    company: 'Creative Minds',
    phone: '678-901-2345',
    code: 'NA-XYZ1A',
    status: 'Not Used',
    notified: false,
    referralSource: 'Twitter',
    createdAt: new Date('2023-10-20T12:00:00Z'),
  },
  {
    id: '7',
    name: 'George Costanza',
    email: 'george.c@example.com',
    company: 'Vandelay Industries',
    phone: '789-012-3456',
    code: 'NA-BC2DE',
    status: 'Expired',
    notified: true,
    referralSource: 'Friend',
    createdAt: new Date('2023-09-12T08:00:00Z'),
  },
  {
    id: '8',
    name: 'Hannah Montana',
    email: 'hannah.m@example.com',
    company: 'PopStar Inc.',
    phone: '890-123-4567',
    code: 'NA-FGH3I',
    status: 'Not Used',
    notified: false,
    referralSource: 'Instagram',
    createdAt: new Date('2023-10-22T20:00:00Z'),
  },
];

export async function getWaitlistUsers(): Promise<WaitlistUser[]> {
  // In a real app, you would fetch this data from a database.
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(waitlistUsers);
    }, 500); // Simulate network delay
  });
}
