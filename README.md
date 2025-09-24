# 🏕️ Campingplatz Navigation App

Eine moderne React-basierte Navigationsanwendung speziell für Campingplätze mit intelligenter lokaler Routing-Engine, deutscher Straßennamen-Integration und umfassender POI-Verwaltung.

## ✨ Hauptfunktionen

### 🧭 Intelligente Navigation
- **2-Stufen Direct Routing**: Modern OSM Engine → Google Directions Fallback
- **Deutsche Straßennamen-Navigation**: Authentische Turn-by-Turn Anweisungen mit lokalen Straßennamen
- **Multi-Modal Routing**: Fußgänger, Fahrrad und Auto mit realistischen Geschwindigkeitsberechnungen
- **Real-Time GPS**: Live-Positionsverfolgung mit adaptiven Update-Intervallen
- **Sprachgeführte Navigation**: Mehrsprachiger Support mit nativen Browser-TTS

### 🗺️ Interaktive Kartendarstellung
- **React Leaflet Integration**: Mit Mapbox-Tiles und OpenStreetMap-Fallbacks
- **4 Kartenstile**: Outdoor, Satellite, Streets, Navigation
- **Touch-Gesten**: Pinch-Zoom, Double-Tap, Long-Press optimiert für mobile Geräte
- **Network Overlay**: Debug-Visualisierung des Routing-Netzwerks

### 🏪 POI-Management
- **1905 POIs (Kamperland), 1298 POIs (Zuhause)**: Authentische OpenStreetMap-Daten pro Teststandort
- **Kategorien-Filter**: Unterkunft, Gastronomie, Services, Freizeit, Parken
- **Erweiterte Details**: Enrichment-System mit Bildern und zusätzlichen Informationen
- **Real-Time Suche**: Instant-Filterung mit Distanz-Berechnungen

### 🌤️ Wetter-Integration
- **Live-Wetterdaten**: Aktuelle Bedingungen und 3-Tage-Vorhersage
- **Camping-spezifische Warnungen**: Wetteralerts für Outdoor-Aktivitäten
- **Smart Caching**: Optimierte API-Nutzung mit Koordinaten-Rundung

## 🚀 Quick Start

### Voraussetzungen
- Node.js 18+
- API-Schlüssel für:
  - Google Directions API (für Routing-Fallback)
  - OpenWeather API (für Wetterdaten)
  - Mapbox API (für Kartentiles)

### Installation

```bash
# Dependencies installieren
npm install

# Environment Variables konfigurieren
# In Replit: Über Secrets-Panel
GOOGLE_DIRECTIONS_API_KEY=your_google_api_key
OPENWEATHER_API_KEY=your_openweather_key
MAPBOX_TOKEN=your_mapbox_token
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token

# Development starten
npm run dev
# App läuft auf http://localhost:5000

# Production Build
npm run build
npm start
```

## 🏗️ Technische Architektur

### Frontend Stack
- **React 18.3.1** mit TypeScript für type-sichere Entwicklung
- **Vite** für schnelle Entwicklung und optimierte Builds
- **TanStack Query v5** für effiziente Server State Management
- **Wouter** für lightweight Client-Side Routing
- **Shadcn/UI + Radix UI** für accessible UI-Komponenten
- **Tailwind CSS** für responsive Styling

### Backend Stack
- **Express.js 4.21.2** mit TypeScript
- **Drizzle ORM** mit PostgreSQL-Support (optional)
- **Passport.js** für Authentication (optional, derzeit nicht aktiv)
- **Sharp** für Bildoptimierung
- **WebSocket** Support für Real-Time Features

### Routing Intelligence

#### 2-Stufen Direct Routing
1. **Modern OSM Engine** - Dijkstra-Algorithmus auf lokalen GeoJSON-Netzwerken mit deutschen Straßennamen
2. **Google Directions API** - Professionelle Routing-Fallback für Gebiete ohne lokale Abdeckung

