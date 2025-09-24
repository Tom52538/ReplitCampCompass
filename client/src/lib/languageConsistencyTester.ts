
export interface LanguageTestResult {
  poiId: string;
  poiName: string;
  category: string;
  roompotCategory: string;
  issues: LanguageIssue[];
  score: number;
}

export interface LanguageIssue {
  type: 'DESCRIPTION_LANG_MISMATCH' | 'FEATURES_LANG_MISMATCH' | 'PRICE_LANG_MISMATCH' | 'MIXED_LANGUAGE' | 'MISSING_TRANSLATION' | 'POI_MAPPING_ERROR';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  expected: string;
  actual: string;
  field: string;
}

export class LanguageConsistencyTester {
  private static readonly GERMAN_INDICATORS = [
    'komfortabel', 'perfekt', 'familien', 'moderne', 'unterkunft', 'ausstattung',
    'ideal', 'suchen', 'einzigartig', 'erlebnis', 'gäste', 'nacht', 'verfügbar',
    'wasserdorf', 'strandhäuser', 'bungalows', 'lodges', 'chalets'
  ];

  private static readonly ENGLISH_INDICATORS = [
    'comfortable', 'perfect', 'families', 'modern', 'accommodation', 'amenities',
    'ideal', 'seeking', 'unique', 'experience', 'guests', 'night', 'available',
    'water village', 'beach houses', 'bungalows', 'lodges', 'chalets'
  ];

  static testPOILanguageConsistency(poi: any, enrichmentData: any, expectedLanguage: string): LanguageTestResult {
    const issues: LanguageIssue[] = [];
    
    console.log(`🧪 TESTING POI LANGUAGE CONSISTENCY: ${poi.name} (expected: ${expectedLanguage})`);

    // Test 1: Description language consistency
    if (enrichmentData?.description) {
      const descLang = this.detectLanguage(enrichmentData.description);
      if (descLang !== expectedLanguage && descLang !== 'unknown') {
        issues.push({
          type: 'DESCRIPTION_LANG_MISMATCH',
          severity: 'HIGH',
          description: `Description is in ${descLang} but user expects ${expectedLanguage}`,
          expected: expectedLanguage,
          actual: descLang,
          field: 'description'
        });
      }

      // Test for mixed language in description
      if (this.hasMixedLanguage(enrichmentData.description)) {
        issues.push({
          type: 'MIXED_LANGUAGE',
          severity: 'HIGH',
          description: 'Description contains mixed languages',
          expected: expectedLanguage,
          actual: 'mixed',
          field: 'description'
        });
      }
    }

    // Test 2: Features language consistency
    if (enrichmentData?.features && Array.isArray(enrichmentData.features)) {
      const featureLanguages = enrichmentData.features.map(f => this.detectLanguage(f));
      const inconsistentFeatures = featureLanguages.filter(lang => lang !== expectedLanguage && lang !== 'unknown');
      
      if (inconsistentFeatures.length > 0) {
        issues.push({
          type: 'FEATURES_LANG_MISMATCH',
          severity: 'MEDIUM',
          description: `${inconsistentFeatures.length} features have wrong language`,
          expected: expectedLanguage,
          actual: inconsistentFeatures.join(', '),
          field: 'features'
        });
      }
    }

    // Test 3: Price info language consistency
    if (enrichmentData?.price_info) {
      const priceLang = this.detectLanguage(enrichmentData.price_info);
      if (priceLang !== expectedLanguage && priceLang !== 'unknown') {
        issues.push({
          type: 'PRICE_LANG_MISMATCH',
          severity: 'MEDIUM',
          description: `Price info is in ${priceLang} but user expects ${expectedLanguage}`,
          expected: expectedLanguage,
          actual: priceLang,
          field: 'price_info'
        });
      }
    }

    // Test 4: POI mapping correctness
    const mappingIssues = this.testPOIMapping(poi, enrichmentData);
    issues.push(...mappingIssues);

    // Calculate score (0-100, higher is better)
    const score = this.calculateScore(issues);

    const result: LanguageTestResult = {
      poiId: poi.id,
      poiName: poi.name,
      category: poi.category,
      roompotCategory: poi.roompot_category,
      issues,
      score
    };

    console.log(`📊 LANGUAGE TEST RESULT for ${poi.name}:`, result);
    return result;
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
    const lowerText = text.toLowerCase();
    
    const hasGerman = this.GERMAN_INDICATORS.some(word => lowerText.includes(word));
    const hasEnglish = this.ENGLISH_INDICATORS.some(word => lowerText.includes(word));
    
    return hasGerman && hasEnglish;
  }

