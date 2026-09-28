import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type Theme = 'day' | 'night';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'btc-sentinel-theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Read from localStorage on mount
    const saved = localStorage.getItem(STORAGE_KEY) as string | null;
    
    // Migrate old 'default' theme to 'night'
    if (saved === 'default') {
      localStorage.setItem(STORAGE_KEY, 'night');
      return 'night';
    }
    
    if (saved && ['day', 'night'].includes(saved)) {
      return saved as Theme;
    }
    return 'night';
  });

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
