import type { Express } from "express";
import { createServer, type Server } from "http";
import { WeatherService } from "../client/src/lib/weatherService";
import ModernRoutingEngine from './lib/modernRoutingEngine.js';
import { readFileSync, existsSync } from 'fs';
import { join } from "path";
import { Request, Response } from 'express';
import { accommodationEnricher } from './lib/accommodationEnricher.js';
import express from 'express';
import { MemStorage } from './storage.js';
import { transformGeoJSONToPOIs, searchPOIs, filterPOIsByCategory } from './lib/poiTransformer.js';
import enhancedRoutingRouter from './routes/enhancedRouting.js';
import debugRouter from './routes/debugRoutes.js';
import * as fs from 'fs';
import * as path from 'path';
import { ElevenLabsServerService } from './lib/elevenLabsServer';

console.log('ROUTES: Modern Routing Engine only');

// Helper function to detect language from Accept-Language header
const detectLanguageFromHeader = (header: string | undefined): string => {
  if (!header) return 'en';

  const languages = header.split(',');
  const prioritizedLanguages = languages.map(lang => lang.trim().split(';q=')).sort((a, b) => {
    const qA = parseFloat(a[1] || '1');
    const qB = parseFloat(b[1] || '1');
    return qB - qA;
  });

  const primaryLanguage = prioritizedLanguages[0]?.[0];
  return primaryLanguage ? primaryLanguage.split('-')[0] : 'en';
};

// Initialize a new router for specific endpoints
const apiRouter = express.Router();

