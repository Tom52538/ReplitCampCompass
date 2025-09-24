
export interface POILocalizationIssue {
  poiId: string;
  poiName: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'MAPPING' | 'LANGUAGE' | 'ENRICHMENT' | 'URL';
  description: string;
  expected: string;
  actual: string;
  fix: string;
}

export interface LocalizationAnalysisReport {
  totalPOIs: number;
  analyzedPOIs: number;
  totalIssues: number;
  issuesBySeverity: Record<string, number>;
  issuesByCategory: Record<string, number>;
  criticalPOIs: string[];
  detailedIssues: POILocalizationIssue[];
  recommendations: string[];
}

export class POILocalizationAnalyzer {
  private static readonly GERMAN_INDICATORS = [
    'komfortabel', 'perfekt', 'familien', 'moderne', 'unterkunft', 'ausstattung',
    'ideal', 'suchen', 'einzigartig', 'erlebnis', 'gäste', 'nacht', 'verfügbar',
    'wasserdorf', 'strandhäuser', 'bungalows', 'lodges', 'chalets', 'preisinformationen'
  ];

  private static readonly ENGLISH_INDICATORS = [
    'comfortable', 'perfect', 'families', 'modern', 'accommodation', 'amenities',
    'ideal', 'seeking', 'unique', 'experience', 'guests', 'night', 'available',
    'water village', 'beach houses', 'bungalows', 'lodges', 'chalets', 'pricing'
  ];

  static async analyzeCompletePOILocalization(userLanguage: string = 'de'): Promise<LocalizationAnalysisReport> {
    console.log(`🔍 STARTING COMPLETE POI LOCALIZATION ANALYSIS for language: ${userLanguage}`);
    
    const issues: POILocalizationIssue[] = [];
    let analyzedPOIs = 0;
    
    try {
      // 1. Load all POIs
      const response = await fetch('/api/pois');
      const allPOIs = await response.json();
      
      console.log(`📊 Analyzing ${allPOIs.length} POIs...`);
      
      for (const poi of allPOIs) {
        if (this.isAccommodationPOI(poi)) {
          analyzedPOIs++;
          const poiIssues = await this.analyzeSinglePOI(poi, userLanguage);
          issues.push(...poiIssues);
        }
      }

      // 2. Generate comprehensive report
      const report = this.generateReport(allPOIs.length, analyzedPOIs, issues);
      
      console.log(`📊 ANALYSIS COMPLETE:`, report);
      return report;
      
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      return {
        totalPOIs: 0,
        analyzedPOIs: 0,
        totalIssues: 0,
        issuesBySeverity: {},
        issuesByCategory: {},
        criticalPOIs: [],
        detailedIssues: [],
        recommendations: ['Analysis failed - check console for errors']
      };
    }
  }

  private static async analyzeSinglePOI(poi: any, userLanguage: string): Promise<POILocalizationIssue[]> {
    const issues: POILocalizationIssue[] = [];
    
    console.log(`🔍 Analyzing POI: ${poi.name} (${poi.id})`);
    
    try {
      // Get enrichment data for this POI
      const enrichedResponse = await fetch(`/api/pois/${poi.id}`);
      const enrichedPOI = await enrichedResponse.json();
      
      // 1. Check POI mapping correctness
      issues.push(...this.checkPOIMapping(poi, enrichedPOI));
      
      // 2. Check language consistency
      issues.push(...this.checkLanguageConsistency(poi, enrichedPOI, userLanguage));
      
      // 3. Check enrichment quality
      issues.push(...this.checkEnrichmentQuality(poi, enrichedPOI));
      
      // 4. Check URL availability and correctness
      issues.push(...this.checkURLConsistency(poi, enrichedPOI));
      
    } catch (error) {
      console.error(`❌ Failed to analyze POI ${poi.name}:`, error);
      issues.push({
        poiId: poi.id,
        poiName: poi.name,
        severity: 'HIGH',
        category: 'ENRICHMENT',
        description: 'Failed to load enrichment data',
        expected: 'Valid enrichment response',
        actual: 'API error',
        fix: 'Check server logs and enrichment data integrity'
      });
    }
    
    return issues;
  }

