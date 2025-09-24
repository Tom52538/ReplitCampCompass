import { detectBrowserLanguage, voiceInstructions, SupportedLanguage } from './i18n';
import { detectUserLanguage } from './languageDetection';

export class VoiceGuide {
  private synthesis: SpeechSynthesis;
  private isEnabled: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private voicesLoaded: boolean = false;
  private preferredVoice: SpeechSynthesisVoice | null = null;
  private currentLanguage: SupportedLanguage;
  private announcementQueue: Array<{text: string, priority: 'low' | 'medium' | 'high'}> = [];
  private isSpeaking: boolean = false;
  private voiceLanguageMap: { [key: string]: string } = {
    'de': 'de-DE',    // German (Germany)
    'en': 'en-US',    // English (US)
    'fr': 'fr-FR',    // French (France)
    'es': 'es-ES',    // Spanish (Spain)
    'it': 'it-IT',    // Italian (Italy)
    'nl': 'nl-NL',    // Dutch (Netherlands)
    'pt': 'pt-PT',    // Portuguese (Portugal)
    'pl': 'pl-PL',    // Polish (Poland)
    'ru': 'ru-RU',    // Russian (Russia)
    'cs': 'cs-CZ',    // Czech (Czech Republic)
    'hu': 'hu-HU'     // Hungarian (Hungary)
  };

  constructor() {
    // Check if speech synthesis is available
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.warn('Speech synthesis not available in this browser');
      this.synthesis = null as any;
      this.currentLanguage = detectUserLanguage() as SupportedLanguage;
      return;
    }

    this.synthesis = window.speechSynthesis;
    this.currentLanguage = detectUserLanguage() as SupportedLanguage;
    console.log(`🎙️ Voice guidance language: ${this.currentLanguage}`);
    