#### Performance Features
- **Graphology-based** Graph mit optimierter Speichernutzung
- **Smart Caching** mit 1-Stunden TTL
- **Deutsche Straßennamen-Extraktion** aus GeoJSON-Properties (`name:de` → `name` Fallback)
- **Lokalisierte Turn-by-Turn Anweisungen** mit authentischen Straßennamen

## 📁 Projektstruktur

```
├── client/src/                  # React Frontend
│   ├── components/             # UI Komponenten
│   │   ├── Map/               # Karten-Komponenten (MapContainer, GestureController)
│   │   ├── Navigation/        # Navigation UI (TravelModeSelector, POIPanel)
│   │   ├── UI/               # Layout Komponenten (PermanentHeader, TransparentOverlay)
│   │   └── ui/               # Shadcn/UI Basis-Komponenten
│   ├── hooks/                # Custom React Hooks
│   │   ├── useLocation.ts    # GPS & Mock Position Management
│   │   ├── usePOI.ts        # POI Data Fetching
│   │   ├── useRouting.ts    # Route Calculation
│   │   └── useLanguage.ts   # i18n Management
│   ├── lib/                 # Client-side Services
│   │   ├── routeTracker.ts  # Navigation Progress Tracking
│   │   ├── voiceGuide.ts    # Text-to-Speech Integration
│   │   ├── i18n.ts          # Internationalization System
│   │   └── mapUtils.ts      # Coordinate & Distance Calculations
│   ├── pages/              # Route Pages
│   │   └── Navigation.tsx  # Haupt-Navigationsseite
│   └── types/              # TypeScript Definitionen
├── server/                 # Express Backend
│   ├── routes/            # API Route Handler
│   │   ├── enhancedRouting.ts    # Haupt-Routing API
│   │   ├── networkAnalysis.ts    # Network Debug & Analysis
│   │   ├── testingRoutes.ts      # Comprehensive Testing
│   │   └── routingAnalysis.ts    # Failure Logging
│   ├── lib/               # Server-side Logic
│   │   ├── smartRoutingOrchestrator.ts  # Routing Orchestrator
│   │   ├── modernRoutingEngine.ts       # OSM Dijkstra Engine
│   │   ├── googleDirectionsService.ts   # Google API Integration
│   │   └── poiTransformer.ts            # GeoJSON → POI Transformation
│   ├── data/             # GeoJSON & Static Data
│   │   ├── zuhause_routing_network.geojson      # Gangelt/Zuhause Routing Network
│   │   ├── roompot_routing_network.geojson      # Kamperland Routing Network
│   │   ├── zuhause_pois.geojson                 # Zuhause POI Daten
│   │   └── combined_pois_roompot.geojson        # Kamperland POI Daten
│   └── index.ts          # Server Entry Point
├── shared/               # Geteilte Typen & Schema
│   └── schema.ts         # Drizzle Database Schema
└── attached_assets/      # Statische Assets
```

## 🌐 API Endpunkte

### Routing APIs
```typescript
// Hauptrouting mit 2-Stufen-Degradation
POST /api/route/enhanced
Body: { from: {lat, lng}, to: {lat, lng}, profile: 'walking'|'cycling'|'driving' }

// OSM-only Routing
POST /api/route/directions
Body: { from: {lat, lng}, to: {lat, lng}, mode: 'walking' }

// Routing-Statistiken
GET /api/stats

// Network Health Check
GET /api/network-status
```

### POI Management
```typescript
// Alle POIs für Standort
GET /api/pois?site=kamperland

// POI-Suche mit Kategorien
GET /api/pois/search?q=restaurant&site=kamperland&category=food-drink

// Erweiterte POI-Details
GET /api/enrichment/search?q=beach_house_123&poi_id=456

// Bilder-Service
GET /api/images/:accommodationId/:filename
```

### Wetter & Utilities
```typescript
// Aktuelles Wetter
GET /api/weather?lat=51.589&lng=3.721

// 3-Tage Vorhersage
GET /api/weather/forecast?lat=51.589&lng=3.721

// Wetter-Warnungen
GET /api/weather/alerts?lat=51.589&lng=3.721

// Service Health Check
GET /api/health
```

