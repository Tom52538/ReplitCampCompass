import { Router } from 'express';
import { accommodationEnricher } from '../lib/accommodationEnricher.js';
import { readFileSync } from 'fs';
import { join } from 'path';

const debugRouter = Router();

// Debug route for testing POI enrichment
debugRouter.get('/test-poi-enrichment/:poiId', (req, res) => {
  try {
    const { poiId } = req.params;
    const { language = 'de' } = req.query;

    console.log(`🔍 DEBUG TEST: Testing enrichment for POI ${poiId} in language ${language}`);

    // Load POI data
    const dataPath = join(process.cwd(), 'server/data/combined_pois_roompot.geojson');
    const rawData = readFileSync(dataPath, 'utf-8');
    const geoData = JSON.parse(rawData);

    // Find the POI
    const feature = geoData.features.find((f: any) => f.properties?.id === poiId);

    if (!feature) {
      return res.status(404).json({ error: 'POI not found' });
    }

    const coords = feature.geometry?.coordinates;
    const props = feature.properties || {};

    // Basic POI data
    const poi = {
      id: props.id || poiId,
      name: props.name || 'Unnamed Location',
      lodge_number: props.lodge_number || null,
      category: props.category || 'other',
      coordinates: { lat: coords[1], lng: coords[0] },
      roompot_category: props.roompot_category || null,
      building_type: props.building_type || null,
      enrichment_key: props.enrichment_key || null
    };

    // Test enrichment
    const enrichedPOI = accommodationEnricher.enrichPOI(poi, language as string);

    // Analyze the result
    const analysis = {
      originalPOI: poi,
      enrichedPOI: enrichedPOI,
      enrichmentFound: !!enrichedPOI.enriched,
      languageRequestedVsDetected: {
        requested: language,
        detectedInDescription: detectLanguage(enrichedPOI.description || ''),
        detectedInFeatures: enrichedPOI.features ? enrichedPOI.features.map(f => detectLanguage(f)) : []
      },
      urlAvailability: {
        url: enrichedPOI.url,
        website: enrichedPOI.website,
        accommodationUrl: enrichedPOI.accommodationUrl,
        roompot_url: enrichedPOI.roompot_url
      },
      imageAvailability: {
        primaryImage: enrichedPOI.primaryImage,
        imageGallery: enrichedPOI.imageGallery ? enrichedPOI.imageGallery.length : 0
      }
    };

    res.json(analysis);

  } catch (error) {
    console.error('Debug enrichment test failed:', error);
    res.status(500).json({ error: 'Debug test failed', details: error.message });
  }
});

// Debug route for testing language consistency across all POIs
debugRouter.get('/test-language-consistency', (req, res) => {
  try {
    const { language = 'de', limit = 10 } = req.query;

    console.log(`🔍 DEBUG TEST: Testing language consistency for ${limit} POIs in language ${language}`);

    const dataPath = join(process.cwd(), 'server/data/combined_pois_roompot.geojson');
    const rawData = readFileSync(dataPath, 'utf-8');
    const geoData = JSON.parse(rawData);

    const accommodationPOIs = geoData.features
      .filter((f: any) => {
        const props = f.properties || {};
        return props.category?.includes('lodge') ||
               props.category?.includes('beach_house') ||
               props.category?.includes('bungalow') ||
               props.name?.toLowerCase().includes('lodge') ||
               props.name?.toLowerCase().includes('beach house') ||
               props.name?.toLowerCase().includes('strandhaus') ||
               !!props.roompot_category;
      })
      .slice(0, parseInt(limit as string));

    const results = accommodationPOIs.map((feature: any) => {
      const coords = feature.geometry?.coordinates;
      const props = feature.properties || {};

      const poi = {
        id: props.id,
        name: props.name,
        category: props.category,
        roompot_category: props.roompot_category,
        coordinates: { lat: coords[1], lng: coords[0] }
      };

      const enrichedPOI = accommodationEnricher.enrichPOI(poi, language as string);

      return {
        poiName: poi.name,
        poiId: poi.id,
        category: poi.category,
        roompotCategory: poi.roompot_category,
        enrichmentFound: !!enrichedPOI.enriched,
        languageIssues: analyzeLanguageIssues(enrichedPOI, language as string),
        urlAvailable: !!(enrichedPOI.url || enrichedPOI.website || enrichedPOI.accommodationUrl)
      };
    });

    const summary = {
      totalTested: results.length,
      enrichedCount: results.filter(r => r.enrichmentFound).length,
      withLanguageIssues: results.filter(r => r.languageIssues.hasIssues).length,
      withoutUrl: results.filter(r => !r.urlAvailable).length,
      language: language
    };

    res.json({ summary, results });

  } catch (error) {
    console.error('Language consistency test failed:', error);
    res.status(500).json({ error: 'Language test failed', details: error.message });
  }
});