    try {
      // Force voice loading by speaking empty text
      this.synthesis.speak(new SpeechSynthesisUtterance(''));
      this.synthesis.cancel();
      
      this.initializeVoices();
      
      // Re-initialize voices after a delay to ensure they're loaded
      setTimeout(() => {
        this.initializeVoices();
      }, 100);
    } catch (error) {
      console.error('Voice guide initialization error:', error);
    }
  }

  private initializeVoices() {
    if (!this.synthesis) return;

    const loadVoices = () => {
      const voices = this.synthesis.getVoices();
      if (voices.length > 0) {
        this.voicesLoaded = true;
        
        // Find the best voice for current language using speech synthesis locale
        const speechLang = this.voiceLanguageMap[this.currentLanguage] || 'en-US';
        const languageCode = speechLang.split('-')[0]; // e.g., 'de' from 'de-DE'
        
        // Priority: exact locale match > language match > local English > any voice
        this.preferredVoice = voices.find(voice => 
          voice.lang.toLowerCase() === speechLang.toLowerCase()
        ) || voices.find(voice => 
          voice.lang.toLowerCase().startsWith(languageCode) && voice.localService
        ) || voices.find(voice => 
          voice.lang.toLowerCase().startsWith(languageCode)
        ) || voices.find(voice => 
          voice.lang.toLowerCase().includes('en') && voice.localService
        ) || voices[0];

        console.log(`🗣️ VoiceGuide: Language ${this.currentLanguage} → ${speechLang}`);
        console.log(`🗣️ Selected voice: ${this.preferredVoice?.name} (${this.preferredVoice?.lang})`);
      }
    };

    // Load immediately if available
    loadVoices();
    
    // Handle async voice loading
    this.synthesis.onvoiceschanged = loadVoices;
  }

  setLanguage(language: SupportedLanguage) {
    this.currentLanguage = language;
    console.log(`🔄 Voice language changed to: ${language}`);
    this.initializeVoices();
  }

  private translateInstruction(instruction: string): string {
    const instructions = voiceInstructions[this.currentLanguage];
    
    // Map common navigation instructions to translated versions
    const instructionMap: Record<string, keyof typeof instructions> = {
      'turn left': 'turnLeft',
      'turn right': 'turnRight',
      'turn slight left': 'turnSlightLeft',
      'turn slight right': 'turnSlightRight',
      'turn sharp left': 'turnSharpLeft',
      'turn sharp right': 'turnSharpRight',
      'continue ahead': 'continueAhead',
      'continue straight': 'continueStraight',
      'keep left': 'keepLeft',
      'keep right': 'keepRight',
      'head north': 'headNorth',
      'head south': 'headSouth',
      'head east': 'headEast',
      'head west': 'headWest',
      'head northeast': 'headNortheast',
      'head northwest': 'headNorthwest',
      'head southeast': 'headSoutheast',
      'head southwest': 'headSouthwest',
      'arrive at your destination': 'arrive'
    };

    const lowerInstruction = instruction.toLowerCase();
    
    // Find matching instruction
    for (const [key, translationKey] of Object.entries(instructionMap)) {
      if (lowerInstruction.includes(key)) {
        return instructions[translationKey];
      }
    }
    
    // Return original if no translation found
    return instruction;
  }

  private getLanguageCode(): string {
    // Use the enhanced voice language mapping
    const speechLang = this.voiceLanguageMap[this.currentLanguage] || 'en-US';
    console.log(`🗣️ Speech synthesis language: ${speechLang} for ${this.currentLanguage}`);
    return speechLang;
  }

  enable() {
    this.isEnabled = true;
  }

  disable() {
    this.isEnabled = false;
    this.stopCurrentSpeech();
  }

  isVoiceEnabled(): boolean {
    return this.isEnabled;
  }

  private stopCurrentSpeech() {
    try {
      if (this.synthesis) {
        this.synthesis.cancel();
        this.currentUtterance = null;
      }
    } catch (error) {
      console.error('Error stopping speech:', error);
    }
  }

  private processQueue() {
    if (this.isSpeaking || this.announcementQueue.length === 0 || !this.isEnabled || !this.synthesis) {
      return;
    }

    try {
      this.isSpeaking = true;
      const announcement = this.announcementQueue.shift()!;
      const processedText = announcement.text; // Use native German instructions from OpenRouteService
      
      const utterance = new SpeechSynthesisUtterance(processedText);
      utterance.rate = 0.9;
      utterance.volume = 1;
      utterance.pitch = 1;
      utterance.lang = this.getLanguageCode();

      if (this.preferredVoice) {
        utterance.voice = this.preferredVoice;
      }

      utterance.onstart = () => {
        this.currentUtterance = utterance;
        console.log(`🔊 Speaking native German: "${processedText}"`);
        console.log(`🔊 Voice: ${utterance.voice?.name} | Lang: ${utterance.lang}`);
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        this.processQueue(); // Process next item in queue
      };

      utterance.onerror = (error) => {
        console.error('Speech synthesis error:', error);
        this.isSpeaking = false;
        this.currentUtterance = null;
        this.processQueue(); // Try next item on error
      };

      this.synthesis.speak(utterance);
    } catch (error) {
      console.error('Error in processQueue:', error);
      this.isSpeaking = false;
      this.processQueue();
    }
  }

  speak(text: string, priority: 'low' | 'medium' | 'high' = 'medium') {
    if (!this.isEnabled || !this.synthesis) return;

    try {
      if (priority === 'high') {
        // High priority: clear queue and current speech
        this.synthesis.cancel();
        this.announcementQueue = [];
        this.isSpeaking = false;
        this.announcementQueue.push({ text, priority });
      } else {
        // Add to queue
        this.announcementQueue.push({ text, priority });
      }
      
      this.processQueue();
    } catch (error) {
      console.error('VoiceGuide speak error:', error);
    }
  }

  announceInstruction(instruction: string, distance: number) {
    // Enhanced German voice announcements with proper distance announcements
    if (distance > 0.2) { // >200m
      this.speak(`In ${Math.round(distance * 1000)} Metern: ${instruction}`, 'medium');
    } else if (distance > 0.1) { // 100-200m
      this.speak(`In ${Math.round(distance * 1000)} Metern: ${instruction}`, 'medium');
    } else if (distance > 0.05) { // 50-100m
      this.speak(`In ${Math.round(distance * 1000)} Metern: ${instruction}`, 'high');
    } else if (distance > 0.02) { // 20-50m
      this.speak(`Gleich: ${instruction}`, 'high');
    } else { // <20m
      this.speak(instruction, 'high');
    }
  }

  // Enhanced method for comprehensive navigation announcements
  announceNavigationUpdate(instruction: string, distance: number, streetName?: string) {
    let announcement = '';
    
    if (distance > 0.1) { // >100m
      announcement = `In ${Math.round(distance * 1000)} Metern: ${instruction}`;
      if (streetName) {
        announcement += ` auf ${streetName}`;
      }
    } else if (distance > 0.02) { // 20-100m
      announcement = `Gleich: ${instruction}`;
    } else { // <20m
      announcement = instruction;
    }
    
    this.speak(announcement, distance > 0.05 ? 'medium' : 'high');
  }

  // Method for route progress announcements
  announceRouteProgress(remainingDistance: number, estimatedTime: string) {
    const distanceText = remainingDistance > 1 
      ? `${Math.round(remainingDistance * 10) / 10} Kilometer` 
      : `${Math.round(remainingDistance * 1000)} Meter`;
    
    this.speak(`Noch ${distanceText} bis zum Ziel. Geschätzte Ankunftszeit: ${estimatedTime}`, 'low');
  }

  getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  // Test method to check available German voices
  testGermanVoice() {
    if (!this.synthesis) {
      console.warn('Speech synthesis not available');
      return;
    }

    try {
      const voices = this.synthesis.getVoices();
      const germanVoices = voices.filter(voice => 
        voice.lang.toLowerCase().startsWith('de')
      );
      
      console.log(`🔍 Available German voices:`, germanVoices.map(v => ({
        name: v.name,
        lang: v.lang,
        localService: v.localService
      })));
      
      if (germanVoices.length > 0) {
        const testUtterance = new SpeechSynthesisUtterance('Links abbiegen');
        testUtterance.voice = germanVoices[0];
        testUtterance.lang = 'de-DE';
        console.log(`🧪 Testing German voice: ${germanVoices[0].name}`);
        this.synthesis.speak(testUtterance);
      } else {
        console.warn('⚠️ No German voices available on this device');
      }
    } catch (error) {
      console.error('Error testing German voice:', error);
    }
  }

  announceNavigationStart(firstInstruction: string) {
    this.speak(`Navigation gestartet. ${firstInstruction}`, 'high');
  }

  announceOffRoute() {
    this.speak('You are off the planned route. Recalculating...', 'high');
  }

  announceDestinationReached() {
    this.speak('You have arrived at your destination', 'high');
  }

  announceRerouting() {
    this.speak('Route recalculated', 'high');
  }

  // Test voice functionality
  testVoice(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.synthesis) {
        resolve(false);
        return;
      }

      try {
        const utterance = new SpeechSynthesisUtterance('Voice test successful');
        utterance.volume = 1;
        utterance.rate = 0.8;
        
        if (this.preferredVoice) {
          utterance.voice = this.preferredVoice;
        }

        utterance.onend = () => resolve(true);
        utterance.onerror = () => resolve(false);

        this.synthesis.speak(utterance);
      } catch (error) {
        console.error('Voice test failed:', error);
        resolve(false);
      }
    });
  }

  // Get available voice information
  getVoiceInfo() {
    const voices = this.synthesis?.getVoices() || [];
    return {
      available: voices.length > 0,
      count: voices.length,
      preferred: this.preferredVoice?.name || 'None',
      supported: !!this.synthesis
    };
  }
}