### Debug & Testing
```typescript
// Umfassende Routing-Tests
GET /api/testing/comprehensive

// Spezifische Route testen
GET /api/testing/route/:routeId

// Schwierigkeitsbasierte Tests
GET /api/testing/difficulty/:level

// Network-Visualisierung
GET /api/route/network/visualization

// GeoJSON Konnektivitäts-Analyse
GET /api/routing/analysis

// Routing-Failure Logging
POST /api/routing/failure
GET /api/routing/last-failure
```

## 🗄️ Datenbankschema

### PostgreSQL Tables (Drizzle ORM)

```sql
-- Benutzer-Management (Optional - wenn Authentication benötigt wird)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL  -- WICHTIG: Niemals Plaintext, immer bcrypt/argon2 Hash
);

-- POI-Verwaltung
CREATE TABLE pois (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  description TEXT,
  amenities TEXT[],
  hours TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Route-Archivierung
CREATE TABLE routes (
  id SERIAL PRIMARY KEY,
  from_lat DECIMAL(10,8) NOT NULL,
  from_lng DECIMAL(11,8) NOT NULL,
  to_lat DECIMAL(10,8) NOT NULL,
  to_lng DECIMAL(11,8) NOT NULL,
  distance DECIMAL(8,2),
  duration INTEGER,
  instructions TEXT[],
  geometry TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🌍 Test-Standorte

### Zuhause, Deutschland (Primär)
- **Koordinaten**: 51.002°N, 6.051°E (Gangelt)
- **POI-Anzahl**: 1.298 POIs total (umfasst verschiedene OpenStreetMap-Features)
- **Netzwerk**: Vollständige lokale Routing-Abdeckung mit deutschen Straßennamen
- **Features**: Deutsche Turn-by-Turn Navigation, lokale Straßennamen-Integration

### Kamperland, Niederlande (Sekundär)
- **Koordinaten**: 51.589°N, 3.721°E
- **POI-Anzahl**: 1.905 POIs total (beinhaltet 1498 Bungalows, 58 Beach Houses, 19 Lodges)
- **Netzwerk**: Vollständige lokale Routing-Abdeckung
- **Features**: Komplette Unterkunfts-, Gastronomie- und Freizeitdaten

## 🌐 Internationalisierung

### Unterstützte Sprachen
- **Deutsch (de)**: Vollständige deutsche Navigation mit Straßennamen
- **English (en)**: Englische Benutzeroberfläche und Navigation
- **Français (fr)**: Französische Lokalisierung
- **Nederlands (nl)**: Niederländische Übersetzung
- **Italiano (it)**: Italienische Lokalisierung
- **Español (es)**: Spanische Übersetzung

### Voice Guidance
- **Browser-native TTS**: Unterstützung für de-DE, en-US, fr-FR, es-ES, it-IT, nl-NL
- **Smart Language Detection**: Automatische Spracherkennung basierend auf Browser-Einstellungen
- **Lokalisierte Turn-by-Turn Anweisungen**: Sprachspezifische Navigationsbefehle

## 🎯 Verwendung

### Navigation Workflow
1. **Ziel auswählen**: POI suchen oder Karte antippen
2. **Reisemodus wählen**: Fußgänger 🚶, Fahrrad 🚴, oder Auto 🚗
3. **Navigation starten**: "Route dorthin" für Turn-by-Turn Führung
4. **Deutsche Straßennamen folgen**: "Auf Fasanenstraße geradeaus fahren"

### Reisemodi Details

| Modus | Geschwindigkeit | Optimierung | Navigation |
|-------|----------------|-------------|------------|
| 🚶 Fußgänger | 1.0 m/s | Fußwege, Gehsteige | Deutsche Straßennamen-Navigation |
| 🚴 Fahrrad | 2.0 m/s | Radwege, ruhige Straßen | Fahrradfreundliche Routen |
| 🚗 Auto | 4.17 m/s | Befahrbare Straßen | Turn-by-Turn mit Straßennamen |

## 🔧 Development

### Development Commands
```bash
# Development mit Hot Reload
npm run dev

