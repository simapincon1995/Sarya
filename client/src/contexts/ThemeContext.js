/* eslint-disable react-hooks/exhaustive-deps */
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('light');

  const themes = {
    light: {
      name: 'Light',
      cssClass: 'light',
      mode: 'light',
      primaryColor: '#3B82F6',
      primaryColorText: '#ffffff',
      surfaceGround: '#f8fafc',
      surfaceSection: '#ffffff',
      surfaceCard: '#ffffff',
      surfaceOverlay: '#ffffff',
      surfaceBorder: '#e2e8f0',
      surfaceHover: '#f1f5f9',
      textColor: '#1e293b',
      textColorSecondary: '#64748b',
      contentBorder: '#e2e8f0',
      contentBg: '#ffffff',
      highlightBg: '#dbeafe',
      highlightTextBg: '#1e40af'
    },
    dark: {
      name: 'Dark',
      cssClass: 'dark',
      mode: 'dark',
      primaryColor: '#3B82F6',
      primaryColorText: '#ffffff',
      surfaceGround: '#0f172a',
      surfaceSection: '#1e293b',
      surfaceCard: '#1e293b',
      surfaceOverlay: '#1e293b',
      surfaceBorder: '#334155',
      surfaceHover: '#334155',
      textColor: '#f8fafc',
      textColorSecondary: '#cbd5e1',
      contentBorder: '#334155',
      contentBg: '#1e293b',
      highlightBg: '#1e40af',
      highlightTextBg: '#dbeafe'
    },
    'ocean-blue': {
      name: 'Ocean Blue',
      cssClass: 'ocean-blue',
      mode: 'light',
      primaryColor: '#0ea5e9',
      primaryColorText: '#ffffff',
      surfaceGround: '#f0f9ff',
      surfaceSection: '#ffffff',
      surfaceCard: '#ffffff',
      surfaceOverlay: '#ffffff',
      surfaceBorder: '#bae6fd',
      surfaceHover: '#e0f2fe',
      textColor: '#0c4a6e',
      textColorSecondary: '#0369a1',
      contentBorder: '#bae6fd',
      contentBg: '#ffffff',
      highlightBg: '#e0f2fe',
      highlightTextBg: '#0369a1'
    },
    'sunset-orange': {
      name: 'Sunset Orange',
      cssClass: 'sunset-orange',
      mode: 'light',
      primaryColor: '#f97316',
      primaryColorText: '#ffffff',
      surfaceGround: '#fff7ed',
      surfaceSection: '#ffffff',
      surfaceCard: '#ffffff',
      surfaceOverlay: '#ffffff',
      surfaceBorder: '#fed7aa',
      surfaceHover: '#ffedd5',
      textColor: '#9a3412',
      textColorSecondary: '#c2410c',
      contentBorder: '#fed7aa',
      contentBg: '#ffffff',
      highlightBg: '#ffedd5',
      highlightTextBg: '#c2410c'
    },
    'forest-green': {
      name: 'Forest Green',
      cssClass: 'forest-green',
      mode: 'light',
      primaryColor: '#059669',
      primaryColorText: '#ffffff',
      surfaceGround: '#f0fdf4',
      surfaceSection: '#ffffff',
      surfaceCard: '#ffffff',
      surfaceOverlay: '#ffffff',
      surfaceBorder: '#bbf7d0',
      surfaceHover: '#dcfce7',
      textColor: '#14532d',
      textColorSecondary: '#047857',
      contentBorder: '#bbf7d0',
      contentBg: '#ffffff',
      highlightBg: '#dcfce7',
      highlightTextBg: '#047857'
    },
    'midnight-dark': {
      name: 'Midnight Dark',
      cssClass: 'midnight-dark',
      mode: 'dark',
      primaryColor: '#8b5cf6',
      primaryColorText: '#ffffff',
      surfaceGround: '#0f0f23',
      surfaceSection: '#1a1a2e',
      surfaceCard: '#1a1a2e',
      surfaceOverlay: '#1a1a2e',
      surfaceBorder: '#16213e',
      surfaceHover: '#16213e',
      textColor: '#e2e8f0',
      textColorSecondary: '#94a3b8',
      contentBorder: '#16213e',
      contentBg: '#1a1a2e',
      highlightBg: '#4c1d95',
      highlightTextBg: '#c4b5fd'
    },
    'corporate-blue': {
      name: 'Corporate Blue',
      cssClass: 'corporate-blue',
      mode: 'light',
      primaryColor: '#1e40af',
      primaryColorText: '#ffffff',
      surfaceGround: '#f8fafc',
      surfaceSection: '#ffffff',
      surfaceCard: '#ffffff',
      surfaceOverlay: '#ffffff',
      surfaceBorder: '#cbd5e1',
      surfaceHover: '#f1f5f9',
      textColor: '#1e293b',
      textColorSecondary: '#475569',
      contentBorder: '#cbd5e1',
      contentBg: '#ffffff',
      highlightBg: '#dbeafe',
      highlightTextBg: '#1e40af'
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Load theme from localStorage or user preference
    const savedTheme = localStorage.getItem('theme') || 'light';
    setCurrentTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (themeName) => {
    const theme = themes[themeName];
    if (!theme) return;

    // Remove all theme classes
    Object.values(themes).forEach(t => {
      document.documentElement.classList.remove(`theme-${t.cssClass}`);
    });

    // Add current theme class
    document.documentElement.classList.add(`theme-${theme.cssClass}`);
    document.documentElement.setAttribute('data-theme', theme.cssClass);

    // Update CSS custom properties
    document.documentElement.style.setProperty('--primary-color', theme.primaryColor);
    document.documentElement.style.setProperty('--surface-ground', theme.surfaceGround);
    document.documentElement.style.setProperty('--surface-card', theme.surfaceCard);
    document.documentElement.style.setProperty('--text-color', theme.textColor);

    // Update PrimeReact theme
    updatePrimeReactTheme(themeName);
  };

  const updatePrimeReactTheme = (themeName) => {
    // Remove existing PrimeReact theme links
    const existingLinks = document.querySelectorAll('link[data-prime-theme]');
    existingLinks.forEach(link => link.remove());

    // Add new PrimeReact theme
    const themeMap = {
      light: 'lara-light-blue',
      dark: 'lara-dark-blue',
      'ocean-blue': 'lara-light-blue',
      'sunset-orange': 'lara-light-orange',
      'forest-green': 'lara-light-green'
    };

    const primeTheme = themeMap[themeName] || 'lara-light-blue';
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://cdn.jsdelivr.net/npm/primereact@10.0.0/resources/themes/${primeTheme}/theme.css`;
    link.setAttribute('data-prime-theme', primeTheme);
    document.head.appendChild(link);
  };

  const changeTheme = (themeName) => {
    if (!themes[themeName]) {
      console.error(`Theme "${themeName}" not found`);
      return;
    }

    setCurrentTheme(themeName);
    localStorage.setItem('theme', themeName);
    applyTheme(themeName);
  };

  const getCurrentTheme = () => {
    return themes[currentTheme];
  };

  const getAvailableThemes = () => {
    return Object.entries(themes).map(([key, theme]) => ({
      key,
      ...theme
    }));
  };

  const value = {
    currentTheme,
    themes: getAvailableThemes(),
    changeTheme,
    getCurrentTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
