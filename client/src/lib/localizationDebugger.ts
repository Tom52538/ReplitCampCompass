
export interface LocalizationDebugLog {
  timestamp: string;
  component: string;
  poiId: string;
  poiName: string;
  userLanguage: string;
  detectedLanguage: string;
  enrichmentLanguage?: string;
  originalData?: any;
  translatedData?: any;
  translationPath: string;
  issues: string[];
}

export class LocalizationDebugger {
  private static logs: LocalizationDebugLog[] = [];
  private static isEnabled = true;

  static log(entry: Omit<LocalizationDebugLog, 'timestamp'>) {
    if (!this.isEnabled) return;

    const logEntry: LocalizationDebugLog = {
      ...entry,
      timestamp: new Date().toISOString()
    };

    this.logs.push(logEntry);
    
    // Console output for immediate debugging
    console.group(`🌐 LOCALIZATION DEBUG: ${entry.component}`);
    console.log('POI:', entry.poiName, `(${entry.poiId})`);
    console.log('User Language:', entry.userLanguage);
    console.log('Detected Language:', entry.detectedLanguage);
    console.log('Translation Path:', entry.translationPath);
    
    if (entry.issues.length > 0) {
      console.warn('🚨 ISSUES FOUND:', entry.issues);
    }
    
    if (entry.originalData) {
      console.log('Original Data:', entry.originalData);
    }
    
    if (entry.translatedData) {
      console.log('Translated Data:', entry.translatedData);
    }
    
    console.groupEnd();
  }

  static analyzeEnrichmentData(poi: any, enrichmentData: any, userLanguage: string) {
    const issues: string[] = [];
    
    // Check for language mixing in description
    if (enrichmentData?.description) {
      if (this.detectLanguageMix(enrichmentData.description)) {
        issues.push('Mixed language detected in description');
      }
      
      if (userLanguage === 'de' && this.isEnglishText(enrichmentData.description)) {
        issues.push('German user but English description provided');
      }
      
      if (userLanguage === 'en' && this.isGermanText(enrichmentData.description)) {
        issues.push('English user but German description provided');
      }
    }

    // Check features array
    if (enrichmentData?.features && Array.isArray(enrichmentData.features)) {
      const hasEnglishFeatures = enrichmentData.features.some(f => this.isEnglishText(f));
      const hasGermanFeatures = enrichmentData.features.some(f => this.isGermanText(f));
      
      if (hasEnglishFeatures && hasGermanFeatures) {
        issues.push('Mixed language in features array');
      }
      
      if (userLanguage === 'de' && hasEnglishFeatures && !hasGermanFeatures) {
        issues.push('German user but only English features');
      }
    }

    // Check price info
    if (enrichmentData?.price_info && userLanguage === 'de' && this.isEnglishText(enrichmentData.price_info)) {
      issues.push('German user but English price info');
    }

    // Check name consistency
    if (enrichmentData?.name && poi?.name) {
      if (enrichmentData.name !== poi.name && !this.areNamesEquivalent(enrichmentData.name, poi.name)) {
        issues.push('Name mismatch between POI and enrichment data');
      }
    }

    this.log({
      component: 'EnrichmentAnalysis',
      poiId: poi?.id || 'unknown',
      poiName: poi?.name || 'unknown',
      userLanguage,
      detectedLanguage: this.detectPrimaryLanguage(enrichmentData?.description || ''),
      enrichmentLanguage: this.detectEnrichmentLanguage(enrichmentData),
      originalData: enrichmentData,
      translationPath: 'enrichment-analysis',
      issues
    });

    return issues;
  }

