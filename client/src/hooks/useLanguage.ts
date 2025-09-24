import { useState, useEffect } from 'react';
import { SupportedLanguage, detectBrowserLanguage, getTranslation as i18nTranslateText, translateInstruction, translateText as i18nTranslateText2 } from '@/lib/i18n';
import { detectUserLanguage, logLanguageDetection } from '@/lib/languageDetection';
import { LocalizationDebugger } from '@/lib/localizationDebugger';

export const useLanguage = () => {
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(() => {
    // Use enhanced language detection for better smartphone compatibility
    const detectedLanguage = detectUserLanguage() as SupportedLanguage;
    const stored = localStorage.getItem('campground-language') as SupportedLanguage;

    // Log detection for debugging
    logLanguageDetection();

    // If browser language differs from stored, use browser language (smartphone changed)
    if (stored && stored !== detectedLanguage) {
      console.log(`Language changed from ${stored} to ${detectedLanguage}, updating...`);
      localStorage.setItem('campground-language', detectedLanguage);
      return detectedLanguage;
    }

    return detectedLanguage;
  });

  useEffect(() => {
    // Save to localStorage when language changes
    localStorage.setItem('campground-language', currentLanguage);
  }, [currentLanguage]);

  // Force language refresh on component mount to detect smartphone language changes
  useEffect(() => {
    const refreshLanguage = () => {
      const detectedLanguage = detectUserLanguage() as SupportedLanguage;
      if (detectedLanguage !== currentLanguage) {
        console.log(`🌐 Smartphone language detected: ${detectedLanguage}, switching from ${currentLanguage}`);
        setCurrentLanguage(detectedLanguage);
      }
    };

    // Check immediately and on window focus (when returning to app)
    refreshLanguage();
    window.addEventListener('focus', refreshLanguage);

    return () => window.removeEventListener('focus', refreshLanguage);
  }, [currentLanguage]);

  const t = (key: string): string => {
    return i18nTranslateText(currentLanguage, key);
  };

  const translateText = (text: string, context?: { poiId?: string; poiName?: string; component?: string }): string => {
    console.log(`🌐 TRANSLATE REQUEST: "${text}" to ${currentLanguage}`, context);
    
    // First try navigation instruction translation
    const instructionTranslation = translateInstruction(text, currentLanguage);
    if (instructionTranslation !== text) {
      console.log(`🧭 Navigation instruction translated: "${text}" -> "${instructionTranslation}"`);
      return instructionTranslation;
    }
    
    // Try i18n translation
    const i18nTranslation = i18nTranslateText2(text, currentLanguage);
    if (i18nTranslation !== text) {
      console.log(`📖 i18n translated: "${text}" -> "${i18nTranslation}"`);
      return i18nTranslation;
    }
    
    // Fallback to regular translation
    const fallbackTranslation = i18nTranslateText(currentLanguage, text);
    if (fallbackTranslation !== text) {
      console.log(`🔄 Fallback translated: "${text}" -> "${fallbackTranslation}"`);
      return fallbackTranslation;
    }
    
    // Log translation issues if context provided
    if (context && context.poiId) {
      LocalizationDebugger.log({
        component: context.component || 'useLanguage',
        poiId: context.poiId,
        poiName: context.poiName || 'unknown',
        userLanguage: currentLanguage,
        detectedLanguage: 'unknown',
        translationPath: 'translateText-no-translation-found',
        issues: [`No translation found for text: "${text}"`]
      });
      
      console.warn(`⚠️ NO TRANSLATION FOUND for "${text}" in language ${currentLanguage}`);
    }
    
    return text;
  };

  const changeLanguage = (lang: SupportedLanguage) => {
    setCurrentLanguage(lang);
  };

  return {
    currentLanguage,
    changeLanguage,
    t,
    translateText
  };
};