// Weather endpoints
apiRouter.get("/weather", async (req: Request, res: Response) => {
  try {
    const { lat, lng } = req.query;
    console.log(`Weather request for coordinates: ${lat}, ${lng}`);

    // Get real location name using OpenWeatherMap's reverse geocoding
    let locationName = "Unbekannt";
    if (lat && lng) {
      const latFloat = parseFloat(lat as string);
      const lngFloat = parseFloat(lng as string);

      try {
        // Use OpenWeatherMap's reverse geocoding API
        const geocodeUrl = `https://api.openweathermap.org/geo/1.0/reverse?lat=${latFloat}&lon=${lngFloat}&limit=1&appid=${process.env.OPENWEATHER_API_KEY}`;

        const geocodeResponse = await fetch(geocodeUrl);
        if (geocodeResponse.ok) {
          const geocodeData = await geocodeResponse.json();
          if (geocodeData && geocodeData.length > 0) {
            const location = geocodeData[0];
            // Use city name, or state/country as fallback
            locationName = location.name || location.state || location.country || "Unbekannt";
            console.log(`🌍 REAL GEOCODING: ${latFloat},${lngFloat} → ${locationName}`);
          } else {
            locationName = `${latFloat.toFixed(3)}°N, ${lngFloat.toFixed(3)}°E`;
          }
        } else {
          console.warn('⚠️ Geocoding API failed, using coordinates');
          locationName = `${latFloat.toFixed(3)}°N, ${lngFloat.toFixed(3)}°E`;
        }
      } catch (error) {
        console.error('❌ Geocoding error:', error);
        locationName = `${latFloat.toFixed(3)}°N, ${lngFloat.toFixed(3)}°E`;
      }
    }

    // Get real weather data from OpenWeatherMap API
    try {
      const latFloat = parseFloat(lat as string);
      const lngFloat = parseFloat(lng as string);
      const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latFloat}&lon=${lngFloat}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric&lang=de`;

      const weatherResponse = await fetch(weatherUrl);
      if (weatherResponse.ok) {
        const realWeatherData = await weatherResponse.json();

        // Map OpenWeatherMap condition to our icon system
        const getWeatherIcon = (condition: string): string => {
          const iconMap: Record<string, string> = {
            'Clear': 'sunny',
            'Clouds': 'cloudy',
            'Rain': 'rainy',
            'Drizzle': 'rainy',
            'Thunderstorm': 'stormy',
            'Snow': 'snowy',
            'Mist': 'foggy',
            'Fog': 'foggy',
            'Haze': 'foggy'
          };
          return iconMap[condition] || 'cloudy';
        };

        const weatherData = {
          temperature: Math.round(realWeatherData.main.temp),
          condition: realWeatherData.weather[0].main,
          humidity: realWeatherData.main.humidity,
          windSpeed: Math.round(realWeatherData.wind.speed * 3.6), // Convert m/s to km/h
          location: locationName,
          icon: getWeatherIcon(realWeatherData.weather[0].main),
          description: realWeatherData.weather[0].description
        };

        console.log(`🌤️ REAL Weather response for ${locationName}:`, weatherData);
        res.json(weatherData);
      } else {
        console.warn('⚠️ OpenWeatherMap API failed, using fallback data');
        const fallbackData = {
          temperature: 20,
          condition: "Unknown",
          humidity: 50,
          windSpeed: 10,
          location: locationName,
          icon: "cloudy"
        };
        res.json(fallbackData);
      }
    } catch (weatherError) {
      console.error('❌ Weather API error:', weatherError);
      const fallbackData = {
        temperature: 20,
        condition: "Unknown",
        humidity: 50,
        windSpeed: 10,
        location: locationName,
        icon: "cloudy"
      };
      res.json(fallbackData);
    }
  } catch (error) {
    console.error('Weather API error:', error);
    res.status(500).json({ error: 'Weather service unavailable' });
  }
});

apiRouter.get("/weather/forecast", async (req: Request, res: Response) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Coordinates required' });
    }

    const latFloat = parseFloat(lat as string);
    const lngFloat = parseFloat(lng as string);

    // Get real 5-day forecast from OpenWeatherMap
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latFloat}&lon=${lngFloat}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric&lang=de`;

    const forecastResponse = await fetch(forecastUrl);
    if (forecastResponse.ok) {
      const forecastApiData = await forecastResponse.json();

      // Extract today, tomorrow, and day after data
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(today);
      dayAfter.setDate(dayAfter.getDate() + 2);

      const getWeatherIcon = (condition: string): string => {
        const iconMap: Record<string, string> = {
          'Clear': 'sunny',
          'Clouds': 'cloudy',
          'Rain': 'rainy',
          'Drizzle': 'rainy',
          'Thunderstorm': 'stormy',
          'Snow': 'snowy',
          'Mist': 'foggy',
          'Fog': 'foggy',
          'Haze': 'foggy'
        };
        return iconMap[condition] || 'cloudy';
      };

      // Find forecasts for each day (taking noon forecasts for consistency)
      const getTodayForecast = () => {
        const todayForecasts = forecastApiData.list.filter((item: any) => {
          const itemDate = new Date(item.dt * 1000);
          return itemDate.toDateString() === today.toDateString();
        });
        return todayForecasts.length > 0 ? todayForecasts[0] : null;
      };

      const getTomorrowForecast = () => {
        const tomorrowForecasts = forecastApiData.list.filter((item: any) => {
          const itemDate = new Date(item.dt * 1000);
          return itemDate.toDateString() === tomorrow.toDateString();
        });
        return tomorrowForecasts.length > 0 ? tomorrowForecasts[Math.floor(tomorrowForecasts.length / 2)] : null;
      };

      const getDayAfterForecast = () => {
        const dayAfterForecasts = forecastApiData.list.filter((item: any) => {
          const itemDate = new Date(item.dt * 1000);
          return itemDate.toDateString() === dayAfter.toDateString();
        });
        return dayAfterForecasts.length > 0 ? dayAfterForecasts[Math.floor(dayAfterForecasts.length / 2)] : null;
      };

      const todayForecast = getTodayForecast();
      const tomorrowForecast = getTomorrowForecast();
      const dayAfterForecast = getDayAfterForecast();

      const forecastData = {
        today: todayForecast ? {
          temp: Math.round(todayForecast.main.temp),
          condition: todayForecast.weather[0].main,
          icon: getWeatherIcon(todayForecast.weather[0].main)
        } : { temp: 20, condition: "Unknown", icon: "cloudy" },

        tomorrow: tomorrowForecast ? {
          temp: Math.round(tomorrowForecast.main.temp),
          condition: tomorrowForecast.weather[0].main,
          icon: getWeatherIcon(tomorrowForecast.weather[0].main)
        } : { temp: 21, condition: "Unknown", icon: "cloudy" },

        dayAfter: dayAfterForecast ? {
          temp: Math.round(dayAfterForecast.main.temp),
          condition: dayAfterForecast.weather[0].main,
          icon: getWeatherIcon(dayAfterForecast.weather[0].main)
        } : { temp: 19, condition: "Unknown", icon: "cloudy" }
      };

      console.log(`🌦️ REAL Forecast data generated:`, forecastData);
      res.json(forecastData);
    } else {
      console.warn('⚠️ Forecast API failed, using fallback data');
      const fallbackData = {
        today: { temp: 20, condition: "Unknown", icon: "cloudy" },
        tomorrow: { temp: 21, condition: "Unknown", icon: "cloudy" },
        dayAfter: { temp: 19, condition: "Unknown", icon: "cloudy" }
      };
      res.json(fallbackData);
    }
  } catch (error) {
    console.error('Weather forecast API error:', error);
    res.status(500).json({ error: 'Weather forecast service unavailable' });
  }
});

