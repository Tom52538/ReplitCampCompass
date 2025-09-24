/**
 * Deutscher Text-Optimierer für natürliche Sprachausgabe
 * Optimiert deutsche Navigation-Texte für bessere TTS-Verständlichkeit
 */

export class GermanTextOptimizer {
  
  /**
   * Optimiert deutschen Text für natürliche Sprachausgabe
   * @param text Ursprünglicher deutscher Text
   * @returns Optimierter Text für TTS
   */
  optimizeForSpeech(text: string): string {
    let optimizedText = text;
    
    // 1. Straßennamen-Optimierung für korrekte Aussprache
    optimizedText = optimizedText
      .replace(/straße/gi, 'Straße')
      .replace(/platz/gi, 'Platz')
      .replace(/weg/gi, 'Weg')
      .replace(/gasse/gi, 'Gasse')
      .replace(/allee/gi, 'Allee')
      .replace(/ring/gi, 'Ring');
    
    // 2. Pausen für bessere Verständlichkeit hinzufügen
    optimizedText = optimizedText
      .replace(/(Straße|Platz|Weg|Gasse|Allee|Ring)/g, '$1,')
      .replace(/(\d+)\s*(Meter|meter|m)\b/gi, '$1 Meter,')
      .replace(/(\d+)\s*(Kilometer|kilometer|km)\b/gi, '$1 Kilometer,');
    
    // 3. Zahlen für bessere Aussprache optimieren
    optimizedText = optimizedText
      .replace(/\b1\b/g, 'eins')
      .replace(/\b2\b/g, 'zwei')
      .replace(/\b3\b/g, 'drei')
      .replace(/\b4\b/g, 'vier')
      .replace(/\b5\b/g, 'fünf')
      .replace(/\b10\b/g, 'zehn')
      .replace(/\b50\b/g, 'fünfzig')
      .replace(/\b100\b/g, 'hundert')
      .replace(/\b200\b/g, 'zweihundert')
      .replace(/\b300\b/g, 'dreihundert')
      .replace(/\b500\b/g, 'fünfhundert');
    
    // 4. Navigation-spezifische Verbesserungen (SICHER - bewahrt Straßennamen)
    optimizedText = optimizedText
      // Sichere Artikel-Verbesserungen ohne Straßennamen-Verstümmelung
      .replace(/\bin\s+(der|die|das)\s+/gi, 'in die ')
      .replace(/\bauf\s+(der|die|das)\s+/gi, 'auf die ')
      // Keine aggressive bei/in/auf Ersetzung - zu gefährlich für Straßennamen!
    
    // 5. Doppelte Kommata und Leerzeichen bereinigen
    optimizedText = optimizedText
      .replace(/,\s*,/g, ',')
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log('✍️ Text optimiert:', text, '→', optimizedText);
    return optimizedText;
  }
  
  /**
   * Fügt emotionale Betonung für verschiedene Navigation-Typen hinzu
   * @param text Optimierter Grundtext
   * @param type Art der Navigation-Ansage
   * @returns Text mit emotionaler Betonung
   */
  addNavigationEmotion(text: string, type: 'direction' | 'warning' | 'arrival' | 'start'): string {
    switch (type) {
      case 'direction':
        return text; // Neutral für normale Richtungsansagen
        
      case 'warning':
        return `Achtung: ${text}`;
        
      case 'arrival':
        return `${text}. Herzlichen Glückwunsch!`;
        
      case 'start':
        return `Navigation gestartet. ${text}`;
        
      default:
        return text;
    }
  }
  
  /**
   * Erstellt natürliche deutsche Turn-by-Turn Anweisungen
   * @param direction Richtung (left, right, straight)
   * @param streetName Name der Straße (wird SICHER behandelt)
   * @param distance Entfernung in Metern
   * @returns Natürliche deutsche Anweisung
   */
  createTurnInstruction(direction: 'left' | 'right' | 'straight', streetName?: string, distance?: number): string {
    let instruction = '';
    
    // Richtungsanweisung
    switch (direction) {
      case 'left':
        instruction = 'Links abbiegen';
        break;
      case 'right':
        instruction = 'Rechts abbiegen';
        break;
      case 'straight':
        instruction = 'Geradeaus fahren';
        break;
    }
    
    // Straßenname SICHER hinzufügen (KEINE Text-Verstümmelung!)
    if (streetName && streetName.trim()) {
      const cleanStreetName = streetName.trim();
      if (direction === 'straight') {
        instruction = `Auf ${cleanStreetName} geradeaus fahren`;
      } else {
        instruction = `${instruction} auf ${cleanStreetName}`;
      }
    }
    
    // Entfernungsangabe hinzufügen
    if (distance && distance > 0) {
      if (distance < 50) {
        instruction = `In wenigen Metern ${instruction.toLowerCase()}`;
      } else if (distance < 200) {
        instruction = `In ${distance} Metern ${instruction.toLowerCase()}`;
      } else {
        instruction = `In etwa ${Math.round(distance / 50) * 50} Metern ${instruction.toLowerCase()}`;
      }
    }
    
    // Nur SICHERE Optimierungen anwenden (keine Regex-Verstümmelung)
    return this.optimizeForSpeechSafe(instruction);
  }
  
  /**
   * SICHERE Text-Optimierung ohne Straßennamen-Verstümmelung
   * @param text Ursprünglicher Text
   * @returns Sicher optimierter Text
   */
  private optimizeForSpeechSafe(text: string): string {
    let optimizedText = text;
    
    // 1. Nur SICHERE Straßen-Typ Optimierung
    optimizedText = optimizedText
      .replace(/straße/gi, 'Straße')
      .replace(/platz/gi, 'Platz')
      .replace(/weg/gi, 'Weg')
      .replace(/gasse/gi, 'Gasse')
      .replace(/allee/gi, 'Allee')
      .replace(/ring/gi, 'Ring');
    
    // 2. Sichere Pausen-Optimierung
    optimizedText = optimizedText
      .replace(/(\d+)\s*(Meter|meter|m)\b/gi, '$1 Meter,')
      .replace(/(\d+)\s*(Kilometer|kilometer|km)\b/gi, '$1 Kilometer,');
    
    // 3. Sichere Zahlen-Optimierung
    optimizedText = optimizedText
      .replace(/\b1\b/g, 'eins')
      .replace(/\b2\b/g, 'zwei')
      .replace(/\b3\b/g, 'drei')
      .replace(/\b100\b/g, 'hundert')
      .replace(/\b200\b/g, 'zweihundert')
      .replace(/\b500\b/g, 'fünfhundert');
    
    // 4. Cleanup ohne Verstümmelung
    optimizedText = optimizedText
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log('✍️ SICHER optimiert:', text, '→', optimizedText);
    return optimizedText;
  }
  
  /**
   * Generiert Ankunfts-Ansagen
   * @param destinationName Name des Ziels
   * @returns Deutsche Ankunfts-Ansage
   */
  createArrivalInstruction(destinationName?: string): string {
    if (destinationName) {
      return this.optimizeForSpeech(`Sie haben ${destinationName} erreicht`);
    }
    return this.optimizeForSpeech('Sie haben Ihr Ziel erreicht');
  }
}