  private static testPOIMapping(poi: any, enrichmentData: any): LanguageIssue[] {
    const issues: LanguageIssue[] = [];

    // Test category consistency
    if (poi.category && enrichmentData?.type && poi.category !== enrichmentData.type) {
      issues.push({
        type: 'POI_MAPPING_ERROR',
        severity: 'HIGH',
        description: 'POI category does not match enrichment type',
        expected: poi.category,
        actual: enrichmentData.type,
        field: 'category'
      });
    }

    // Test roompot category consistency for lodges
    if (poi.category === 'lodge' && poi.roompot_category) {
      const categoryLower = poi.roompot_category.toLowerCase();
      if (!categoryLower.includes('lodge')) {
        issues.push({
          type: 'POI_MAPPING_ERROR',
          severity: 'MEDIUM',
          description: 'Lodge POI has inconsistent roompot_category',
          expected: 'lodge-related category',
          actual: poi.roompot_category,
          field: 'roompot_category'
        });
      }
    }

    return issues;
  }

  private static calculateScore(issues: LanguageIssue[]): number {
    let score = 100;
    
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'HIGH':
          score -= 25;
          break;
        case 'MEDIUM':
          score -= 15;
          break;
        case 'LOW':
          score -= 5;
          break;
      }
    });

    return Math.max(0, score);
  }

  static runBatchTest(pois: any[], expectedLanguage: string): LanguageTestResult[] {
    console.log(`🧪 RUNNING BATCH LANGUAGE TEST for ${pois.length} POIs (expected language: ${expectedLanguage})`);
    
    const results = pois.map(poi => {
      // Simulate enrichment data for testing
      const enrichmentData = poi.enriched ? poi : null;
      return this.testPOILanguageConsistency(poi, enrichmentData, expectedLanguage);
    });

    // Summary statistics
    const totalIssues = results.reduce((sum, result) => sum + result.issues.length, 0);
    const avgScore = results.reduce((sum, result) => sum + result.score, 0) / results.length;
    const highSeverityIssues = results.reduce((sum, result) => 
      sum + result.issues.filter(issue => issue.severity === 'HIGH').length, 0
    );

    console.log(`📊 BATCH TEST SUMMARY:`, {
      totalPOIs: pois.length,
      totalIssues,
      averageScore: avgScore.toFixed(1),
      highSeverityIssues,
      worstPOIs: results.filter(r => r.score < 50).map(r => r.poiName)
    });

    return results;
  }

  static getDetailedReport(results: LanguageTestResult[]): any {
    const issuesByType = results.reduce((acc, result) => {
      result.issues.forEach(issue => {
        acc[issue.type] = (acc[issue.type] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const poisWithIssues = results.filter(r => r.issues.length > 0);
    
    return {
      totalPOIs: results.length,
      poisWithIssues: poisWithIssues.length,
      issuesByType,
      averageScore: results.reduce((sum, r) => sum + r.score, 0) / results.length,
      criticalPOIs: results.filter(r => r.score < 30),
      recommendations: this.generateRecommendations(results)
    };
  }

  private static generateRecommendations(results: LanguageTestResult[]): string[] {
    const recommendations: string[] = [];
    
    const descriptionIssues = results.filter(r => 
      r.issues.some(i => i.type === 'DESCRIPTION_LANG_MISMATCH')
    ).length;
    
    if (descriptionIssues > 0) {
      recommendations.push(`Fix ${descriptionIssues} POIs with description language mismatches`);
    }

    const mixedLanguageIssues = results.filter(r => 
      r.issues.some(i => i.type === 'MIXED_LANGUAGE')
    ).length;
    
    if (mixedLanguageIssues > 0) {
      recommendations.push(`Resolve ${mixedLanguageIssues} POIs with mixed language content`);
    }

    const mappingIssues = results.filter(r => 
      r.issues.some(i => i.type === 'POI_MAPPING_ERROR')
    ).length;
    
    if (mappingIssues > 0) {
      recommendations.push(`Fix ${mappingIssues} POIs with mapping errors`);
    }

    return recommendations;
  }
}

// Export for global testing
(window as any).languageConsistencyTester = LanguageConsistencyTester;