apiRouter.get("/weather/alerts", async (req: Request, res: Response) => {
  try {
    const { lat, lng } = req.query;
    console.log(`Weather alerts request for: ${lat}, ${lng}`);

    // Mock alerts data - empty for now
    res.json({ alerts: [] });
  } catch (error) {
    console.error('Weather alerts API error:', error);
    res.status(500).json({ error: 'Weather alerts service unavailable' });
  }
});

// Enrichment API
apiRouter.get("/enrichment/search", async (req: Request, res: Response) => {
  try {
    const { q: searchQuery, poi_id: poiId } = req.query;

    if (!searchQuery) {
      return res.status(400).json({ error: 'Search query required' });
    }

    console.log(`Enrichment API called with query: "${searchQuery}", POI ID: "${poiId}"`);

    const enrichmentResults = accommodationEnricher.getAllAccommodations().filter(acc => 
      acc.accommodation_id.toLowerCase().includes((searchQuery as string).toLowerCase()) ||
      (typeof acc.name === 'string' && acc.name.toLowerCase().includes((searchQuery as string).toLowerCase()))
    );

    if (Object.keys(enrichmentResults).length > 0) {
      console.log(`Found enrichment data for: ${searchQuery}`);
      res.json(enrichmentResults);
    } else {
      console.log(`No enrichment data found for: ${searchQuery}`);
      res.status(404).json({ error: 'No enrichment data found' });
    }
  } catch (error) {
    console.error('Enrichment API error:', error);
    res.status(500).json({ error: 'Enrichment service unavailable' });
  }
});

// Image serving endpoint
apiRouter.get("/images/:accommodationId/:filename", (req: Request, res: Response) => {
  try {
    const { accommodationId, filename } = req.params;
    const imagePath = path.join(process.cwd(), 'server/data/crawler/images', accommodationId, filename);

    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.sendFile(imagePath);
  } catch (error) {
    console.error('Image serving error:', error);
    res.status(500).json({ error: 'Image service unavailable' });
  }
});

// POI endpoints
apiRouter.get("/pois", async (req: Request, res: Response) => {
  try {
    const site = req.query.site as string || 'kamperland';
    console.log(`Loading POI data for site: ${site}`);

    const dataPath = join(process.cwd(), 'server/data/combined_pois_roompot.geojson');
    const rawData = readFileSync(dataPath, 'utf-8');
    const geoData = JSON.parse(rawData);

    // Transform GeoJSON to POI format
    const pois = geoData.features.map((feature: any, index: number) => {
      const coords = feature.geometry?.coordinates;
      const props = feature.properties || {};

      // Validate coordinates exist and are valid numbers
      if (!coords || !Array.isArray(coords) || coords.length < 2 ||
          typeof coords[0] !== 'number' || typeof coords[1] !== 'number') {
        console.warn(`Invalid coordinates for POI ${props.name || `poi_${index}`}:`, coords);
        return null;
      }

      return {
        id: props.id || `poi_${index}`,
        name: props.name || 'Unnamed Location',
        lodge_number: props.lodge_number || null,
        category: props.category || 'other',
        coordinates: {
          lat: coords[1],
          lng: coords[0]
        },
        latitude: coords[1].toString(),
        longitude: coords[0].toString(),
        description: props.description || '',
        amenities: props.amenities || [],
        hours: props.hours || null,
        createdAt: new Date().toISOString(),
        roompot_category: props.roompot_category || null,
        data_source: 'osm',
        osm_id: props.osm_id || null
      };
    }).filter(poi => poi !== null); // Remove invalid POIs

    console.log(`Loaded ${pois.length} POIs for site ${site}`);
    res.json(pois);
  } catch (error) {
    console.error('POI loading error:', error);
    res.status(500).json({ error: 'Failed to load POIs' });
  }
});