  private static checkPOIMapping(poi: any, enrichedPOI: any): POILocalizationIssue[] {
    const issues: POILocalizationIssue[] = [];
    
    // Check if POI has proper roompot_category
    if (this.isAccommodationPOI(poi) && !poi.roompot_category) {
      issues.push({
        poiId: poi.id,
        poiName: poi.name,
        severity: 'HIGH',
        category: 'MAPPING',
        description: 'Accommodation POI missing roompot_category',
        expected: 'Valid roompot_category (e.g., "Lodge 4", "Beach House 6A")',
        actual: 'null or undefined',
        fix: 'Add roompot_category to POI data or CSV mapping'
      });
    }

    // Check if enrichment was found
    if (this.isAccommodationPOI(poi) && !enrichedPOI.enriched) {
      issues.push({
        poiId: poi.id,
        poiName: poi.name,
        severity: 'CRITICAL',
        category: 'MAPPING',
        description: 'No enrichment data found for accommodation',
        expected: 'Enrichment data available',
        actual: 'No enrichment',
        fix: 'Verify POI name/category matches enrichment keys or add enrichment data'
      });
    }

    // Check lodge number consistency
    if (poi.category === 'lodge' && poi.lodge_number && enrichedPOI.enrichment_key) {
      const expectedKey = `lodge-${poi.lodge_number}`;
      if (!enrichedPOI.enrichment_key.includes(poi.lodge_number)) {
        issues.push({
          poiId: poi.id,
          poiName: poi.name,
          severity: 'MEDIUM',
          category: 'MAPPING',
          description: 'Lodge number mismatch between POI and enrichment',
          expected: expectedKey,
          actual: enrichedPOI.enrichment_key,
          fix: 'Verify lodge number mapping in CSV or enrichment keys'
        });
      }
    }

    return issues;
  }

  private static checkLanguageConsistency(poi: any, enrichedPOI: any, userLanguage: string): POILocalizationIssue[] {
    const issues: POILocalizationIssue[] = [];
    
    if (!enrichedPOI.enriched) return issues;
    
    // Check description language
    if (enrichedPOI.description) {
      const detectedLang = this.detectLanguage(enrichedPOI.description);
      if (detectedLang !== userLanguage && detectedLang !== 'unknown') {
        issues.push({
          poiId: poi.id,
          poiName: poi.name,
          severity: 'HIGH',
          category: 'LANGUAGE',
          description: `Description in wrong language`,
          expected: `Description in ${userLanguage}`,
          actual: `Description in ${detectedLang}`,
          fix: `Translate description to ${userLanguage} or fix language selection logic`
        });
      }
      
      // Check for mixed language
      if (this.hasMixedLanguage(enrichedPOI.description)) {
        issues.push({
          poiId: poi.id,
          poiName: poi.name,
          severity: 'HIGH',
          category: 'LANGUAGE',
          description: 'Description contains mixed languages',
          expected: `Pure ${userLanguage} text`,
          actual: 'Mixed German/English',
          fix: 'Clean up description to use single language'
        });
      }
    }

    // Check features language
    if (enrichedPOI.features && Array.isArray(enrichedPOI.features)) {
      const mixedFeatures = enrichedPOI.features.filter(feature => {
        const lang = this.detectLanguage(feature);
        return lang !== userLanguage && lang !== 'unknown';
      });
      
      if (mixedFeatures.length > 0) {
        issues.push({
          poiId: poi.id,
          poiName: poi.name,
          severity: 'MEDIUM',
          category: 'LANGUAGE',
          description: `${mixedFeatures.length} features in wrong language`,
          expected: `All features in ${userLanguage}`,
          actual: `Features: ${mixedFeatures.join(', ')}`,
          fix: 'Translate features to correct language'
        });
      }
    }

    // Check price info language
    if (enrichedPOI.price_info) {
      const detectedLang = this.detectLanguage(enrichedPOI.price_info);
      if (detectedLang !== userLanguage && detectedLang !== 'unknown') {
        issues.push({
          poiId: poi.id,
          poiName: poi.name,
          severity: 'MEDIUM',
          category: 'LANGUAGE',
          description: 'Price info in wrong language',
          expected: `Price info in ${userLanguage}`,
          actual: `Price info in ${detectedLang}`,
          fix: 'Translate price information'
        });
      }
    }

    return issues;
  }

  private static checkEnrichmentQuality(poi: any, enrichedPOI: any): POILocalizationIssue[] {
    const issues: POILocalizationIssue[] = [];
    
    if (!enrichedPOI.enriched) return issues;
    
    // Check for missing essential data
    if (!enrichedPOI.description || enrichedPOI.description.length < 10) {
      issues.push({
        poiId: poi.id,
        poiName: poi.name,
        severity: 'HIGH',
        category: 'ENRICHMENT',
        description: 'Missing or insufficient description',
        expected: 'Meaningful description (>10 chars)',
        actual: enrichedPOI.description || 'null',
        fix: 'Add proper description to enrichment data'
      });
    }

    // Check for missing features
    if (!enrichedPOI.features || enrichedPOI.features.length === 0) {
      issues.push({
        poiId: poi.id,
        poiName: poi.name,
        severity: 'MEDIUM',
        category: 'ENRICHMENT',
        description: 'No features listed',
        expected: 'List of accommodation features',
        actual: 'Empty or null',
        fix: 'Add features array to enrichment data'
      });
    }

    // Check for missing capacity
    if (this.isAccommodationPOI(poi) && !enrichedPOI.capacity?.max_persons) {
      issues.push({
        poiId: poi.id,
        poiName: poi.name,
        severity: 'MEDIUM',
        category: 'ENRICHMENT',
        description: 'Missing capacity information',
        expected: 'max_persons capacity',
        actual: 'null',
        fix: 'Add capacity data to enrichment'
      });
    }

    return issues;
  }

