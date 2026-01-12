"use client";
import { createContext, ReactNode, useContext, useState } from "react";

type GlobalContextProps = {
  showNotifications: boolean;
  setShowNotifications: (showNotifications: boolean) => void;
};

const GlobalContext = createContext<GlobalContextProps | null>(null);

export const GlobalProvider = ({ children }: { children: ReactNode }) => {
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  return (
    <GlobalContext.Provider
      value={{
        showNotifications,
        setShowNotifications,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobal = () => {
  const cxt = useContext(GlobalContext);
  if (!cxt) {
    throw new Error("useGlobal must be used within an GlobalProvider");
  }
  return cxt;
};
