/**
 * Server-seitige ElevenLabs TTS-Integration
 * Sichere API-Key-Verwaltung ohne Client-Exposition
 */

export class ElevenLabsServerService {
  private apiKey: string;
  private baseURL = 'https://api.elevenlabs.io/v1';
  private currentVoiceId = 'JBFqnCBsd6RMkjVDRZzb'; // George (Standard)
  
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('ELEVENLABS_API_KEY environment variable nicht gefunden');
    }
    console.log('🎤 ElevenLabs Server Service initialisiert - API-Key sicher geladen');
  }
  
  /**
   * Generiert deutsche TTS-Audio server-seitig
   * @param text Deutscher Navigation-Text
   * @param type Art der Navigation (für Audio-Optimierung)
   * @returns Audio-Buffer für Client-Wiedergabe
   */
  async generateGermanTTS(text: string, type: 'direction' | 'warning' | 'arrival' | 'start' = 'direction'): Promise<ArrayBuffer> {
    try {
      console.log('🌐 Server TTS Request:', { text, type });
      
      // Voice-Settings basierend auf Navigation-Typ optimieren
      const voiceSettings = this.getVoiceSettingsForType(type);
      
      const response = await fetch(`${this.baseURL}/text-to-speech/${this.currentVoiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: voiceSettings
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ ElevenLabs API Error:', response.status, errorText);
        throw new Error(`ElevenLabs API Error ${response.status}: ${errorText}`);
      }
      
      const audioBuffer = await response.arrayBuffer();
      const sizeKB = Math.round(audioBuffer.byteLength / 1024);
      
      console.log('✅ Server TTS erfolgreich - Audio generiert:', {
        text: text.slice(0, 50) + (text.length > 50 ? '...' : ''),
        sizeKB,
        type
      });
      
      return audioBuffer;
    } catch (error) {
      console.error('❌ Server TTS Fehler:', error);
      throw error;
    }
  }
  
  /**
   * Optimiert Voice-Settings basierend auf Navigation-Typ
   * @param type Art der Navigation-Ansage
   * @returns Optimierte ElevenLabs Voice-Settings
   */
  private getVoiceSettingsForType(type: string) {
    switch (type) {
      case 'warning':
        return {
          stability: 0.8,      // Etwas mehr Stabilität für Warnungen
          similarity_boost: 0.9, // Höhere Ähnlichkeit für Klarheit
          style: 0.1,          // Leichte Betonung
          use_speaker_boost: true
        };
        
      case 'arrival':
        return {
          stability: 0.7,      // Etwas weniger steif für freundliche Ankunft
          similarity_boost: 0.85,
          style: 0.2,          // Etwas freundlicher
          use_speaker_boost: true
        };
        
      case 'start':
        return {
          stability: 0.75,
          similarity_boost: 0.8,
          style: 0.15,         // Leicht motivierend
          use_speaker_boost: true
        };
        
      default: // 'direction'
        return {
          stability: 0.75,     // Standard für Navigation
          similarity_boost: 0.85,
          style: 0.0,          // Neutral
          use_speaker_boost: true
        };
    }
  }
  
  /**
   * API-Verbindungstest (server-seitig)
   * @returns Erfolg der API-Verbindung
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.generateGermanTTS('Test der deutschen Sprachausgabe', 'direction');
      console.log('✅ ElevenLabs Server Connection Test erfolgreich');
      return true;
    } catch (error) {
      console.error('❌ ElevenLabs Server Connection Test fehlgeschlagen:', error);
      return false;
    }
  }

  /**
   * Verfügbare Stimmen abrufen
   * @returns Liste aller verfügbaren ElevenLabs-Stimmen
   */
  async getAvailableVoices(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseURL}/voices`, {
        headers: {
          'xi-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs Voices API Error ${response.status}`);
      }

      const data = await response.json();
      console.log('🎤 Verfügbare Stimmen abgerufen:', data.voices?.length || 0);
      
      return data.voices || [];
    } catch (error) {
      console.error('❌ Fehler beim Abrufen der Stimmen:', error);
      throw error;
    }
  }

  /**
   * Deutsche Stimmen filtern - nur George und Lily
   * @returns Liste mit George und Lily Stimmen für Navigation
   */
  async getGermanVoices(): Promise<any[]> {
    try {
      const allVoices = await this.getAvailableVoices();
      
      // Nur George und Lily auswählen
      const selectedVoices = allVoices.filter(voice => {
        const name = (voice.name || '').toLowerCase();
        return name.includes('george') || name.includes('lily');
      });

      console.log('🎤 Ausgewählte Stimmen (George & Lily):', selectedVoices.length);
      console.log('🔍 DEBUG: Gefilterte Stimmen Namen:', selectedVoices.map(v => v.name));
      
      return selectedVoices;
    } catch (error) {
      console.error('❌ Fehler beim Filtern der Stimmen:', error);
      throw error;
    }
  }

  /**
   * Aktuelle Stimme wechseln
   * @param voiceId Neue Stimmen-ID
   * @returns Erfolg des Stimmenwechsels
   */
  async setVoice(voiceId: string): Promise<boolean> {
    try {
      // Validierung: Prüfen ob Stimme existiert
      const availableVoices = await this.getAvailableVoices();
      const voiceExists = availableVoices.some(voice => voice.voice_id === voiceId);
      
      if (!voiceExists) {
        throw new Error(`Stimme mit ID ${voiceId} nicht gefunden`);
      }

      this.currentVoiceId = voiceId;
      console.log('🎤 Stimme gewechselt zu:', voiceId);
      
      // Test der neuen Stimme
      await this.generateGermanTTS('Neue Stimme aktiviert', 'direction');
      return true;
    } catch (error) {
      console.error('❌ Stimmenwechsel fehlgeschlagen:', error);
      throw error;
    }
  }

  /**
   * Aktuelle Stimmen-ID abrufen
   * @returns Aktuelle voiceId
   */
  getCurrentVoiceId(): string {
    return this.currentVoiceId;
  }
}