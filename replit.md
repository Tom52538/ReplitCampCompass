# Campingplatz Navigation App - Replit Dokumentation

## Overview
Die Campingplatz Navigation App ist eine moderne React-TypeScript-Anwendung für spezialisierte Outdoor-Navigation. Sie bietet eine intelligente 2-Stufen-Routing-Engine mit deutscher Straßennamen-Integration, touch-optimierte mobile Bedienung und umfassende POI-Verwaltung. Die Anwendung zielt darauf ab, zuverlässige und intuitive Navigation für Campingplatz-Besucher zu bieten, Rezeptionspersonal zu unterstützen und eine Infrastruktur-Übersicht für das Facility Management anzubieten.

## User Preferences
Ich bevorzuge iterative Entwicklung mit klarer Kommunikation bei jedem Schritt. Bevor Sie größere architektonische Änderungen vornehmen oder neue Dependencies einführen, fragen Sie bitte um meine Zustimmung. Ich schätze detaillierte Erklärungen komplexer technischer Entscheidungen. Nehmen Sie keine Änderungen an der `shared/schema.ts` Datei ohne explizite Anweisung vor.

## System Architecture

### Frontend
- **Framework**: React 18.3.1 mit TypeScript und Vite
- **UI/UX**: Shadcn/UI-Komponenten mit Radix UI Primitives, gestylt mit Tailwind CSS und Glassmorphism-Design-Philosophie
- **State Management**: TanStack Query v5 für Server State, `useState` für lokale UI- und Navigation-States
- **Routing**: Wouter für Client-side Navigation
- **Maps**: React Leaflet mit Mapbox/OpenStreetMap-Integration, bietet vier Kartenstile (Outdoor, Satellite, Streets, Navigation). Features Touch-Gesten wie Pinch-Zoom, Double-Tap und Long-Press
- **Iconography**: Lucide React
- **Accessibility**: Umfassende ARIA-Labels, Keyboard-Navigation, hoher Kontrast und 44px minimale Touch-Targets
- **UI Modes**: Adaptive UI mit unterschiedlichen Modi für Start, Search, POI-Info, Route-Planning und Navigation

### Backend
- **Server**: Node.js mit Express.js und TypeScript
- **API**: RESTful Endpoints mit JSON Response Format
- **Database**: PostgreSQL mit Drizzle ORM (optional)
- **Authentication**: Passport.js mit Local Strategy (optional, derzeit nicht aktiv)
- **Build System**: esbuild für Server-Compilation

### Routing Intelligence
- **2-Stufen Direct Routing Strategy**:
    1. **Modern OSM Routing Engine**: Primäre Methode, verwendet Dijkstra-Algorithmus auf lokalen GeoJSON-Netzwerken mit deutschen Straßennamen-Extraktion (`zuhause_routing_network.geojson`, `roompot_routing_network.geojson`)
    2. **Google Directions API**: Fallback für professionelle Routing-Qualität mit Polyline-Dekodierung und Instruction-Parsing
- **Smart Routing Orchestrator**: Verwaltet Routing-Logik mit LRU-Cache (1-Stunden TTL), Performance-Monitoring und Failure-Logging
- **Deutsche Straßennamen-Integration**: Extrahiert lokale Straßennamen aus GeoJSON-Properties (`name:de` → `name` Fallback-Chain)

### Data Management
- **Database Schema**: Umfasst `users`, `pois` und `routes` Tabellen für umfassende Datenspeicherung, verwaltet mit Drizzle ORM
- **GeoJSON Data**: 
  - `zuhause_routing_network.geojson` für Routing in Gangelt/Zuhause
  - `roompot_routing_network.geojson` für Routing in Kamperland
  - `zuhause_pois.geojson` (1.298 POIs total)
  - `combined_pois_roompot.geojson` (1.905 POIs total)
- **Image Assets**: Gespeichert in `/server/data/crawler/images/`

