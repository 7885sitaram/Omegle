"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
export type Language = "en" | "hi" | "es" | "fr" | "de" | "ar" | "zh";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    // Sync with app_language cookie
    const cookies = document.cookie.split("; ");
    const langCookie = cookies.find((row) => row.startsWith("app_language="));
    if (langCookie) {
      const val = langCookie.split("=")[1] as Language;
      setLanguageState(val);
    } else {
      const saved = localStorage.getItem("app_language") as Language;
      if (saved) setLanguageState(saved as Language);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("app_language", lang);
  };

  const t = (key: string): string => {
    // Since we've reverted all UI strings to plain English, 
    // the 't' function can now just pass the key through.
    // Google Translate handles the actual translation.
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
