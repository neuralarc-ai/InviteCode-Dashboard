'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = () => {
    // Clear sessionStorage
    sessionStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('loginTime');
    
    // Clear cookie
    document.cookie = 'isAuthenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    // Redirect to login
    router.push('/login');
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleLogout}
      className="flex items-center gap-2 border-neon-orange text-neon-orange hover:bg-neon-orange hover:text-black"
    >
      <LogOut className="h-4 w-4" />
      Logout
    </Button>
  );
}