### Mobile Optimization
- **Touch-Gesture System**: Implementiert für intuitive Karten-Interaktion
- **Responsive Design**: Mobile-first Entwicklung mit Progressive Enhancement für Desktop
- **Memory Management**: Automatisches Memory-Monitoring und Garbage Collection mit Crash-Detection
- **Mobile Logger**: On-Device Debugging mit umfassendem Logging-System

### Internationalization (i18n)
- **Unterstützte Sprachen**: Deutsch (de), English (en), Français (fr), Nederlands (nl), Italiano (it), Español (es)
- **Voice Guidance**: Browser-native SpeechSynthesis API mit Locale-Mapping (de-DE, en-US, fr-FR, es-ES, it-IT, nl-NL)
- **Smart Language Detection**: Automatische Spracherkennung basierend auf Browser-Einstellungen

### Test Sites
- **Zuhause/Gangelt (Primär)**: 51.002°N, 6.051°E - Deutsche Straßennamen-Navigation mit vollständiger lokaler Routing-Abdeckung
- **Kamperland/Roompot (Sekundär)**: 51.589°N, 3.721°E - Niederländische Testumgebung mit umfassenden POI-Daten

## Technical Stack

### Frontend Dependencies
```json
{
  "react": "^18.3.1",
  "@tanstack/react-query": "^5.60.5",
  "leaflet": "^1.9.4",
  "react-leaflet": "^4.2.1",
  "wouter": "^3.3.5",
  "@radix-ui/react-*": "1.x.x",
  "tailwindcss": "^3.4.17",
  "class-variance-authority": "^0.7.1",
  "lucide-react": "^0.453.0",
  "framer-motion": "^11.13.1"
}
```

### Backend Dependencies
```json
{
  "express": "^4.21.2",
  "drizzle-orm": "^0.39.1",
  "graphology": "^0.25.4",
  "graphology-shortest-path": "^2.1.0",
  "@turf/turf": "^7.2.0",
  "passport": "^0.7.0",
  "passport-local": "^1.0.0",
  "sharp": "^0.34.2",
  "ws": "^8.18.0"
}
```

### Development Tools
```json
{
  "typescript": "5.6.3",
  "vite": "^5.4.14",
  "@vitejs/plugin-react": "^4.3.2",
  "drizzle-kit": "^0.30.4",
  "esbuild": "^0.25.0"
}
```

## External Dependencies
- **Google Directions API**: Für professionelle Routing-Qualität als Fallback (backup routing)
- **OpenWeather API**: Für aktuelle Wetterbedingungen und Vorhersagen
- **Mapbox API**: Für Client-side und Server-side Karten-Rendering und Tiles
- **PostgreSQL**: Datenbank-System (optional, läuft auch ohne)
- **OpenStreetMap**: Quelle für POI-Daten und Karten-Tiles, sowie deutsche Straßennamen

## Current Implementation Status

### ✅ Fully Implemented
- **2-Stufen Direct Routing**: Modern OSM Engine mit Google Directions Fallback
- **Deutsche Straßennamen-Navigation**: Lokale Straßennamen-Extraktion aus GeoJSON (`name:de` → `name`)
- **POI Management**: Automatische Transformation von GeoJSON zu POI-Objekten mit Kategorisierung
- **Mobile Optimization**: Touch-Gesten, Memory-Monitoring, Crash-Detection
- **Internationalization**: 6 Sprachen mit Voice-Guidance Support
- **Weather Integration**: OpenWeatherMap API mit Smart Caching
- **Comprehensive Testing**: Umfassende Test-Suites für Routing und Network-Analysis

### 🚫 Removed/Disabled Features
- **4-Stufen Graceful Degradation**: Vereinfacht zu 2-Stufen System
- **CampgroundRoutingWrapper**: Disabled - nicht verfügbar
- **Campground Direct Routing**: Entfernt zugunsten der Modern OSM Engine
- **Bird Route Fallback**: Nicht mehr implementiert

### 🎯 Current Focus Areas
- **Deutsche Navigation**: Perfekte Integration lokaler Straßennamen in Turn-by-Turn Anweisungen
- **Performance Optimization**: Effiziente Memory-Nutzung und schnelle Routing-Berechnungen
- **Mobile Experience**: Optimierte Touch-Interaktionen und Crash-Prevention
- **Testing & Debugging**: Umfassende Debug-Tools und Network-Visualization

