/**
 * Kompakte Stimmen-Auswahl für die Navigation
 * Einfache UI für Stimmenwechsel bei ElevenLabs TTS
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Volume2, VolumeX, Play, Loader2, Mic } from 'lucide-react';

interface Voice {
  voice_id: string;
  name: string;
  labels?: {
    gender?: string;
    language?: string;
    accent?: string;
  };
}

interface VoiceControlPanelProps {
  isVoiceEnabled: boolean;
  onToggleVoice: () => void;
  className?: string;
  onClose?: () => void;
}

// Cache-Konstanten
const VOICES_CACHE_KEY = 'elevenlabs_selected_voices';
const CACHE_DURATION = 1000 * 60 * 60; // 1 Stunde

// Cache-Interface
interface VoicesCache {
  voices: Voice[];
  currentVoice: string;
  timestamp: number;
}

export const VoiceControlPanel: React.FC<VoiceControlPanelProps> = ({
  isVoiceEnabled,
  onToggleVoice,
  className = '',
  onClose
}) => {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [currentVoiceId, setCurrentVoiceId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [testingVoice, setTestingVoice] = useState(false);
  const [showVoiceSelect, setShowVoiceSelect] = useState(false);
  const [cacheStatus, setCacheStatus] = useState<'none' | 'loading' | 'cached' | 'expired'>('none');

  // Intelligentes Caching: Nur einmalig laden
  useEffect(() => {
    if (isVoiceEnabled && voices.length === 0) {
      loadGermanVoicesWithCache();
    }
  }, [isVoiceEnabled]);

  // Cache-Hilfsfunktionen
  const getCachedVoices = (): VoicesCache | null => {
    try {
      const cached = localStorage.getItem(VOICES_CACHE_KEY);
      if (!cached) return null;
      
      const parsedCache: VoicesCache = JSON.parse(cached);
      const isExpired = Date.now() - parsedCache.timestamp > CACHE_DURATION;
      
      if (isExpired) {
        localStorage.removeItem(VOICES_CACHE_KEY);
        setCacheStatus('expired');
        return null;
      }
      
      setCacheStatus('cached');
      return parsedCache;
    } catch (error) {
      console.warn('Cache-Lesefehler:', error);
      localStorage.removeItem(VOICES_CACHE_KEY);
      return null;
    }
  };

  const setCachedVoices = (voices: Voice[], currentVoice: string) => {
    try {
      const cacheData: VoicesCache = {
        voices,
        currentVoice,
        timestamp: Date.now()
      };
      localStorage.setItem(VOICES_CACHE_KEY, JSON.stringify(cacheData));
      setCacheStatus('cached');
      console.log('💾 Stimmen in Cache gespeichert:', voices.length);
    } catch (error) {
      console.warn('Cache-Schreibfehler:', error);
    }
  };

  const loadGermanVoicesWithCache = async () => {
    // 1. Versuche Cache-Load
    const cached = getCachedVoices();
    if (cached && cached.voices) {
      // Cache-Validierung: Nur George und Lily
      const validVoices = cached.voices.filter(voice => {
        const name = (voice.name || '').toLowerCase();
        return name.includes('george') || name.includes('lily');
      });
      
      if (validVoices.length > 0) {
        setVoices(validVoices);
        setCurrentVoiceId(cached.currentVoice);
        console.log('⚡ George & Lily aus Cache geladen:', validVoices.length);
        return;
      }
    }

    // 2. Fallback: API-Load
    await loadGermanVoicesFromAPI();
  };

  const loadGermanVoicesFromAPI = async () => {
    try {
      setLoading(true);
      setCacheStatus('loading');
      
      const response = await fetch('/api/tts/voices/german');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      let voicesData = data.voices || [];
      
      // Client-seitige Filterung für nur George und Lily
      voicesData = voicesData.filter(voice => {
        const name = (voice.name || '').toLowerCase();
        return name.includes('george') || name.includes('lily');
      });
      
      const currentVoice = data.currentVoice || '';
      
      setVoices(voicesData);
      setCurrentVoiceId(currentVoice);
      
      // In Cache speichern für zukünftige Nutzung
      setCachedVoices(voicesData, currentVoice);
      
      console.log('🎤 George & Lily Stimmen geladen:', voicesData.length);
      console.log('🔍 Verfügbare Stimmen:', voicesData.map(v => v.name));
    } catch (error) {
      console.error('❌ Fehler beim Laden der Stimmen:', error);
      setCacheStatus('none');
    } finally {
      setLoading(false);
    }
  };

  const refreshVoices = async () => {
    // Cache leeren und neu laden
    localStorage.removeItem(VOICES_CACHE_KEY);
    setCacheStatus('none');
    await loadGermanVoicesFromAPI();
  };

  const handleVoiceChange = async (voiceId: string) => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/tts/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceId })
      });
      
      if (!response.ok) return;
      
      const data = await response.json();
      setCurrentVoiceId(data.currentVoice);
      
      console.log('✅ Stimme gewechselt zu:', voiceId);
      
      // Kurze Bestätigung abspielen
      await testVoice('Neue Stimme aktiviert');
      
    } catch (error) {
      console.error('❌ Stimmenwechsel-Fehler:', error);
    } finally {
      setLoading(false);
    }
  };

  const testVoice = async (customText?: string) => {
    if (!currentVoiceId || testingVoice) return;
    
    try {
      setTestingVoice(true);
      console.log('🎤 Starte TTS Test...');
      
      const testText = customText || 'Das ist eine Stimm-Probe für die Navigation';
      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: testText, type: 'direction' })
      });
      
      if (response.ok) {
        console.log('✅ TTS Audio empfangen');
        const audioBuffer = await response.arrayBuffer();
        
        // Audio über HTML5 Audio Element statt AudioContext
        const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        
        // AudioContext-Problem umgehen
        audio.autoplay = true;
        audio.volume = 1.0;
        
        // Promise für Audio-Wiedergabe
        try {
          await audio.play();
          console.log('🔊 Stimm-Probe erfolgreich abgespielt');
        } catch (playError) {
          console.warn('⚠️ Direkte Wiedergabe fehlgeschlagen:', playError);
          // Fallback: User muss klicken
          console.log('💡 Tipp: Browser blockiert Auto-Play. Aktiviere TTS zuerst durch Klick.');
        }
        
        // Cleanup nach Wiedergabe
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
        };
        
      } else {
        console.error('❌ TTS Response Fehler:', response.status);
      }
      
    } catch (error) {
      console.error('❌ Stimm-Test Fehler:', error);
    } finally {
      setTestingVoice(false);
    }
  };

  const getVoiceDisplayName = (voice: Voice) => {
    const gender = voice.labels?.gender ? (voice.labels.gender === 'male' ? '♂️' : '♀️') : '👤';
    return `${gender} ${voice.name}`;
  };

  // Wenn onClose vorhanden ist, immer die vollständige Ansicht zeigen  
  if (!onClose && !showVoiceSelect) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Button
          onClick={async () => {
            if (voices.length === 0) {
              await loadGermanVoicesWithCache();
            }
            setShowVoiceSelect(true);
          }}
          variant="outline"
          size="sm"
          disabled={loading}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
          Stimme
        </Button>
      </div>
    );
  }

  return (
    <Card className={`w-64 sm:w-72 max-h-80 ${className}`}>
      <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3 overflow-y-auto max-h-72">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            <span className="font-medium">Stimmen-Auswahl</span>
          </div>
          <Button
            onClick={() => {
              if (onClose) {
                onClose();
              } else {
                setShowVoiceSelect(false);
              }
            }}
            variant="ghost"
            size="sm"
          >
            ×
          </Button>
        </div>

        {/* TTS Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm">Text-zu-Sprache</span>
          <Button
            onClick={onToggleVoice}
            variant={isVoiceEnabled ? "default" : "outline"}
            size="sm"
          >
            {isVoiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
        </div>

        {isVoiceEnabled && (
          <>
            {/* Stimmen-Auswahl */}
            {voices.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Stimme:</label>
                <div className="flex gap-2 relative">
                  <Select
                    value={currentVoiceId}
                    onValueChange={handleVoiceChange}
                    disabled={loading}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Stimme wählen..." />
                    </SelectTrigger>
                    <SelectContent 
                      position="popper" 
                      sideOffset={4}
                      className="z-[9999] max-h-56 overflow-y-auto overscroll-contain touch-pan-y will-change-[transform,opacity]" 
                      style={{ WebkitOverflowScrolling: 'touch' }}
                    >
                      {voices.map((voice) => (
                        <SelectItem key={voice.voice_id} value={voice.voice_id}>
                          {getVoiceDisplayName(voice)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button
                    onClick={() => testVoice()}
                    variant="outline"
                    size="sm"
                    disabled={testingVoice || !currentVoiceId}
                  >
                    {testingVoice ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Navigation Test-Sequenz */}
            <div className="space-y-2">
              <Button
                onClick={async () => {
                  if (!currentVoiceId) return;
                  console.log('🧪 Starte Navigation Test-Sequenz...');
                  
                  // Simuliere komplette Navigation mit Timing
                  await testVoice('Navigation gestartet. Geradeaus weiterfahren für 200 Meter');
                  setTimeout(() => testVoice('In 100 Metern links abbiegen'), 2000);
                  setTimeout(() => testVoice('Gleich links abbiegen'), 4000);
                  setTimeout(() => testVoice('Links abbiegen auf Geilenkirchener Straße'), 6000);
                  setTimeout(() => testVoice('Sie haben Ihr Ziel erreicht'), 8000);
                }}
                variant="outline"
                size="sm"
                className="w-full"
                disabled={testingVoice || !currentVoiceId}
              >
                🎯 Navigation Testen
              </Button>
            </div>

            {/* Cache-Status und Aktualisieren-Button */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">
                {voices.length > 0 ? (
                  <>
                    {`${voices.length} Stimmen `}
                    {cacheStatus === 'cached' && '💾'}
                    {cacheStatus === 'loading' && '⏳'}
                    {cacheStatus === 'expired' && '⚠️'}
                  </>
                ) : (
                  'Lade Stimmen...'
                )}
              </span>
              
              {voices.length > 0 && (
                <Button
                  onClick={refreshVoices}
                  variant="ghost"
                  size="sm"
                  className="text-xs p-1 h-6"
                  disabled={loading}
                >
                  🔄
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};