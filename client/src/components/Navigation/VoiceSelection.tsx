/**
 * Stimmen-Auswahl-Komponente für ElevenLabs TTS
 * Ermöglicht Benutzern, zwischen verfügbaren Stimmen zu wechseln
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Volume2, VolumeX, Play, RefreshCw, Check, X, Loader2 } from 'lucide-react';

interface Voice {
  voice_id: string;
  name: string;
  category: string;
  labels?: {
    gender?: string;
    language?: string;
    accent?: string;
    age?: string;
    use_case?: string;
  };
  description?: string;
}

interface VoiceSelectionProps {
  isVoiceEnabled: boolean;
  onToggleVoice: () => void;
  className?: string;
}

export const VoiceSelection: React.FC<VoiceSelectionProps> = ({
  isVoiceEnabled,
  onToggleVoice,
  className = ''
}) => {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [currentVoiceId, setCurrentVoiceId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [testingVoice, setTestingVoice] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string>('');

  // Deutsche Stimmen beim Laden abrufen
  useEffect(() => {
    loadGermanVoices();
  }, []);

  const loadGermanVoices = async () => {
    try {
      setLoading(true);
      setError('');
      
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
      
      setVoices(voicesData);
      setCurrentVoiceId(data.currentVoice || '');
      
      console.log('🎤 George & Lily Stimmen geladen:', voicesData.length);
      console.log('🔍 Verfügbare Stimmen:', voicesData.map(v => v.name));
    } catch (error) {
      console.error('❌ Fehler beim Laden der Stimmen:', error);
      setError('Stimmen konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceChange = async (voiceId: string) => {
    try {
      setLoading(true);
      setError('');
      
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
      setCurrentVoiceId(data.currentVoice);
      
      console.log('✅ Stimme gewechselt zu:', voiceId);
      
      // Kurze Bestätigung abspielen
      await testVoice(voiceId, 'Neue Stimme aktiviert');
      
    } catch (error) {
      console.error('❌ Stimmenwechsel-Fehler:', error);
      setError(error instanceof Error ? error.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  const testVoice = async (voiceId?: string, customText?: string) => {
    const targetVoiceId = voiceId || currentVoiceId;
    if (!targetVoiceId) return;
    
    try {
      setTestingVoice(targetVoiceId);
      
      // Falls nicht die aktuelle Stimme, temporär wechseln für Test
      if (voiceId && voiceId !== currentVoiceId) {
        await fetch('/api/tts/voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voiceId })
        });
      }
      
      // Test-Audio generieren
      const testText = customText || 'Hallo, das ist eine Stimm-Probe für die Navigation';
      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: testText, 
          type: 'direction' 
        })
      });
      
      if (response.ok) {
        const audioBuffer = await response.arrayBuffer();
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioData = await audioContext.decodeAudioData(audioBuffer);
        const source = audioContext.createBufferSource();
        source.buffer = audioData;
        source.connect(audioContext.destination);
        source.start();
        
        console.log('🔊 Stimm-Probe abgespielt:', targetVoiceId);
      }
      
    } catch (error) {
      console.error('❌ Stimm-Test Fehler:', error);
    } finally {
      setTestingVoice(null);
    }
  };

  const getVoiceDisplayInfo = (voice: Voice) => {
    const labels = voice.labels || {};
    const gender = labels.gender ? (labels.gender === 'male' ? '♂️' : '♀️') : '👤';
    const language = labels.language || 'Unbekannt';
    const accent = labels.accent || '';
    
    return {
      gender,
      language,
      accent,
      displayName: `${gender} ${voice.name}`,
      subtitle: accent ? `${language} (${accent})` : language
    };
  };

  if (!isExpanded) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Button
          onClick={onToggleVoice}
          variant={isVoiceEnabled ? "default" : "outline"}
          size="sm"
          className="min-w-[100px]"
        >
          {isVoiceEnabled ? <Volume2 className="w-4 h-4 mr-1" /> : <VolumeX className="w-4 h-4 mr-1" />}
          {isVoiceEnabled ? 'TTS Ein' : 'TTS Aus'}
        </Button>
        
        {isVoiceEnabled && (
          <Button
            onClick={() => setIsExpanded(true)}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Stimme
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={`w-80 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            Stimmen-Auswahl
          </CardTitle>
          <Button
            onClick={() => setIsExpanded(false)}
            variant="ghost"
            size="sm"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* TTS Ein/Aus Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Text-zu-Sprache</span>
          <Button
            onClick={onToggleVoice}
            variant={isVoiceEnabled ? "default" : "outline"}
            size="sm"
          >
            {isVoiceEnabled ? <Volume2 className="w-4 h-4 mr-1" /> : <VolumeX className="w-4 h-4 mr-1" />}
            {isVoiceEnabled ? 'Ein' : 'Aus'}
          </Button>
        </div>

        {isVoiceEnabled && (
          <>
            {/* Stimmen laden Button */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {voices.length} deutsche Stimmen verfügbar
              </span>
              <Button
                onClick={loadGermanVoices}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Aktualisieren
              </Button>
            </div>

            {/* Stimmen-Auswahl */}
            {voices.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Stimme auswählen:</label>
                <Select
                  value={currentVoiceId}
                  onValueChange={handleVoiceChange}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Stimme wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {voices.map((voice) => {
                      const info = getVoiceDisplayInfo(voice);
                      return (
                        <SelectItem key={voice.voice_id} value={voice.voice_id}>
                          <div className="flex items-center gap-2">
                            <span>{info.displayName}</span>
                            {voice.voice_id === currentVoiceId && (
                              <Check className="w-3 h-3 text-green-500" />
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Aktuelle Stimme Info & Test */}
            {currentVoiceId && voices.length > 0 && (
              <div className="p-3 bg-gray-50 rounded-lg">
                {(() => {
                  const currentVoice = voices.find(v => v.voice_id === currentVoiceId);
                  if (!currentVoice) return null;
                  
                  const info = getVoiceDisplayInfo(currentVoice);
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{info.displayName}</div>
                          <div className="text-sm text-gray-600">{info.subtitle}</div>
                        </div>
                        <Button
                          onClick={() => testVoice()}
                          variant="outline"
                          size="sm"
                          disabled={testingVoice === currentVoiceId}
                        >
                          {testingVoice === currentVoiceId ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                          Test
                        </Button>
                      </div>
                      
                      {currentVoice.description && (
                        <p className="text-xs text-gray-500">{currentVoice.description}</p>
                      )}
                      
                      {/* Labels */}
                      <div className="flex flex-wrap gap-1">
                        {currentVoice.labels?.gender && (
                          <Badge variant="secondary" className="text-xs">
                            {currentVoice.labels.gender}
                          </Badge>
                        )}
                        {currentVoice.labels?.accent && (
                          <Badge variant="outline" className="text-xs">
                            {currentVoice.labels.accent}
                          </Badge>
                        )}
                        {currentVoice.labels?.age && (
                          <Badge variant="outline" className="text-xs">
                            {currentVoice.labels.age}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Fehler anzeigen */}
            {error && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                {error}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};