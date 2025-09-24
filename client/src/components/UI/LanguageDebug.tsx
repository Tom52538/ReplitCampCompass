import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';
import { detectBrowserLanguage, SupportedLanguage } from '@/lib/i18n';

export const LanguageDebug = () => {
  const { currentLanguage, changeLanguage } = useLanguage();
  const [detectedLanguage, setDetectedLanguage] = useState<SupportedLanguage>('en');

  useEffect(() => {
    const detected = detectBrowserLanguage();
    setDetectedLanguage(detected);
    console.log('Language Debug - Current:', currentLanguage, 'Detected:', detected);
    console.log('Navigator.language:', navigator.language);
    console.log('Navigator.languages:', navigator.languages);
  }, [currentLanguage]);

  const forceGerman = () => {
    localStorage.removeItem('campground-language');
    changeLanguage('de');
    console.log('Forced language to German');
  };

  const resetLanguage = () => {
    localStorage.removeItem('campground-language');
    const detected = detectBrowserLanguage();
    changeLanguage(detected);
    console.log('Reset to detected language:', detected);
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-black/80 text-white p-4 rounded-lg text-xs">
      <div className="space-y-2">
        <div>Current: {currentLanguage}</div>
        <div>Detected: {detectedLanguage}</div>
        <div>Browser: {navigator.language}</div>
        <div className="flex gap-2">
          <Button size="sm" onClick={forceGerman}>DE</Button>
          <Button size="sm" onClick={resetLanguage}>Reset</Button>
        </div>
      </div>
    </div>
  );
};