// Debug route for focused single POI analysis
debugRouter.get('/analyze-single-poi/:poiId', (req, res) => {
  try {
    const { poiId } = req.params;
    const { language = 'de' } = req.query;

    console.log(`🔍 SINGLE POI ANALYSIS: Testing POI ${poiId} with language ${language}`);

    // Load POI data
    const dataPath = join(process.cwd(), 'server/data/combined_pois_roompot.geojson');
    const rawData = readFileSync(dataPath, 'utf-8');
    const geoData = JSON.parse(rawData);

    // Find the POI
    const feature = geoData.features.find((f: any) => f.properties?.id === poiId);

    if (!feature) {
      return res.status(404).json({ error: 'POI not found' });
    }

    const coords = feature.geometry?.coordinates;
    const props = feature.properties || {};

    // Basic POI data
    const poi = {
      id: props.id || poiId,
      name: props.name || 'Unnamed Location',
      lodge_number: props.lodge_number || null,
      category: props.category || 'other',
      coordinates: { lat: coords[1], lng: coords[0] },
      roompot_category: props.roompot_category || null,
      building_type: props.building_type || null,
      enrichment_key: props.enrichment_key || null
    };

    console.log(`📋 ORIGINAL POI DATA:`, poi);

    // Test enrichment with detailed logging
    const enrichedPOI = accommodationEnricher.enrichPOI(poi, language as string);

    // Check if enrichment happened
    const wasEnriched = !!enrichedPOI.enriched;

    // Analyze the enrichment result
    const analysis = {
      originalPOI: poi,
      enrichedPOI: enrichedPOI,
      enrichmentStatus: {
        wasEnriched,
        foundEnrichmentKey: enrichedPOI.debug_enrichment_key || 'none',
        requestedLanguage: language,
        detectedLanguage: enrichedPOI.debug_language_detected || 'unknown'
      },
      languageAnalysis: {
        description: {
          content: enrichedPOI.description?.substring(0, 100) + '...',
          detectedLanguage: detectLanguage(enrichedPOI.description || ''),
          isCorrectLanguage: detectLanguage(enrichedPOI.description || '') === language
        },
        features: enrichedPOI.features ? enrichedPOI.features.map(f => ({
          content: f,
          detectedLanguage: detectLanguage(f),
          isCorrectLanguage: detectLanguage(f) === language
        })) : [],
        priceInfo: {
          content: enrichedPOI.price_info?.substring(0, 100) + '...',
          detectedLanguage: detectLanguage(enrichedPOI.price_info || ''),
          isCorrectLanguage: detectLanguage(enrichedPOI.price_info || '') === language
        }
      },
      urls: {
        url: enrichedPOI.url,
        website: enrichedPOI.website,
        accommodationUrl: enrichedPOI.accommodationUrl,
        roompot_url: enrichedPOI.roompot_url
      }
    };

    res.json(analysis);

  } catch (error) {
    console.error('Single POI analysis failed:', error);
    res.status(500).json({ error: 'Analysis failed', details: error.message });
  }
});