# TypeScript Type Checking
npm run check

# Production Build (Client + Server)
npm run build

# Production Server
npm start

# Database Schema Push
npm run db:push
```

### Key Libraries & Versionen
```json
{
  "react": "^18.3.1",
  "@tanstack/react-query": "^5.60.5",
  "leaflet": "^1.9.4",
  "react-leaflet": "^4.2.1",
  "express": "^4.21.2",
  "drizzle-orm": "^0.39.1",
  "graphology": "^0.25.4",
  "graphology-shortest-path": "^2.1.0",
  "@turf/turf": "^7.2.0",
  "tailwindcss": "^3.4.17",
  "typescript": "5.6.3",
  "vite": "^5.4.14"
}
```

## 🧪 Testing & Debugging

### Mobile Optimierungen
- **Memory Monitor**: Automatische Speicher-Überwachung mit Crash-Detection
- **Mobile Logger**: On-Device Debugging mit Device-Info und Export-Funktion
- **Error Boundaries**: React Error Boundaries mit umfassendem Logging
- **Touch-Gesten**: Optimierte Pinch-Zoom, Double-Tap, Long-Press Interaktionen

### Performance Features
- **Route Calculation**: ~50ms für lokale Routen mit deutschen Straßennamen
- **Graph Loading**: Optimierte GeoJSON-Verarbeitung
- **Memory Footprint**: Effiziente POI-Daten mit selektiven Properties
- **Cache Hit Rate**: 1-Stunden TTL für berechnete Routen

## 🚢 Deployment

### Replit Platform (Empfohlen)
```bash
# Automatische Dependency-Installation
# Environment Variables über Replit Secrets
# Live Deployment mit npm run dev
```

### Environment Variables
```bash
# Required für Production
GOOGLE_DIRECTIONS_API_KEY=your_key    # Google Maps Platform
OPENWEATHER_API_KEY=your_key          # OpenWeatherMap
MAPBOX_TOKEN=your_token               # Mapbox

# Optional Database
DATABASE_URL=postgresql://...          # Neon/PostgreSQL

# Development
VITE_MAPBOX_ACCESS_TOKEN=your_token   # Client-side Mapbox
```

## 🤝 Contributing

### Code Standards
- **TypeScript**: Strict Type Checking erforderlich
- **ESLint + Prettier**: Automatische Code-Formatierung
- **Component Patterns**: Shadcn/UI Design System
- **Performance**: React.memo und useMemo für Optimierung

## 📋 Aktuelle Features

### ✅ Implementiert
- 2-Stufen Direct Routing (OSM + Google Fallback)
- Deutsche Straßennamen-Integration mit lokalen GeoJSON-Properties
- Mobile-optimierte Touch-Gesten und Memory Management
- POI-System mit Kategorie-Filterung und Enrichment
- Mehrsprachen-Support (DE, EN, FR, ES, IT, NL)
- Comprehensive Testing & Debug System
- Weather Integration mit Smart Caching
- Network Visualization & Analysis

### 🔄 Roadmap
- Offline-Fähigkeiten für schlechte Netzabdeckung
- Voice-Guidance Verbesserungen
- Performance-Optimierungen für große POI-Datasets
- Advanced Route Preferences (avoid hills, prefer paved)

## 📜 Lizenz

MIT License - siehe [LICENSE](LICENSE) Datei für Details.

## 🙏 Danksagungen

- **OpenStreetMap**: Detaillierte geografische Daten mit deutschen Straßennamen
- **Google Directions API**: Professionelle Routing-Capabilities als Fallback
- **Mapbox**: Hochwertige Kartentiles und Satellitenbilder
- **React Leaflet**: Exzellente Mapping-Library
- **Shadcn/UI**: Schöne, accessible UI-Komponenten
- **Graphology**: Performante Graph-Algorithmen für lokales Routing

---

**Entwickelt mit ❤️ für Outdoor-Enthusiasten und Camping-Communities**

Für Fragen, Support oder Feature-Requests bitte ein Issue im Repository erstellen.