## Development Workflow

### Local Development
```bash
npm run dev          # Development Server auf Port 5000
npm run check        # TypeScript Type Checking
npm run build        # Production Build
npm start           # Production Server
```

### Replit-specific Features
- **Secrets Management**: Environment Variables über Replit Secrets Panel
- **Auto-restart**: Automatischer Server-Neustart bei Code-Änderungen
- **Live Preview**: Direktes Testing über Replit Web Preview

### Environment Configuration
```bash
# Required API Keys
GOOGLE_DIRECTIONS_API_KEY=your_google_key
OPENWEATHER_API_KEY=your_openweather_key
MAPBOX_TOKEN=your_mapbox_token
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token

# Optional Database
DATABASE_URL=postgresql://user:pass@host:port/db
```

## Recent Changes Log

### 2025-09-15: Deutsche Straßennamen-Integration
- **Feature**: Vollständige Deutsche Turn-by-Turn Navigation implementiert
- **Technical**: GeoJSON Properties Extraktion (`name:de` → `name` → `addr:street:de` → `addr:street`)
- **Result**: Authentische deutsche Straßennamen in Navigation ("Auf Fasanenstraße geradeaus fahren")
- **Quality Check**: Verhindert Google Fallback für valide deutsche Anweisungen

### 2025-09-15: Routing System Modernization  
- **Change**: Von 4-Stufen zu 2-Stufen Direct Routing vereinfacht
- **Reason**: Bessere Performance und Wartbarkeit
- **Impact**: Schnellere Routing-Berechnungen, weniger Komplexität

### 2025-09-15: POI Data Optimization
- **Optimization**: Speicher-effiziente POI-Verarbeitung
- **Numbers**: Zuhause: 1.298 POIs total, Kamperland: 1.905 POIs total
- **Feature**: Kategorisierte POI-Filterung mit Enrichment-System

## Architecture Decisions

### Why 2-Stufen Routing?
- **Simplicity**: Reduzierte Komplexität gegenüber 4-Stufen System
- **Performance**: Direktere Routing-Berechnungen
- **Reliability**: Weniger Failure-Points, höhere Erfolgsrate
- **Maintenance**: Einfachere Debugging und Optimization

### Why Local GeoJSON Networks?
- **Accuracy**: Präzise Routing für campground-spezifische Wege
- **Offline Capability**: Funktioniert ohne Internet-Verbindung
- **German Street Names**: Authentische lokale Straßennamen-Integration
- **Performance**: Schnellere Berechnungen als externe APIs

### Why React + TypeScript?
- **Type Safety**: Verhindert Runtime-Errors durch strikte Typisierung
- **Developer Experience**: Moderne Development-Tools und Hot Reload
- **Component Reusability**: Modulare UI-Komponenten mit Shadcn/UI
- **Performance**: Optimierte Bundle-Größe und Tree-Shaking

## Monitoring & Debugging

### Available Debug Tools
- **Network Visualization**: `/api/route/network/visualization`
- **Routing Analysis**: `/api/routing/analysis`
- **Comprehensive Testing**: `/api/testing/comprehensive`
- **Performance Stats**: `/api/stats`
- **Health Checks**: `/api/health`

### Mobile Debugging
- **Memory Monitor**: Automatische Speicher-Überwachung
- **Mobile Logger**: Device-spezifisches Logging
- **Error Boundaries**: React Error Catching mit detailliertem Logging
- **Touch Debug**: Gesture-Tracking und Performance-Monitoring

## Security Considerations

### API Key Management
- **Environment Variables**: Sichere Speicherung in Replit Secrets
- **Client/Server Separation**: Mapbox Token sowohl client- als server-side verfügbar
- **Validation**: Input-Validation für alle API-Endpoints

### Data Protection
- **No Personal Data Storage**: Nur temporäre GPS-Koordinaten
- **Session Management**: Express Session mit Memory Store
- **CORS Protection**: Konfigurierbare Cross-Origin Policies