// POI Search endpoint - MUST BE BEFORE :id route to avoid conflict
apiRouter.get("/pois/search", async (req: Request, res: Response) => {
  try {
    const { q: query, site, category } = req.query;
    console.log(`POI Search request:`, { query, site, category });

    const searchSite = (site as string) || 'kamperland';
    const dataPath = join(process.cwd(), 'server/data/combined_pois_roompot.geojson');
    const rawData = readFileSync(dataPath, 'utf-8');
    const geoData = JSON.parse(rawData);

    // Helper function to categorize POIs based on their properties
    const categorizePOI = (props: any): string => {
      const name = String(props.name || '').toLowerCase();
      const description = String(props.description || '').toLowerCase();
      const amenities = props.amenities || [];

      // Map accommodation type to POI category
      const typeMapping = {
        'beach_house': 'beach-houses',
        'lodge': 'lodge',  // All lodges use single category
        'bungalow': 'bungalows'
      };
      if (props.building_type && typeMapping[props.building_type]) {
        return typeMapping[props.building_type];
      }

      // Direct category mapping from data
      if (props.category) {
        return props.category;
      }

      // Name-based categorization
      if (name.includes('toilet') || name.includes('wc') || name.includes('restroom')) {
        return 'toilets';
      }
      if (name.includes('parking') || name.includes('car park')) {
        return 'parking';
      }
      if (name.includes('restaurant') || name.includes('cafe') || name.includes('food') || name.includes('drink')) {
        return 'food-drink';
      }
      if (name.includes('pool') || name.includes('swimming') || name.includes('playground') || name.includes('sport')) {
        return 'leisure';
      }
      if (name.includes('reception') || name.includes('office') || name.includes('information') || name.includes('service')) {
        return 'services';
      }
      if (name.includes('beach house') || name.includes('chalet') || name.includes('bungalow') || name.includes('cabin') || name.includes('lodge')) {
        if (name.includes('beach')) {
          return 'beach_houses';
        }
        if (name.includes('lodge') || props.roompot_category?.toLowerCase().includes('lodge')) {
          return 'lodges';
        }
        return 'accommodation';
      }
      if (name.includes('hotel') || name.includes('camping') || name.includes('accommodation')) {
        return 'accommodation';
      }

      // Default fallback
      return 'services';
    };

    const allPOIs = geoData.features.map((feature: any, index: number) => {
      const coords = feature.geometry?.coordinates;
      const props = feature.properties || {};

      if (!coords || !Array.isArray(coords) || coords.length < 2 ||
          typeof coords[0] !== 'number' || typeof coords[1] !== 'number') {
        return null;
      }

      const category = categorizePOI(props);

      return {
        id: props.id || `poi_${index}`,
        name: props.name || `Unnamed POI ${index}`,
        lodge_number: props.lodge_number || null,
        category: category,
        subCategory: props.subCategory || null,
        coordinates: { lat: coords[1], lng: coords[0] },
        description: props.description || null,
        amenities: props.amenities || [],
        hours: props.hours || null,
        roompot_category: props.roompot_category || null,
        building_type: props.building_type || null,
        data_source: 'osm',
        osm_id: props.osm_id || null
      };
    }).filter(poi => poi !== null);

    let filteredPOIs = allPOIs;

    // Filter by category if provided
    if (category) {
      filteredPOIs = filteredPOIs.filter(poi => {
        const poiCategory = String(poi.category || '').toLowerCase();
        const searchCategory = String(category || '').toLowerCase();
        return poiCategory === searchCategory ||
               poiCategory.includes(searchCategory) ||
               searchCategory.includes(poiCategory);
      });
    }

    // Filter by query if provided
    if (query) {
      const searchTerm = (query as string).toLowerCase();
      filteredPOIs = filteredPOIs.filter(poi => {
        return String(poi.name || '').toLowerCase().includes(searchTerm) ||
               String(poi.category || '').toLowerCase().includes(searchTerm) ||
               (poi.description && String(poi.description).toLowerCase().includes(searchTerm)) ||
               (poi.lodge_number && searchTerm === 'lodge') ||
               (poi.roompot_category && String(poi.roompot_category).toLowerCase().includes(searchTerm)) ||
               (poi.building_type && String(poi.building_type).toLowerCase().includes(searchTerm));
      });
    }

    // Limit results to prevent performance issues
    const results = filteredPOIs.slice(0, 50);

    console.log(`POI Search results: Found ${results.length} POIs for query "${query}" in category "${category}"`);
    res.json(results);

  } catch (error) {
    console.error('POI Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Individual POI endpoint with enrichment data
apiRouter.get("/pois/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const site = req.query.site as string || 'kamperland';
    console.log(`🏠 INDIVIDUAL POI REQUEST: "${id}" for site: ${site}`);

    const dataPath = join(process.cwd(), 'server/data/combined_pois_roompot.geojson');
    const rawData = readFileSync(dataPath, 'utf-8');
    const geoData = JSON.parse(rawData);

    // Find the specific POI
    const feature = geoData.features.find((f: any) => f.properties?.id === id);

    if (!feature) {
      console.log(`🏠 POI not found: ${id}`);
      return res.status(404).json({ error: 'POI not found' });
    }

    const coords = feature.geometry?.coordinates;
    const props = feature.properties || {};

    // Basic POI data
    let poi = {
      id: props.id || id,
      name: props.name || 'Unnamed Location',
      lodge_number: props.lodge_number || null,
      category: props.category || 'other',
      coordinates: {
        lat: coords[1],
        lng: coords[0]
      },
      latitude: coords[1].toString(),
      longitude: coords[0].toString(),
      description: props.description || '',
      amenities: props.amenities || [],
      hours: props.hours || null,
      createdAt: new Date().toISOString(),
      roompot_category: props.roompot_category || null,
      building_type: props.building_type || null,
      enrichment_key: props.enrichment_key || null,
      data_source: 'osm',
      osm_id: props.osm_id || null
    };

    // Apply enrichment data using the accommodationEnricher
    const enrichedPOI = accommodationEnricher.enrichPOI(poi, 'de');

    console.log(`🏠 Returning enriched POI: "${poi.name}" (enriched: ${!!enrichedPOI})`);
    res.json(enrichedPOI || poi);
  } catch (error) {
    console.error('Individual POI loading error:', error);
    res.status(500).json({ error: 'Failed to load POI' });
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  console.log('Initializing WeatherService with API key:', {
    hasKey: !!process.env.OPENWEATHER_API_KEY,
    keyLength: process.env.OPENWEATHER_API_KEY?.length || 0,
    keyPrefix: process.env.OPENWEATHER_API_KEY?.substring(0, 8) || 'none'
  });

  const weatherService = new WeatherService(
    process.env.OPENWEATHER_API_KEY || ""
  );

  // Helper function to load POI data
  async function getPOIData(site: string) {
    try {
      console.log(`Loading POI data for site: ${site}`);

      const poiPath = join(process.cwd(), 'server/data/combined_pois_roompot.geojson');

      if (!fs.existsSync(poiPath)) {
        console.error(`POI file not found: ${poiPath}`);
        return [];
      }

      const poiData = JSON.parse(fs.readFileSync(poiPath, 'utf8'));
      const transformedPOIs = transformGeoJSONToPOIs(poiData, site);

      console.log(`Loaded ${transformedPOIs.length} POIs for site ${site}`);
      return transformedPOIs;
    } catch (error) {
      console.error('Error loading POI data:', error);
      return [];
    }
  }

  // Helper method for weather icons
  const getWeatherIcon = (condition: string): string => {
    const iconMap: Record<string, string> = {
      'Clear': 'sunny',
      'Clouds': 'cloudy',
      'Rain': 'rainy',
      'Drizzle': 'drizzle',
      'Thunderstorm': 'stormy',
      'Snow': 'snowy',
      'Mist': 'foggy',
      'Fog': 'foggy',
      'Haze': 'foggy'
    };
    return iconMap[condition] || 'cloudy';
  };

  // NOTE: Enhanced routing now handled by dedicated router in server/routes/enhancedRouting.ts

  // Helper function to decode Google polyline
  function decodePolyline(encoded) {
    const coordinates = [];
    let index = 0, lat = 0, lng = 0;

    while (index < encoded.length) {
      let byte = 0, shift = 0, result = 0;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      const deltaLat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lat += deltaLat;

      shift = 0;
      result = 0;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      const deltaLng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lng += deltaLng;

      coordinates.push([lng / 1e5, lat / 1e5]);
    }
    return coordinates;
  }

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        weather: !!process.env.OPENWEATHER_API_KEY,
        modernRouting: true
      }
    });
  });

  // Helper functions for network overlay
  function getOrCreateNode(nodeMap, coord, tolerance) {
    const key = `${Math.round(coord[1] * 10000)}_${Math.round(coord[0] * 10000)}`;

    if (!nodeMap.has(key)) {
      nodeMap.set(key, {
        id: key,
        coordinates: [coord[1], coord[0]], // lat, lng
        connectionCount: 0,
        type: 'isolated'
      });
    }
    return key;
  }

  function calculateDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Network overlay endpoint
  app.get('/api/network-overlay', async (req, res) => {
    try {
      console.log('🗺️ Network overlay data requested');

      const geojsonPath = join(process.cwd(), 'server/data/roompot_routing_network.geojson');
      const geojsonData = JSON.parse(fs.readFileSync(geojsonPath, 'utf-8'));

      const nodeMap = new Map();
      const edges = [];
      const tolerance = 2; // 2 meter tolerance

      // Process all LineString features
      for (const feature of geojsonData.features || []) {
        if (feature.geometry?.type === 'LineString') {
          const coordinates = feature.geometry.coordinates;
          const properties = feature.properties || {};
          const pathType = properties.highway || 'path';

          if (coordinates.length >= 2) {
            const startCoord = coordinates[0];
            const endCoord = coordinates[coordinates.length - 1];

            // Get or create nodes
            const startNodeId = getOrCreateNode(nodeMap, startCoord, tolerance);
            const endNodeId = getOrCreateNode(nodeMap, endCoord, tolerance);

            if (startNodeId !== endNodeId) {
              // Add edge
              edges.push({
                id: `edge_${edges.length}`,
                coordinates: coordinates,
                pathType,
                distance: Math.round(calculateDistanceMeters(
                  startCoord[1], startCoord[0],
                  endCoord[1], endCoord[0]
                ))
              });

              // Update node connections
              const startNode = nodeMap.get(startNodeId);
              const endNode = nodeMap.get(endNodeId);
              startNode.connectionCount++;
              endNode.connectionCount++;
            }
          }
        }
      }

      // Convert nodes to array and classify them
      const nodes = Array.from(nodeMap.values()).map(node => ({
        ...node,
        type: node.connectionCount === 0 ? 'isolated' :
              node.connectionCount === 1 ? 'endpoint' : 'junction'
      }));

      // Simple component analysis
      let componentCount = 0;

      console.log(`✅ NETWORK OVERLAY: Generated ${nodes.length} nodes, ${edges.length} edges`);

      res.json({
        nodes,
        edges,
        stats: {
          totalNodes: nodes.length,
          totalEdges: edges.length,
          components: componentCount,
          coverage: '100%'
        }
      });

    } catch (error) {
      console.error('❌ Network overlay failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate network overlay',
        details: error.message
      });
    }
  });

  // Helper functions for network overlay
  function getOrCreateNode(nodeMap: Map<string, any>, coordinates: [number, number], tolerance: number) {
    // Check if a node already exists within tolerance
    for (const [nodeId, node] of nodeMap) {
      const distance = calculateDistanceMeters(
        coordinates[1], coordinates[0],
        node.coordinates[1], node.coordinates[0]
      );

      if (distance < tolerance) {
        return nodeId;
      }
    }

    // Create new node
    const nodeId = `node_${nodeMap.size}`;
    const node = {
      id: nodeId,
      coordinates,
      connectionCount: 0
    };

    nodeMap.set(nodeId, node);
    return nodeId;
  }

  // Load POI data from GeoJSON file
  app.get('/api/pois', (req, res) => {
    try {
      const site = req.query.site as string || 'kamperland';
      console.log(`Loading POI data for site: ${site}`);

      // Site-specific POI file loading
      let poiFilePath: string;
      if (site === 'zuhause') {
        poiFilePath = join(process.cwd(), 'server/data/zuhause_pois.geojson');
        console.log(`🏠 Loading zuhause-specific POIs from: ${poiFilePath}`);
      } else {
        // Default to combined roompot POIs for kamperland and other sites
        poiFilePath = join(process.cwd(), 'server/data/combined_pois_roompot.geojson');
        console.log(`🏕️ Loading roompot POIs from: ${poiFilePath}`);
      }

      // Check if file exists
      if (!fs.existsSync(poiFilePath)) {
        console.error(`❌ POI file not found: ${poiFilePath}`);
        return res.status(500).json({ error: `POI file not found for site: ${site}` });
      }

      const poiData = JSON.parse(fs.readFileSync(poiFilePath, 'utf8'));
      const transformedPOIs = transformGeoJSONToPOIs(poiData, site);

      console.log(`✅ Loaded ${transformedPOIs.length} POIs for site ${site} from ${path.basename(poiFilePath)}`);

      res.json(transformedPOIs);
    } catch (error) {
      console.error('❌ Error loading POI data:', error);
      res.status(500).json({ error: 'Failed to load POI data' });
    }
  });

  // POI Search endpoint
  app.get('/api/pois/search', (req, res) => {
    try {
      const { q: query, site = 'kamperland', category } = req.query;
      console.log('POI Search request:', { query, site, category });

      if (!query || typeof query !== 'string') {
        return res.json([]);
      }

      // Site-specific POI file loading for search
      let poiFilePath: string;
      if (site === 'zuhause') {
        poiFilePath = join(process.cwd(), 'server/data/zuhause_pois.geojson');
        console.log(`🔍 Searching zuhause POIs from: ${poiFilePath}`);
      } else {
        poiFilePath = join(process.cwd(), 'server/data/combined_pois_roompot.geojson');
        console.log(`🔍 Searching roompot POIs from: ${poiFilePath}`);
      }

      // Check if file exists
      if (!fs.existsSync(poiFilePath)) {
        console.error(`❌ POI search file not found: ${poiFilePath}`);
        return res.json([]);
      }

      const poiData = JSON.parse(fs.readFileSync(poiFilePath, 'utf8'));
      const allPOIs = transformGeoJSONToPOIs(poiData, site as string);

      // Search logic
      const searchTerm = query.toLowerCase();
      let results = allPOIs.filter(poi =>
        poi.name.toLowerCase().includes(searchTerm) ||
        (poi.category && poi.category.toLowerCase().includes(searchTerm)) ||
        (poi.description && poi.description.toLowerCase().includes(searchTerm))
      );

      // Apply category filter if provided
      if (category && category !== 'undefined') {
        results = results.filter(poi => poi.category === category);
      }

      console.log(`🔍 POI Search results: Found ${results.length} POIs for query "${query}" in site "${site}" from ${path.basename(poiFilePath)}`);
      res.json(results);
    } catch (error) {
      console.error('❌ Error searching POIs:', error);
      res.status(500).json({ error: 'Failed to search POIs' });
    }
  });

  // ElevenLabs TTS endpoints (sichere server-seitige Implementation)
  let elevenLabsService: ElevenLabsServerService | null = null;
  
  // Initialize ElevenLabs service only if API key is available
  try {
    elevenLabsService = new ElevenLabsServerService();
    console.log('🎤 ElevenLabs TTS Service initialisiert');
  } catch (error) {
    console.warn('⚠️ ElevenLabs Service nicht verfügbar:', error instanceof Error ? error.message : 'Unknown error');
  }
  
  // TTS generation endpoint
  apiRouter.post("/tts/generate", async (req: Request, res: Response) => {
    if (!elevenLabsService) {
      return res.status(503).json({ error: 'ElevenLabs Service nicht verfügbar - API-Key fehlt' });
    }
    
    try {
      const { text, type = 'direction' } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text ist erforderlich' });
      }
      
      if (text.length > 500) {
        return res.status(400).json({ error: 'Text zu lang (max 500 Zeichen)' });
      }
      
      console.log('🎤 TTS Request:', { text: text.slice(0, 50) + '...', type });
      
      const audioBuffer = await elevenLabsService.generateGermanTTS(text, type);
      
      // Return audio as binary data
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600' // 1 Stunde Cache für identische Requests
      });
      
      res.send(Buffer.from(audioBuffer));
    } catch (error) {
      console.error('❌ TTS Generation Error:', error);
      res.status(500).json({ 
        error: 'TTS-Generierung fehlgeschlagen',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // TTS connection test endpoint  
  apiRouter.get("/tts/test", async (req: Request, res: Response) => {
    if (!elevenLabsService) {
      return res.status(503).json({ 
        available: false, 
        error: 'ElevenLabs Service nicht verfügbar - API-Key fehlt' 
      });
    }
    
    try {
      const isConnected = await elevenLabsService.testConnection();
      res.json({ 
        available: true, 
        connected: isConnected,
        message: isConnected ? 'ElevenLabs TTS funktioniert' : 'Verbindung fehlgeschlagen'
      });
    } catch (error) {
      res.status(500).json({ 
        available: true, 
        connected: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Deutsche Stimmen abrufen  
  apiRouter.get("/tts/voices/german", async (req: Request, res: Response) => {
    if (!elevenLabsService) {
      return res.status(503).json({ error: 'ElevenLabs Service nicht verfügbar' });
    }

    try {
      const germanVoices = await elevenLabsService.getGermanVoices();
      res.json({ 
        voices: germanVoices,
        total: germanVoices.length,
        currentVoice: elevenLabsService.getCurrentVoiceId(),
        message: `${germanVoices.length} deutsche Stimmen verfügbar`
      });
    } catch (error) {
      console.error('❌ Deutsche Stimmen-Abruf Fehler:', error);
      res.status(500).json({ error: 'Deutsche Stimmen konnten nicht abgerufen werden' });
    }
  });

  // Stimme wechseln
  apiRouter.post("/tts/voice", async (req: Request, res: Response) => {
    if (!elevenLabsService) {
      return res.status(503).json({ error: 'ElevenLabs Service nicht verfügbar' });
    }

    try {
      const { voiceId } = req.body;
      if (!voiceId) {
        return res.status(400).json({ error: 'voiceId ist erforderlich' });
      }

      const success = await elevenLabsService.setVoice(voiceId);
      if (success) {
        res.json({ 
          success: true,
          currentVoice: elevenLabsService.getCurrentVoiceId(),
          message: 'Stimme erfolgreich gewechselt'
        });
      } else {
        res.status(400).json({ error: 'Stimmenwechsel fehlgeschlagen' });
      }
    } catch (error) {
      console.error('❌ Stimmenwechsel Fehler:', error);
      res.status(500).json({ error: 'Stimmenwechsel nicht möglich' });
    }
  });

  // Mount the new router for the specific API endpoints
  app.use('/api', apiRouter);

  // Mount enhanced routing router
  app.use('/api/route', enhancedRoutingRouter);
  console.log('✅ Enhanced routing mounted at /api/route');

  // Mount debug routes (development only)
  if (process.env.NODE_ENV === 'development') {
    app.use('/api/debug', debugRouter);
    console.log('🐛 Debug routes mounted at /api/debug');
  }

  // OLD DUPLICATE SEARCH ROUTE REMOVED - using apiRouter version instead

  const httpServer = createServer(app);
  return httpServer;
}