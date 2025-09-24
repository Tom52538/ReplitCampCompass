import { SupportedLanguage, SUPPORTED_LANGUAGES } from './i18n';

export const detectUserLanguage = (): SupportedLanguage => {
  // Check multiple language sources for better detection
  const languages = [
    navigator.language,
    ...navigator.languages,
    (navigator as any).userLanguage,
    (navigator as any).browserLanguage,
    (navigator as any).systemLanguage
  ].filter(Boolean);

  const browserLanguage = navigator.language || 'en-US';
  const detectedCode = getLanguageCode(navigator.language);

  console.log('🌐 Language Detection:', {
    browserLanguage,
    detectedCode,
    displayName: SUPPORTED_LANGUAGES[detectedCode as SupportedLanguage] || 'Unknown',
    allBrowserLanguages: navigator.languages
  });

  // CRITICAL: Only log when language changes or first time
  if (!window.lastDetectedLang || window.lastDetectedLang !== detectedCode) {
    console.log('🚨 LANGUAGE CHANGE DETECTED:', {
      previous: window.lastDetectedLang,
      current: detectedCode,
      willAffectEnrichment: true
    });
    window.lastDetectedLang = detectedCode;
  }

  for (const lang of languages) {
    const lowerLang = lang.toLowerCase();
    const langCode = getLanguageCode(lang);

    if (langCode in SUPPORTED_LANGUAGES) {
      return langCode as SupportedLanguage;
    }
  }

  // Default to English
  console.log('Defaulting to English');
  return 'en';
};

const getLanguageCode = (lang: string): string => {
  if (!lang) return 'en';

  const lowerLang = lang.toLowerCase();

  // Check for German variants
  if (lowerLang.startsWith('de') || lowerLang.includes('german')) {
    return 'de';
  }
  if (lowerLang.startsWith('fr') || lowerLang.includes('french')) return 'fr';
  if (lowerLang.startsWith('nl') || lowerLang.includes('dutch')) return 'nl';
  if (lowerLang.startsWith('it') || lowerLang.includes('italian')) return 'it';
  if (lowerLang.startsWith('es') || lowerLang.includes('spanish')) return 'es';

  return 'en';
};

export const logLanguageDetection = () => {
  const detected = detectUserLanguage();
  console.log(`🌐 Final language detection: ${detected} (${SUPPORTED_LANGUAGES[detected]})`);
};