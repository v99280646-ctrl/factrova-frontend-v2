import { useEffect, useState } from "react";

const STORAGE_KEY = "dark-mode";

function readStoredDarkMode() {
  if (typeof window === "undefined") return false;

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "true") return true;
  if (stored === "false") return false;

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

function syncDarkModeClass(isDarkMode) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", isDarkMode);
}

export function useSuperadminTheme() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleDarkMode = () => {
    const updatedIsDarkMode = !isDarkMode;
    if (updatedIsDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("dark-mode", updatedIsDarkMode.toString());
    setIsDarkMode(updatedIsDarkMode);
  };

  useEffect(() => {
    // Check for saved dark mode preference
    const savedDarkMode = localStorage.getItem("dark-mode") === "true";
    if (savedDarkMode) {
      document.documentElement.classList.add("dark");
      setIsDarkMode(true);
    } else {
      document.documentElement.classList.remove("dark");
      setIsDarkMode(false);
    }
  }, []);
  return {
    isDarkMode,
    setIsDarkMode,
    toggleDarkMode,
  };
}