  private static checkURLConsistency(poi: any, enrichedPOI: any): POILocalizationIssue[] {
    const issues: POILocalizationIssue[] = [];
    
    if (!this.isAccommodationPOI(poi)) return issues;
    
    // Check for missing URL
    const hasValidURL = enrichedPOI.url || enrichedPOI.website || enrichedPOI.accommodationUrl || enrichedPOI.roompot_url;
    
    if (!hasValidURL) {
      issues.push({
        poiId: poi.id,
        poiName: poi.name,
        severity: 'HIGH',
        category: 'URL',
        description: 'No booking URL available',
        expected: 'Valid Roompot booking URL',
        actual: 'null',
        fix: 'Add URL to enrichment data or generate from accommodation_id'
      });
    }

    // Check URL format for lodges
    if (poi.category === 'lodge' && hasValidURL) {
      const url = enrichedPOI.url || enrichedPOI.website || enrichedPOI.accommodationUrl;
      if (url && !url.includes('lodge-4')) {
        issues.push({
          poiId: poi.id,
          poiName: poi.name,
          severity: 'MEDIUM',
          category: 'URL',
          description: 'Lodge URL should point to lodge-4',
          expected: 'URL containing "lodge-4"',
          actual: url,
          fix: 'Update URL to use lodge-4 for all lodges'
        });
      }
    }

    return issues;
  }

  private static detectLanguage(text: string): string {
    if (!text || typeof text !== 'string') return 'unknown';
    
    const lowerText = text.toLowerCase();
    
    const germanScore = this.GERMAN_INDICATORS.filter(word => lowerText.includes(word)).length;
    const englishScore = this.ENGLISH_INDICATORS.filter(word => lowerText.includes(word)).length;
    
    if (germanScore > englishScore) return 'de';
    if (englishScore > germanScore) return 'en';
    if (germanScore > 0 && englishScore > 0) return 'mixed';
    
    return 'unknown';
  }

  private static hasMixedLanguage(text: string): boolean {
    return this.detectLanguage(text) === 'mixed';
  }

  private static isAccommodationPOI(poi: any): boolean {
    return poi.category?.includes('lodge') || 
           poi.category?.includes('beach_house') || 
           poi.category?.includes('bungalow') || 
           poi.name?.toLowerCase().includes('lodge') ||
           poi.name?.toLowerCase().includes('beach house') ||
           poi.name?.toLowerCase().includes('strandhaus') ||
           poi.name?.toLowerCase().includes('bungalow') ||
           !!poi.roompot_category;
  }

  private static generateReport(totalPOIs: number, analyzedPOIs: number, issues: POILocalizationIssue[]): LocalizationAnalysisReport {
    const issuesBySeverity = issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const issuesByCategory = issues.reduce((acc, issue) => {
      acc[issue.category] = (acc[issue.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const criticalPOIs = issues
      .filter(issue => issue.severity === 'CRITICAL')
      .map(issue => issue.poiName);

    const recommendations = this.generateRecommendations(issues);

    return {
      totalPOIs,
      analyzedPOIs,
      totalIssues: issues.length,
      issuesBySeverity,
      issuesByCategory,
      criticalPOIs,
      detailedIssues: issues,
      recommendations
    };
  }

  private static generateRecommendations(issues: POILocalizationIssue[]): string[] {
    const recommendations: string[] = [];
    
    const mappingIssues = issues.filter(i => i.category === 'MAPPING').length;
    if (mappingIssues > 0) {
      recommendations.push(`Fix ${mappingIssues} POI mapping issues - check roompot_category assignments`);
    }

    const languageIssues = issues.filter(i => i.category === 'LANGUAGE').length;
    if (languageIssues > 0) {
      recommendations.push(`Resolve ${languageIssues} language consistency issues - ensure proper German/English separation`);
    }

    const enrichmentIssues = issues.filter(i => i.category === 'ENRICHMENT').length;
    if (enrichmentIssues > 0) {
      recommendations.push(`Improve ${enrichmentIssues} enrichment data quality issues`);
    }

    const urlIssues = issues.filter(i => i.category === 'URL').length;
    if (urlIssues > 0) {
      recommendations.push(`Fix ${urlIssues} URL issues - ensure all accommodations have booking links`);
    }

    if (recommendations.length === 0) {
      recommendations.push('No critical issues found - system is functioning correctly');
    }

    return recommendations;
  }
}

// Global access for debugging
(window as any).poiLocalizationAnalyzer = POILocalizationAnalyzer;