// POI Category Analysis - show all POIs with their categories
debugRouter.get('/poi-categories/:site?', async (req, res) => {
  try {
    const site = req.params.site || 'zuhause';
    console.log(`📊 POI CATEGORY ANALYSIS for site: ${site}`);

    // Load POI data for the specified site
    const { transformGeoJSONToPOIs } = await import('../lib/poiTransformer.js');

    const dataPath = join(process.cwd(), 'server', 'data', `${site}_pois.geojson`);

    if (!readFileSync) {
      return res.status(500).json({ error: 'File system not available' });
    }

    try {
      const rawData = JSON.parse(readFileSync(dataPath, 'utf8'));
      const pois = transformGeoJSONToPOIs(rawData, site);

      // Analyze categories
      const categoryStats = {};
      const poiDetails = [];

      pois.forEach(poi => {
        const category = poi.category || 'unknown';

        // Count categories
        if (!categoryStats[category]) {
          categoryStats[category] = { count: 0, examples: [] };
        }
        categoryStats[category].count++;

        // Add first 3 examples per category
        if (categoryStats[category].examples.length < 3) {
          categoryStats[category].examples.push(poi.name);
        }

        // Add to detailed list
        poiDetails.push({
          id: poi.id,
          name: poi.name,
          category: category,
          amenity: poi.amenity || null,
          shop: poi.shop || null,
          leisure: poi.leisure || null,
          tourism: poi.tourism || null,
          building_type: poi.building_type || null,
          roompot_category: poi.roompot_category || null
        });
      });

      // Sort categories by count
      const sortedCategories = Object.entries(categoryStats)
        .sort(([,a], [,b]) => b.count - a.count)
        .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {});

      const result = {
        site,
        totalPOIs: pois.length,
        categoryOverview: sortedCategories,
        allPOIs: poiDetails.sort((a, b) => a.name.localeCompare(b.name)),
        timestamp: new Date().toISOString()
      };

      console.log(`📊 POI Analysis complete: ${pois.length} POIs in ${Object.keys(categoryStats).length} categories`);

      res.json(result);
    } catch (fileError) {
      return res.status(404).json({ error: `No POI data found for site: ${site}`, details: fileError.message });
    }

  } catch (error) {
    console.error('POI category analysis error:', error);
    res.status(500).json({ error: 'POI analysis failed', details: error.message });
  }
});


// Helper function to detect language
function detectLanguage(text: string): string {
  if (!text || typeof text !== 'string') return 'unknown';

  const germanIndicators = ['komfortabel', 'perfekt', 'familien', 'moderne', 'unterkunft'];
  const englishIndicators = ['comfortable', 'perfect', 'families', 'modern', 'accommodation'];

  const lowerText = text.toLowerCase();

  const germanScore = germanIndicators.filter(word => lowerText.includes(word)).length;
  const englishScore = englishIndicators.filter(word => lowerText.includes(word)).length;

  if (germanScore > englishScore) return 'de';
  if (englishScore > germanScore) return 'en';
  if (germanScore > 0 && englishScore > 0) return 'mixed';

  return 'unknown';
}

// Helper function to analyze language issues
function analyzeLanguageIssues(enrichedPOI: any, expectedLanguage: string) {
  const issues = [];

  if (enrichedPOI.description) {
    const descLang = detectLanguage(enrichedPOI.description);
    if (descLang !== expectedLanguage && descLang !== 'unknown') {
      issues.push(`Description in ${descLang}, expected ${expectedLanguage}`);
    }
  }

  if (enrichedPOI.features && Array.isArray(enrichedPOI.features)) {
    const wrongLanguageFeatures = enrichedPOI.features.filter(f => {
      const lang = detectLanguage(f);
      return lang !== expectedLanguage && lang !== 'unknown';
    });

    if (wrongLanguageFeatures.length > 0) {
      issues.push(`${wrongLanguageFeatures.length} features in wrong language`);
    }
  }

  return {
    hasIssues: issues.length > 0,
    issues
  };
}

export default debugRouter;