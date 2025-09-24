import { readFileSync, existsSync } from 'fs';
import path from 'path';

export interface AccommodationEnrichment {
  accommodation_id: string;
  name: string | Record<string, string>;
  park_id: string;
  type: string;
  capacity: {
    max_persons: number;
  };
  description: string | Record<string, string>;
  features: string[] | Record<string, string[]>;
  price_info: string | Record<string, string>;
  images: {
    primary: ImageData;
    gallery: ImageData[];
  };
  crawled_at: string;
  poi_mappings: string[];
  url?: string; // Optional URL property for enrichment data
}

export interface ImageData {
  image_id: string;
  original_url: string;
  local_path: string;
  category: string;
  dimensions: {
    width: number;
    height: number;
  };
}

class AccommodationEnricher {
  private enrichmentData: Record<string, AccommodationEnrichment> = {};

  constructor() {
    this.loadEnrichmentData();
  }

  private loadEnrichmentData(): void {
    try {
      const dataPath = path.join(process.cwd(), 'server/data/crawler/accommodations.json');
      const data = readFileSync(dataPath, 'utf-8');
      this.enrichmentData = JSON.parse(data);
      console.log(`🏠 Loaded enrichment data for ${Object.keys(this.enrichmentData).length} accommodations`);
    } catch (error) {
      console.log('📋 No enrichment data found, running with basic POI data');
      this.enrichmentData = {};
    }
  }

