/**
 * Sichere TTS-Client Implementation
 * Verwendet Server-API anstatt direkter ElevenLabs-Integration
 * Keine API-Keys im Browser!
 */

export type NavigationType = 'direction' | 'warning' | 'arrival' | 'start';

interface TTSResponse {
  available: boolean;
  connected?: boolean;
  message?: string;
  error?: string;
}

// Added type for voice object based on expected API response
interface Voice {
  id: string;
  name: string;
  // Add other properties if known
}

export class SecureTTSClient {
  private audioContext: AudioContext | null = null;
  private audioCache = new Map<string, ArrayBuffer>();
  private readonly CACHE_TTL = 1000 * 60 * 60; // 1 Stunde
  private readonly MAX_CACHE_SIZE = 50;
  private playbackQueue: Promise<void> = Promise.resolve();
  private currentVoiceId: string = '';

  constructor() {
    console.log('🎤 Secure TTS Client initialisiert - Keine API-Keys im Browser');
  }

  /**
   * Initialisiert Audio-Context (lazy loading)
   */
  private async initAudioContext(): Promise<AudioContext> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('🔊 Audio-Context initialisiert');
    }

    // Resume context if suspended (browser policy)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
      console.log('▶️ Audio-Context resumed');
    }

    return this.audioContext;
  }

  /**
   * Generiert TTS über sichere Server-API
   * @param text Deutscher Navigation-Text
   * @param type Art der Navigation-Ansage
   */
  /**
   * Erstellt einen stillen Audio-Buffer als Fallback
   */
  private createSilentAudioBuffer(): ArrayBuffer {
    // Minimaler WAV-Header für 1 Sekunde stillen Audio
    const sampleRate = 44100;
    const duration = 0.1; // 100ms stiller Audio
    const numChannels = 1;
    const bytesPerSample = 2;
    const numSamples = sampleRate * duration;
    const dataSize = numSamples * numChannels * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    
    // WAV Header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
    view.setUint16(32, numChannels * bytesPerSample, true);
    view.setUint16(34, 8 * bytesPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    
    // Stille Daten (alle Nullen)
    for (let i = 44; i < 44 + dataSize; i++) {
      view.setUint8(i, 0);
    }
    
    return buffer;
  }

  async generateTTS(text: string, type: NavigationType = 'direction'): Promise<ArrayBuffer> {
    try {
      console.log('🌐 Secure TTS Request:', { text: text.slice(0, 50) + '...', type });

      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, type })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        
        // Bei Quota-Exceeded oder anderen TTS-Fehlern: Fallback zu stillem Audio
        if (response.status === 500 || response.status === 401) {
          console.warn('⚠️ TTS API nicht verfügbar (Quota überschritten?) - Fallback zu stillem Audio');
          return this.createSilentAudioBuffer();
        }
        
        throw new Error(errorData?.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const audioBuffer = await response.arrayBuffer();
      console.log('✅ TTS generiert - Größe:', Math.round(audioBuffer.byteLength / 1024), 'KB');

      return audioBuffer;
    } catch (error) {
      console.error('❌ Secure TTS Generation Error:', error);
      // Fallback zu stillem Audio anstatt Exception zu werfen
      console.warn('⚠️ TTS Fallback: Verwende stilles Audio');
      return this.createSilentAudioBuffer();
    }
  }

  /**
   * Spielt Audio-Buffer ab (mit Queue für overlap-prevention)
   * @param audioBuffer MP3-Audio-Daten
   */
  async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
    // Zur Playback-Queue hinzufügen
    this.playbackQueue = this.playbackQueue.then(async () => {
      try {
        const audioContext = await this.initAudioContext();

        // MP3 dekodieren
        const decodedAudio = await audioContext.decodeAudioData(audioBuffer.slice(0));

        // Audio-Source erstellen und abspielen
        const source = audioContext.createBufferSource();
        source.buffer = decodedAudio;
        source.connect(audioContext.destination);
        source.start();

        console.log('🔊 Sichere Audio-Wiedergabe - Dauer:', decodedAudio.duration.toFixed(1), 's');

        // Promise für Wiedergabe-Ende
        return new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            console.warn('⚠️ Audio-Wiedergabe Timeout');
            reject(new Error('Audio playback timeout'));
          }, Math.max(10000, decodedAudio.duration * 1000 + 2000));

          source.onended = () => {
            clearTimeout(timeout);
            console.log('✅ Audio-Wiedergabe beendet');
            resolve();
          };
        });
      } catch (error) {
        console.error('❌ Audio-Wiedergabe Fehler:', error);
        throw error;
      }
    });

    return this.playbackQueue;
  }

  /**
   * Hauptmethode: Sichere deutsche TTS mit Caching
   * @param text Navigation-Text
   * @param type Art der Ansage
   */
  async speak(text: string, type: NavigationType = 'direction'): Promise<void> {
    try {
      console.log('🎤 TTS SPEAK REQUEST:', { text: text.slice(0, 50) + '...', type });

      // Cache-Prüfung
      const cacheKey = this.getCacheKey(text, type);
      let audioBuffer = this.audioCache.get(cacheKey);

      if (!audioBuffer) {
        // Neue TTS-Generierung
        console.log('🌐 Generating new TTS audio...');
        audioBuffer = await this.generateTTS(text, type);
        this.addToCache(cacheKey, audioBuffer);
        console.log('✅ TTS audio generated and cached');
      } else {
        console.log('💾 TTS aus Cache verwendet:', text.slice(0, 50) + '...');
      }

      // FALLBACK: Use HTML5 Audio for better browser compatibility
      try {
        const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);

        // Configure audio for optimal playback
        audio.autoplay = true;
        audio.volume = 1.0;
        audio.preload = 'auto';

        // Queue-Management für sequenzielle Wiedergabe
        this.playbackQueue = this.playbackQueue.then(() => {
          return new Promise<void>((resolve, reject) => {
            const cleanup = () => {
              URL.revokeObjectURL(audioUrl);
            };

            audio.onended = () => {
              console.log('🔊 TTS HTML5 Audio beendet:', text.slice(0, 30) + '...');
              cleanup();
              resolve();
            };

            audio.onerror = (error) => {
              console.error('❌ HTML5 Audio Error:', error);
              cleanup();
              reject(new Error('Audio playback failed'));
            };

            audio.oncanplaythrough = () => {
              console.log('🔊 TTS HTML5 Audio ready to play');
            };

            // Attempt playback
            const playPromise = audio.play();

            if (playPromise !== undefined) {
              playPromise.then(() => {
                console.log('🔊 TTS HTML5 Audio gestartet:', text.slice(0, 50) + '...');
              }).catch((playError) => {
                console.error('❌ HTML5 Audio Play Error:', playError);
                console.warn('⚠️ Browser blockiert Auto-Play. User-Interaktion erforderlich.');
                cleanup();
                reject(new Error('Audio play blocked by browser policy'));
              });
            }
          });
        });

        await this.playbackQueue;
      } catch (audioError) {
        console.error('❌ HTML5 Audio fallback failed:', audioError);

        // SECONDARY FALLBACK: Try AudioContext
        try {
          console.log('🔄 Trying AudioContext fallback...');
          const audioContext = await this.initAudioContext();
          const audioData = await audioContext.decodeAudioData(audioBuffer.slice(0));

          const source = audioContext.createBufferSource();
          source.buffer = audioData;
          source.connect(audioContext.destination);

          await new Promise<void>((resolve, reject) => {
            source.onended = () => {
              console.log('🔊 TTS AudioContext beendet:', text.slice(0, 30) + '...');
              resolve();
            };

            try {
              source.start();
              console.log('🔊 TTS AudioContext gestartet:', text.slice(0, 50) + '...');
            } catch (startError) {
              console.error('❌ AudioContext start error:', startError);
              reject(startError);
            }
          });
        } catch (contextError) {
          console.error('❌ AudioContext fallback also failed:', contextError);
          throw new Error('All audio playback methods failed');
        }
      }
    } catch (error) {
      console.error('❌ Secure TTS Error:', error);
      throw error;
    }
  }

  /**
   * Test der TTS-Verbindung
   */
  async testConnection(): Promise<TTSResponse> {
    try {
      const response = await fetch('/api/tts/test');
      const data: TTSResponse = await response.json();

      console.log('🧪 TTS Connection Test:', data);
      return data;
    } catch (error) {
      console.error('❌ TTS Connection Test Error:', error);
      return {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Cache-Management
   */
  private getCacheKey(text: string, type: NavigationType): string {
    return btoa(unescape(encodeURIComponent(`${type}:${text}`))).slice(0, 20);
  }

  private addToCache(key: string, audioBuffer: ArrayBuffer): void {
    // Cache-Größe begrenzen
    if (this.audioCache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.audioCache.keys().next().value;
      this.audioCache.delete(oldestKey);
    }

    this.audioCache.set(key, audioBuffer);
    console.log('💾 TTS Cache - Größe:', this.audioCache.size);
  }

  /**
   * Cache-Statistiken für Debugging
   */
  getCacheStats(): { size: number; totalSizeKB: number } {
    let totalBytes = 0;
    for (const audioBuffer of Array.from(this.audioCache.values())) {
      totalBytes += audioBuffer.byteLength;
    }

    return {
      size: this.audioCache.size,
      totalSizeKB: Math.round(totalBytes / 1024)
    };
  }

  /**
   * Cache leeren
   */
  clearCache(): void {
    this.audioCache.clear();
    console.log('🗑️ TTS-Cache geleert');
  }

  /**
   * Deutsche Stimmen abrufen - nur George und Lily
   */
  async getGermanVoices(): Promise<Voice[]> {
    try {
      const response = await fetch('/api/tts/voices/german');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Deutsche Stimmen konnten nicht abgerufen werden');
      }

      const data = await response.json();
      let voices = data.voices || [];

      // Client-seitige Filterung für nur George und Lily
      voices = voices.filter((voice: any) => {
        const name = (voice.name || '').toLowerCase();
        return name.includes('george') || name.includes('lily');
      });

      console.log('🎤 George & Lily Stimmen von API erhalten:', voices.length);
      console.log('🔍 Verfügbare Stimmen:', voices.map((v: any) => v.name));
      return voices;
    } catch (error) {
      console.error('❌ Fehler beim Abrufen deutscher Stimmen:', error);
      throw error;
    }
  }

  /**
   * Stimme wechseln
   */
  async setVoice(voiceId: string): Promise<boolean> {
    try {
      const response = await fetch('/api/tts/voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ voiceId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Stimmenwechsel fehlgeschlagen');
      }

      const data = await response.json();
      this.currentVoiceId = data.currentVoice;

      // Cache leeren bei Stimmenwechsel
      this.clearCache();
      console.log('🎤 Stimme gewechselt und Cache geleert:', voiceId);

      return true;
    } catch (error) {
      console.error('❌ Stimmenwechsel-Fehler:', error);
      throw error;
    }
  }

  /**
   * Aktuelle Stimmen-ID abrufen
   */
  getCurrentVoiceId(): string {
    return this.currentVoiceId;
  }

  /**
   * Cleanup (bei Component unmount)
   */
  cleanup(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      console.log('🧹 Audio-Context cleanup');
    }
    this.clearCache();
  }
}