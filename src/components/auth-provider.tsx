"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check authentication status
    const checkAuth = () => {
      const sessionAuth = sessionStorage.getItem("isAuthenticated") === "true";
      const cookieAuth = document.cookie.includes("isAuthenticated=true");

      const authenticated = sessionAuth || cookieAuth;
      setIsAuthenticated(authenticated);
      setIsLoading(false);

      // If not authenticated and not on login page, redirect to login
      if (!authenticated && pathname !== "/login") {
        router.push("/login");
      }
    };

    checkAuth();
  }, [pathname, router]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