  public enrichPOI(poi: any, language: string = 'de'): any {
    // ONLY debug accommodation POIs - not all 1900 POIs
    const isAccommodation = this.shouldPOIHaveEnrichment(poi);

    if (isAccommodation) {
      console.log(`🏠 ACCOMMODATION ENRICHMENT: "${poi.name}" with language "${language}"`);
      console.log(`🏠 Details:`, {
        id: poi.id,
        name: poi.name,
        category: poi.category,
        roompot_category: poi.roompot_category,
        lodge_number: poi.lodge_number,
        enrichment_key: poi.enrichment_key
      });
    }

    // ENHANCED: Check if this POI should have enrichment
    const shouldHaveEnrichment = this.shouldPOIHaveEnrichment(poi);
    console.log(`🔍 ENRICHMENT ELIGIBILITY: POI "${poi.name}" should have enrichment: ${shouldHaveEnrichment}`);

    const enrichment = this.findEnrichmentForPOI(poi);

    if (!enrichment) {
      console.log(`❌ No enrichment found for POI "${poi.name}"`);
      return poi;
    }

    console.log(`✅ Enrichment found:`, {
      accommodation_id: enrichment.accommodation_id,
      name: enrichment.name,
      type: enrichment.type,
      hasMultiLanguageContent: this.analyzeLanguageContent(enrichment)
    });

    // ENHANCED: Get localized content with detailed logging
    const getLocalizedContent = (content: any, fieldName: string) => {
      console.log(`🌐 Localizing field "${fieldName}" for language "${language}":`, content);

      if (typeof content === 'string') {
        console.log(`📝 String content detected for "${fieldName}": "${content}"`);
        return content;
      }

      if (typeof content === 'object' && content !== null) {
        const availableLanguages = Object.keys(content);
        console.log(`🗣️ Multi-language object for "${fieldName}". Available languages:`, availableLanguages);

        const result = content[language] || content['en'] || content;
        console.log(`🎯 Selected content for "${fieldName}":`, result);
        return result;
      }

      console.log(`⚠️ Unexpected content type for "${fieldName}":`, typeof content);
      return content;
    };

    // ENHANCED: Analyze language consistency
    this.analyzeLanguageConsistency(enrichment, language, poi);

    // Generate accommodation URL - ensure it's always present
    let accommodationUrl = enrichment.url;

    // FORCE OVERRIDE: For all lodge accommodations in water village, always use lodge-4 URL
    if (enrichment.accommodation_id.startsWith('lodge-') && enrichment.park_id === 'water-village') {
      accommodationUrl = `https://www.roompot.de/parks/water-village/unterkuenfte/lodge-4`;
    } else if (!accommodationUrl) {
      // Only generate individual URLs for non-lodge accommodations
      if (enrichment.park_id === 'roompot-beach-resort') {
        accommodationUrl = `https://www.roompot.de/parks/roompot-beach-resort/unterkuenfte/${enrichment.accommodation_id}`;
      } else {
        // Default fallback
        accommodationUrl = `https://www.roompot.de/parks/${enrichment.park_id}/unterkuenfte/${enrichment.accommodation_id}`;
      }
    }

    console.log(`🔗 Generated URL for ${poi.name}: ${accommodationUrl}`);

    // ENHANCED: Add image URLs with detailed logging
    const localizedDescription = getLocalizedContent(enrichment.description, 'description');
    let localizedFeatures = this.getValidFeatures(getLocalizedContent(enrichment.features, 'features'));
    const localizedPriceInfo = this.cleanPriceInfo(getLocalizedContent(enrichment.price_info, 'price_info'));
    const rawLocalizedName = getLocalizedContent(enrichment.name, 'name') || poi.roompot_category || poi.name;
    const localizedName = this.cleanAccommodationName(rawLocalizedName);

    console.log(`🏷️ FINAL LOCALIZED CONTENT for "${poi.name}":`, {
      language,
      description: localizedDescription,
      features: localizedFeatures,
      price_info: localizedPriceInfo,
      name: localizedName
    });

    // LANGUAGE CONSISTENCY CHECK - Enhanced for arrays
    this.checkLanguageConsistency(localizedDescription, localizedFeatures, localizedPriceInfo, language, poi.name);

    // FORCE GERMAN FEATURES if language is DE and mixed content detected
    if (language === 'de' && Array.isArray(localizedFeatures)) {
      localizedFeatures = localizedFeatures.map(feature => {
        if (typeof feature === 'string') {
          return this.forceGermanTranslation(feature);
        }
        return feature;
      });
    }

    const enrichedPOI = {
      ...poi,
      accommodation_id: enrichment.accommodation_id,
      capacity: enrichment.capacity,
      description: localizedDescription,
      features: localizedFeatures,
      price_info: localizedPriceInfo,

      // USE CATEGORY NAME FOR DISPLAY - Show "Beach House 4" instead of "beach house 37"
      name: localizedName,
      original_poi_name: poi.name, // Keep original name for reference
      roompot_category: poi.roompot_category || 'Lodge 4', // ALWAYS "Lodge 4" for category
      lodge_number: poi.lodge_number, // Keep original lodge number from CSV mapping

      // EXPLICIT URL MAPPING - Multiple fields to ensure compatibility
      url: accommodationUrl,
      website: accommodationUrl,
      accommodationUrl: accommodationUrl,
      roompot_url: accommodationUrl, // Additional field for Roompot URLs

      images: enrichment.images,
      type: enrichment.type,
      enriched: true,
      enriched_at: enrichment.crawled_at,
      language: language,

      // DEBUG INFO
      debug_enrichment_key: this.getUsedEnrichmentKey(poi),
      debug_language_detected: this.detectContentLanguage(localizedDescription),
      debug_language_requested: language
    };

    // Debug URL availability in enriched POI
    console.log(`🔗 URL check - enrichedPOI.url: ${enrichedPOI.url}`);
    console.log(`🔗 URL check - enrichedPOI.website: ${enrichedPOI.website}`);

    console.log(`🔗 URL for ${poi.name}: ${enrichedPOI.url}`);

    if (enrichment.images?.primary) {
      // Map to existing images for bungalow-6b
      const fallbackImage = this.getFallbackImage(enrichment.accommodation_id, 'primary');
      if (fallbackImage) {
        enrichedPOI.primaryImage = fallbackImage;
        console.log(`🖼️ Using fallback primary image: ${fallbackImage}`);
      } else {
        // Normalize image path: remove prefixes and fix backslashes
        let imagePath = enrichment.images.primary.local_path
          .replace(/^server\/data\/crawler\/images\//, '')  // Remove full server path
          .replace(/^images[\\\/]/, '')                      // Remove images\ or images/ prefix
          .replace(/\\/g, '/');                              // Convert backslashes to forward slashes

        // Fix Lodge ID normalization: lodge_03 -> lodge_4
        imagePath = this.normalizeLodgeImagePath(imagePath);

        // Check if the file actually exists
        const fullPath = path.join(process.cwd(), 'server/data/crawler/images', imagePath);
        if (existsSync(fullPath)) {
          enrichedPOI.primaryImage = `/api/images/${imagePath}`;
          console.log(`🖼️ Setting primary image URL: /api/images/${imagePath}`);
        } else {
          // Use fallback if file doesn't exist
          const fallbackImage = this.getFallbackImage(enrichment.accommodation_id, 'primary');
          if (fallbackImage) {
            enrichedPOI.primaryImage = fallbackImage;
            console.log(`🖼️ Using fallback primary image (file not found): ${fallbackImage}`);
          } else {
            console.log(`⚠️ Primary image not found and no fallback available: ${imagePath}`);
          }
        }
      }
    }

    if (enrichment.images?.gallery?.length > 0) {
      // Map to existing images for bungalow-6b
      const fallbackGallery = this.getFallbackImageGallery(enrichment.accommodation_id);
      if (fallbackGallery.length > 0) {
        enrichedPOI.imageGallery = fallbackGallery;
        console.log(`🖼️ Using ${fallbackGallery.length} fallback gallery images`);
      } else {
        enrichedPOI.imageGallery = enrichment.images.gallery
          .map((img: any) => {
            // Normalize image path: remove prefixes and fix backslashes
            let imagePath = img.local_path
              .replace(/^server\/data\/crawler\/images\//, '')  // Remove full server path
              .replace(/^images[\\\/]/, '')                      // Remove images\ or images/ prefix
              .replace(/\\/g, '/');                              // Convert backslashes to forward slashes

            // Fix Lodge ID normalization: lodge_03 -> lodge_4
            imagePath = this.normalizeLodgeImagePath(imagePath);

            // Check if the file actually exists
            const fullPath = path.join(process.cwd(), 'server/data/crawler/images', imagePath);
            if (existsSync(fullPath)) {
              console.log(`🖼️ Setting gallery image URL: /api/images/${imagePath}`);
              return {
                url: `/api/images/${imagePath}`,
                category: img.category,
                dimensions: img.dimensions
              };
            } else {
              console.log(`⚠️ Gallery image not found: ${imagePath}`);
              return null; // Filter out missing images
            }
          })
          .filter(img => img !== null); // Remove null entries

        // Add fallback gallery images if no valid images found
        if (enrichedPOI.imageGallery.length === 0) {
          const fallbackGallery = this.getFallbackImageGallery(enrichment.accommodation_id);
          if (fallbackGallery.length > 0) {
            enrichedPOI.imageGallery = fallbackGallery;
            console.log(`🖼️ Using ${fallbackGallery.length} fallback gallery images (no valid images found)`);
          }
        }
      }
    }

    return enrichedPOI;
  }

  private cleanPriceInfo(priceInfo: string): string {
    if (!priceInfo || typeof priceInfo !== 'string') {
      return '';
    }

    return priceInfo
      .replace(/\n+/g, ' ')                    // Replace multiple newlines with spaces
      .replace(/\s+/g, ' ')                    // Replace multiple spaces with single space
      .replace(/Weniger Nächte.*?Mehr Nächte/gi, '') // Remove navigation elements
      .replace(/Mo \d+ \w+|Fr \d+ \w+/g, '')   // Remove date headers
      .replace(/^\s*-\s*|\s*-\s*$/g, '')       // Remove leading/trailing dashes
      .trim()
      || 'Preisinformationen verfügbar - bitte kontaktieren Sie uns für Details.';
  }

  private cleanAccommodationName(name: string): string {
    if (!name || typeof name !== 'string') {
      return '';
    }

    // Remove duplicate prefixes for all accommodation types
    return name
      .replace(/^Bungalow\s+Bungalow\s+/i, 'Bungalow ')
      .replace(/^Beach House\s+Beach House\s+/i, 'Beach House ')
      .replace(/^Lodge\s+Lodge\s+/i, 'Lodge ')
      .trim();
  }

  private getValidFeatures(features: any): string[] {
    // If features is empty or invalid, provide default features based on type
    if (!features || !Array.isArray(features) || features.length === 0) {
      return [
        'WiFi',
        'Küche',
        'Terrasse',
        'Parkplatz',
        'TV',
        'Moderne Ausstattung'
      ];
    }
    return features;
  }

  private normalizeLodgeImagePath(imagePath: string): string {
    // Fix Lodge ID normalization: lodge_03 -> lodge_4, lodge_02 -> lodge_2, etc.
    return imagePath.replace(/lodge_0?(\d+)/g, (match, num) => {
      // Convert zero-padded lodge numbers to actual folder names
      const lodgeNumber = parseInt(num, 10);
      if (lodgeNumber === 3) return 'lodge_4'; // Special case: lodge_03 -> lodge_4
      return `lodge_${lodgeNumber}`;
    });
  }

  private getFallbackImage(accommodationId: string, type: 'primary'): string | null {
    // Map bungalow-6b to existing images
    if (accommodationId === 'bungalow-6b') {
      return '/api/images/bungalow_6b/exterior_001.jpg';
    }
    // Map lodge accommodations to bungalow images as fallback
    if (accommodationId.includes('lodge')) {
      return '/api/images/bungalow_6b/exterior_001.jpg';
    }
    return null;
  }

  private getFallbackImageGallery(accommodationId: string): any[] {
    // Map bungalow-6b to existing images (excluding primary image to avoid duplicates)
    if (accommodationId === 'bungalow-6b') {
      return [
        {
          url: '/api/images/bungalow_6b/interior_001.jpg',
          category: 'interior',
          dimensions: { width: 1024, height: 682 }
        },
        {
          url: '/api/images/bungalow_6b/groundplan_001.jpg',
          category: 'groundplan',
          dimensions: { width: 1024, height: 768 }
        },
        {
          url: '/api/images/bungalow_6b/groundplan_002.jpg',
          category: 'groundplan',
          dimensions: { width: 1024, height: 768 }
        }
      ];
    }
    // Map lodge accommodations to bungalow images as fallback (excluding primary)
    if (accommodationId.includes('lodge')) {
      return [
        {
          url: '/api/images/bungalow_6b/interior_001.jpg',
          category: 'interior',
          dimensions: { width: 1024, height: 682 }
        },
        {
          url: '/api/images/bungalow_6b/groundplan_001.jpg',
          category: 'groundplan',
          dimensions: { width: 1024, height: 768 }
        },
        {
          url: '/api/images/bungalow_6b/groundplan_002.jpg',
          category: 'groundplan',
          dimensions: { width: 1024, height: 768 }
        }
      ];
    }
    return [];
  }

  private findEnrichmentForPOI(poi: any): AccommodationEnrichment | null {
    const poiName = poi.name?.toLowerCase() || '';

    // First, check for direct enrichment_key match (most reliable)
    if (poi.enrichment_key && this.enrichmentData[poi.enrichment_key]) {
      console.log(`🏠 Direct enrichment key match: "${poi.name}" -> ${poi.enrichment_key}`);
      return this.enrichmentData[poi.enrichment_key];
    }

    // If direct enrichment_key fails, log it and continue with category-based matching
    if (poi.enrichment_key) {
      console.log(`🏠 Direct enrichment key NOT FOUND: "${poi.name}" -> ${poi.enrichment_key} (falling back to category matching)`);
    }

    // UNIFIED ROOMPOT_CATEGORY MATCHING - This is the primary method
    if (poi.roompot_category) {
      const category = poi.roompot_category.toLowerCase();
      console.log(`🏠 POI detected: "${poi.name}", roompot_category: "${poi.roompot_category}"`);

      // Lodge matching based on roompot_category
      if (category.includes('lodge')) {
        // ALL LODGES use the same enrichment data (lodge-4) but keep individual names
        const enrichment = this.enrichmentData['lodge-4'];
        if (enrichment) {
          console.log(`🏠 Lodge enrichment: "${poi.name}" (roompot_category: ${poi.roompot_category}) -> Using lodge-4 enrichment`);
          return enrichment;
        }
      }

      // Beach House matching based on roompot_category  
      if (category.includes('beach house')) {
        if (category.includes('6b')) {
          const enrichment = this.enrichmentData['beach-house-6b'];
          if (enrichment) {
            console.log(`🏠 Enrichment match Beach House 6B: "${poi.name}" -> Category: ${poi.roompot_category}`);
            return enrichment;
          }
        } else if (category.includes('6a')) {
          const enrichment = this.enrichmentData['beach-house-6a'];
          if (enrichment) {
            console.log(`🏠 Enrichment match Beach House 6A: "${poi.name}" -> Category: ${poi.roompot_category}`);
            return enrichment;
          }
        } else if (category.includes('4')) {
          const enrichment = this.enrichmentData['beach-house-4'];
          if (enrichment) {
            console.log(`🏠 Enrichment match Beach House 4: "${poi.name}" -> Category: ${poi.roompot_category}`);
            return enrichment;
          }
        }
      }

      // Bungalow matching based on roompot_category
      if (category.includes('bungalow')) {
        if (category.includes('6b')) {
          const enrichment = this.enrichmentData['bungalow-6b'];
          if (enrichment) {
            console.log(`🏠 Enrichment match Bungalow 6B: "${poi.name}" -> Category: ${poi.roompot_category}`);
            return enrichment;
          }
        } else if (category.includes('6a')) {
          const enrichment = this.enrichmentData['bungalow-6a'];
          if (enrichment) {
            console.log(`🏠 Enrichment match Bungalow 6A: "${poi.name}" -> Category: ${poi.roompot_category}`);
            return enrichment;
          }
        } else if (category.includes('4a')) {
          const enrichment = this.enrichmentData['bungalow-4a'];
          if (enrichment) {
            console.log(`🏠 Enrichment match Bungalow 4A: "${poi.name}" -> Category: ${poi.roompot_category}`);
            return enrichment;
          }
        } else if (category.includes('4b')) {
          const enrichment = this.enrichmentData['bungalow-4b'];
          if (enrichment) {
            console.log(`🏠 Enrichment match Bungalow 4B: "${poi.name}" -> Category: ${poi.roompot_category}`);
            return enrichment;
          }
        }
      }

      console.log(`🏠 No enrichment match for roompot_category: "${poi.roompot_category}"`);
    }

    // FALLBACK: Name-based matching (for backward compatibility)
    // Check for Lodge accommodations
    if (poiName.includes('lodge')) {
      console.log(`🏠 FALLBACK Lodge detected: "${poi.name}", roompot_category: "${poi.roompot_category}"`);

      if (poiName.includes('lodge 4')) {
        const enrichment = this.enrichmentData['lodge-4'];
        if (enrichment) {
          console.log(`🏠 FALLBACK Enrichment match Lodge 4: "${poi.name}"`);
          return enrichment;
        }
      }
    }

    if (poiName.includes('beach house') || poiName.includes('strandhaus')) {
      console.log(`🏠 Beach house detected: "${poi.name}", roompot_category: "${poi.roompot_category}"`);

      if (!poi.roompot_category) {
        console.log(`🏠 No roompot_category found for beach house: "${poi.name}"`);
        return null;
      }

      // Direct category matching - this is the correct and only way
      const category = poi.roompot_category.toLowerCase();

      if (category.includes('6b')) {
        const enrichment = this.enrichmentData['beach-house-6b'];
        if (enrichment) {
          console.log(`🏠 Enrichment match Beach House 6B: "${poi.name}" -> Category: ${poi.roompot_category}`);
          return enrichment;
        }
      } else if (category.includes('6a')) {
        const enrichment = this.enrichmentData['beach-house-6a'];
        if (enrichment) {
          console.log(`🏠 Enrichment match Beach House 6A: "${poi.name}" -> Category: ${poi.roompot_category}`);
          return enrichment;
        }
      } else if (category.includes('4')) {
        const enrichment = this.enrichmentData['beach-house-4'];
        if (enrichment) {
          console.log(`🏠 Enrichment match Beach House 4: "${poi.name}" -> Category: ${poi.roompot_category}`);
          return enrichment;
        }
      }

      console.log(`🏠 No enrichment match for category: "${poi.roompot_category}"`);
      return null;
    }

    // Check for Bungalow accommodations (including Water Village)
    if (poiName.includes('bungalow')) {
      console.log(`🏠 Bungalow detected: "${poi.name}", roompot_category: "${poi.roompot_category}"`);

      if (!poi.roompot_category) {
        console.log(`🏠 No roompot_category found for bungalow: "${poi.name}"`);
        return null;
      }

      // Direct category matching for bungalows
      const category = poi.roompot_category.toLowerCase();

      if (category.includes('6b')) {
        const enrichment = this.enrichmentData['bungalow-6b'];
        if (enrichment) {
          console.log(`🏠 Enrichment match Bungalow 6B: "${poi.name}" -> Category: ${poi.roompot_category}`);
          return enrichment;
        }
      } else if (category.includes('6a')) {
        const enrichment = this.enrichmentData['bungalow-6a'];
        if (enrichment) {
          console.log(`🏠 Enrichment match Bungalow 6A: "${poi.name}" -> Category: ${poi.roompot_category}`);
          return enrichment;
        }
      } else if (category.includes('4a')) {
        const enrichment = this.enrichmentData['bungalow-4a'];
        if (enrichment) {
          console.log(`🏠 Enrichment match Bungalow 4A: "${poi.name}" -> Category: ${poi.roompot_category}`);
          return enrichment;
        }
      } else if (category.includes('4b')) {
        const enrichment = this.enrichmentData['bungalow-4b'];
        if (enrichment) {
          console.log(`🏠 Enrichment match Bungalow 4B: "${poi.name}" -> Category: ${poi.roompot_category}`);
          return enrichment;
        }
      }

      console.log(`🏠 No enrichment match for bungalow category: "${poi.roompot_category}"`);
      return null;
    }

    // For other types, you can add additional matching logic here if needed
    return null;
  }

  public getAccommodationById(accommodationId: string): AccommodationEnrichment | null {
    return this.enrichmentData[accommodationId] || null;
  }

  public getAllAccommodations(): AccommodationEnrichment[] {
    return Object.values(this.enrichmentData);
  }

  // ENHANCED DEBUGGING METHODS
  private analyzeLanguageContent(enrichment: AccommodationEnrichment): any {
    const analysis = {
      name: this.getContentLanguageInfo(enrichment.name),
      description: this.getContentLanguageInfo(enrichment.description),
      features: this.getContentLanguageInfo(enrichment.features),
      price_info: this.getContentLanguageInfo(enrichment.price_info)
    };

    console.log(`📊 Language analysis for ${enrichment.accommodation_id}:`, analysis);
    return analysis;
  }

  private getContentLanguageInfo(content: any): any {
    if (typeof content === 'string') {
      return {
        type: 'string',
        language: this.detectContentLanguage(content),
        content: content.substring(0, 50) + (content.length > 50 ? '...' : '')
      };
    }

    if (typeof content === 'object' && content !== null) {
      return {
        type: 'multilingual',
        availableLanguages: Object.keys(content),
        samples: Object.entries(content).reduce((acc, [lang, text]) => {
          acc[lang] = typeof text === 'string' ? text.substring(0, 50) + (text.length > 50 ? '...' : '') : text;
          return acc;
        }, {} as any)
      };
    }

    return { type: typeof content, content };
  }

  private detectContentLanguage(text: string): string {
    if (!text || typeof text !== 'string') return 'unknown';

    const germanIndicators = [
      'komfortabel', 'perfekt', 'familien', 'moderne', 'unterkunft', 'ausstattung',
      'ideal', 'suchen', 'einzigartig', 'erlebnis', 'gäste', 'nacht', 'verfügbar'
    ];

    const englishIndicators = [
      'comfortable', 'perfect', 'families', 'modern', 'accommodation', 'amenities',
      'ideal', 'seeking', 'unique', 'experience', 'guests', 'night', 'available'
    ];

    const lowerText = text.toLowerCase();

    const germanScore = germanIndicators.filter(word => lowerText.includes(word)).length;
    const englishScore = englishIndicators.filter(word => lowerText.includes(word)).length;

    if (germanScore > englishScore) return 'de';
    if (englishScore > germanScore) return 'en';
    if (germanScore > 0 && englishScore > 0) return 'mixed';

    return 'unknown';
  }

  private analyzeLanguageConsistency(enrichment: AccommodationEnrichment, requestedLanguage: string, poi: any): void {
    console.log(`🔍 LANGUAGE CONSISTENCY CHECK for ${enrichment.accommodation_id}`);
    console.log(`📋 Requested language: ${requestedLanguage}`);

    // Check description language
    if (typeof enrichment.description === 'string') {
      const detectedLang = this.detectContentLanguage(enrichment.description);
      if (detectedLang !== requestedLanguage && detectedLang !== 'unknown') {
        console.warn(`⚠️ LANGUAGE MISMATCH: Description is in ${detectedLang} but ${requestedLanguage} was requested`);
        console.warn(`📝 Description content: "${enrichment.description}"`);
      }
    }

    // Check features language
    if (Array.isArray(enrichment.features)) {
      enrichment.features.forEach((feature, index) => {
        if (typeof feature === 'string') {
          const detectedLang = this.detectContentLanguage(feature);
          if (detectedLang !== requestedLanguage && detectedLang !== 'unknown') {
            console.warn(`⚠️ FEATURE LANGUAGE MISMATCH: Feature ${index} "${feature}" is in ${detectedLang} but ${requestedLanguage} was requested`);
          }
        }
      });
    }
  }

  private checkLanguageConsistency(description: string, features: string[], priceInfo: string, requestedLanguage: string, poiName: string): void {
    const issues: string[] = [];

    // Check description
    if (description) {
      const descLang = this.detectContentLanguage(description);
      if (descLang !== requestedLanguage && descLang !== 'unknown') {
        issues.push(`Description language mismatch: detected ${descLang}, requested ${requestedLanguage}`);
      }
    }

    // Check features
    if (features && features.length > 0) {
      const featureLanguages = features.map(f => this.detectContentLanguage(f)).filter(l => l !== 'unknown');
      const inconsistentFeatures = featureLanguages.filter(l => l !== requestedLanguage);
      if (inconsistentFeatures.length > 0) {
        issues.push(`Features language mismatch: found ${inconsistentFeatures.join(', ')}, requested ${requestedLanguage}`);
      }
    }

    // Check price info
    if (priceInfo) {
      const priceLang = this.detectContentLanguage(priceInfo);
      if (priceLang !== requestedLanguage && priceLang !== 'unknown') {
        issues.push(`Price info language mismatch: detected ${priceLang}, requested ${requestedLanguage}`);
      }
    }

    if (issues.length > 0) {
      console.error(`🚨 CRITICAL LANGUAGE ISSUES for POI "${poiName}":`, issues);
      console.error(`📊 Final content:`, { description, features, priceInfo });
    } else {
      console.log(`✅ Language consistency check passed for POI "${poiName}"`);
    }
  }

  private getUsedEnrichmentKey(poi: any): string {
    // Try to determine which enrichment key was actually used
    if (poi.enrichment_key && this.enrichmentData[poi.enrichment_key]) {
      return poi.enrichment_key;
    }

    const poiName = poi.name?.toLowerCase() || '';
    const category = poi.roompot_category?.toLowerCase() || '';

    // Lodge detection
    if (category.includes('lodge') || poiName.includes('lodge')) {
      return 'lodge-4';
    }

    // Beach house detection
    if (category.includes('beach house') || category.includes('strandhaus')) {
      if (category.includes('6b')) return 'beach-house-6b';
      if (category.includes('6a')) return 'beach-house-6a';
      if (category.includes('4')) return 'beach-house-4';
    }

    // Bungalow detection
    if (category.includes('bungalow')) {
      if (category.includes('6b')) return 'bungalow-6b';
      if (category.includes('6a')) return 'bungalow-6a';
      if (category.includes('4a')) return 'bungalow-4a';
      if (category.includes('4b')) return 'bungalow-4b';
    }

    return 'unknown';
  }

  // NEW METHOD: Check if POI should have enrichment
  private shouldPOIHaveEnrichment(poi: any): boolean {
    const indicators = [
      poi.category?.includes('lodge'),
      poi.category?.includes('beach_house'),
      poi.category?.includes('bungalow'),
      poi.name?.toLowerCase().includes('lodge'),
      poi.name?.toLowerCase().includes('beach house'),
      poi.name?.toLowerCase().includes('strandhaus'),
      poi.name?.toLowerCase().includes('bungalow'),
      !!poi.roompot_category,
      !!poi.building_type
    ];

    return indicators.some(indicator => indicator);
  }

  // DEBUG METHOD: Get full enrichment analysis
  public debugEnrichmentData(): any {
    const analysis: Record<string, any> = {};

    Object.entries(this.enrichmentData).forEach(([key, enrichment]) => {
      analysis[key] = {
        accommodation_id: enrichment.accommodation_id,
        type: enrichment.type,
        languageAnalysis: this.analyzeLanguageContent(enrichment),
        hasMultiLangName: typeof enrichment.name === 'object',
        hasMultiLangDescription: typeof enrichment.description === 'object',
        hasMultiLangFeatures: typeof enrichment.features === 'object',
        hasMultiLangPriceInfo: typeof enrichment.price_info === 'object'
      };
    });

    return analysis;
  }

  private static forceGermanTranslation(text: string): string {
    const translations: Record<string, string> = {
      'WiFi': 'WLAN',
      'Water View': 'Wasserblick',
      'Modern Kitchen': 'Moderne Küche',
      'TV': 'Fernseher',
      'Parking': 'Parkplatz',
      'Waterfront Access': 'Wasserzugang',
      'Beach Access': 'Strandzugang',
      'Garden View': 'Gartenblick',
      'Terrace': 'Terrasse',
      'Balcony': 'Balkon',
      'Air Conditioning': 'Klimaanlage',
      'Heating': 'Heizung',
      'Fireplace': 'Kamin',
      'Dishwasher': 'Geschirrspüler',
      'Microwave': 'Mikrowelle',
      'Coffee Machine': 'Kaffeemaschine',
      'Private Bathroom': 'Eigenes Bad',
      'Shower': 'Dusche',
      'Bathtub': 'Badewanne',
      'Hair Dryer': 'Haartrockner',
      'Towels': 'Handtücher',
      'Bed Linen': 'Bettwäsche',
      'Safe': 'Safe',
      'Free WiFi': 'Kostenloses WLAN',
      'Pet Friendly': 'Haustierfreundlich'
    };

    // Direct translation if available
    if (translations[text]) {
      return translations[text];
    }

    // Partial translation for compound phrases
    let translatedText = text;
    Object.entries(translations).forEach(([english, german]) => {
      const regex = new RegExp(english, 'gi');
      translatedText = translatedText.replace(regex, german);
    });

    return translatedText;
  }

  // Helper methods for German translation
  private forceGermanTranslation(text: string): string {
    const translations: Record<string, string> = {
      'WiFi': 'WLAN',
      'Water View': 'Wasserblick',
      'Modern Kitchen': 'Moderne Küche',
      'TV': 'Fernseher',
      'Parking': 'Parkplatz',
      'Waterfront Access': 'Wasserzugang',
      'Beach Access': 'Strandzugang',
      'Garden View': 'Gartenblick',
      'Terrace': 'Terrasse',
      'Balcony': 'Balkon',
      'Air Conditioning': 'Klimaanlage',
      'Heating': 'Heizung',
      'Fireplace': 'Kamin',
      'Dishwasher': 'Geschirrspüler',
      'Microwave': 'Mikrowelle',
      'Coffee Machine': 'Kaffeemaschine',
      'Private Bathroom': 'Eigenes Bad',
      'Shower': 'Dusche',
      'Bathtub': 'Badewanne',
      'Hair Dryer': 'Haartrockner',
      'Towels': 'Handtücher',
      'Bed Linen': 'Bettwäsche',
      'Safe': 'Safe',
      'Free WiFi': 'Kostenloses WLAN',
      'Pet Friendly': 'Haustierfreundlich'
    };

    // Direct translation if available
    if (translations[text]) {
      return translations[text];
    }

    // Partial translation for compound phrases
    let translatedText = text;
    Object.entries(translations).forEach(([english, german]) => {
      const regex = new RegExp(english, 'gi');
      translatedText = translatedText.replace(regex, german);
    });

    return translatedText;
  }
}

// Export singleton instance
export const accommodationEnricher = new AccommodationEnricher();