  static analyzePOIMapping(poi: any, enrichmentKey: string, foundEnrichment: any) {
    const issues: string[] = [];
    
    // Check if POI category matches enrichment type
    if (poi.category && foundEnrichment?.type && poi.category !== foundEnrichment.type) {
      issues.push(`Category mismatch: POI(${poi.category}) vs Enrichment(${foundEnrichment.type})`);
    }

    // Check roompot_category consistency
    if (poi.roompot_category && !enrichmentKey.includes(poi.roompot_category.toLowerCase().replace(/\s+/g, '-'))) {
      issues.push(`Roompot category mismatch: ${poi.roompot_category} not reflected in key ${enrichmentKey}`);
    }

    // Check lodge number consistency for lodges
    if (poi.category === 'lodge' && poi.lodge_number && !enrichmentKey.includes(poi.lodge_number)) {
      issues.push(`Lodge number mismatch: POI lodge_number(${poi.lodge_number}) not in key(${enrichmentKey})`);
    }

    this.log({
      component: 'POIMapping',
      poiId: poi?.id || 'unknown',
      poiName: poi?.name || 'unknown',
      userLanguage: 'analysis',
      detectedLanguage: 'n/a',
      originalData: { poi, enrichmentKey, foundEnrichment },
      translationPath: 'poi-mapping-analysis',
      issues
    });

    return issues;
  }

  private static detectLanguageMix(text: string): boolean {
    const englishWords = ['the', 'and', 'for', 'with', 'perfect', 'modern', 'comfortable', 'families', 'seeking'];
    const germanWords = ['die', 'der', 'und', 'für', 'mit', 'perfekt', 'modern', 'komfortabel', 'familien'];
    
    const lowerText = text.toLowerCase();
    const hasEnglish = englishWords.some(word => lowerText.includes(word));
    const hasGerman = germanWords.some(word => lowerText.includes(word));
    
    return hasEnglish && hasGerman;
  }

  private static isEnglishText(text: string): boolean {
    const englishIndicators = ['comfortable', 'perfect', 'seeking', 'families', 'modern', 'premium', 'ideal'];
    const lowerText = text.toLowerCase();
    return englishIndicators.some(indicator => lowerText.includes(indicator));
  }

  private static isGermanText(text: string): boolean {
    const germanIndicators = ['komfortabel', 'perfekt', 'familien', 'moderne', 'ideal', 'suchen', 'unterkunft'];
    const lowerText = text.toLowerCase();
    return germanIndicators.some(indicator => lowerText.includes(indicator));
  }

  private static detectPrimaryLanguage(text: string): string {
    if (this.isGermanText(text)) return 'de';
    if (this.isEnglishText(text)) return 'en';
    return 'unknown';
  }

  private static detectEnrichmentLanguage(enrichmentData: any): string {
    if (enrichmentData?.description) {
      return this.detectPrimaryLanguage(enrichmentData.description);
    }
    return 'unknown';
  }

  private static areNamesEquivalent(name1: string, name2: string): boolean {
    // Normalize names for comparison
    const normalize = (name: string) => name.toLowerCase().replace(/\s+/g, ' ').trim();
    return normalize(name1) === normalize(name2);
  }

  static getIssueReport(): { summary: any, details: LocalizationDebugLog[] } {
    const issuesByComponent = this.logs.reduce((acc, log) => {
      if (log.issues.length > 0) {
        acc[log.component] = (acc[log.component] || 0) + log.issues.length;
      }
      return acc;
    }, {} as Record<string, number>);

    const languageMismatchCount = this.logs.filter(log => 
      log.issues.some(issue => issue.includes('language') || issue.includes('mismatch'))
    ).length;

    return {
      summary: {
        totalLogs: this.logs.length,
        totalIssues: this.logs.reduce((sum, log) => sum + log.issues.length, 0),
        issuesByComponent,
        languageMismatchCount,
        lastAnalyzed: new Date().toISOString()
      },
      details: this.logs.filter(log => log.issues.length > 0)
    };
  }

  static clearLogs() {
    this.logs = [];
  }

  static enable() {
    this.isEnabled = true;
  }

  static disable() {
    this.isEnabled = false;
  }
}

// Global access for debugging
(window as any).localizationDebugger = LocalizationDebugger;
