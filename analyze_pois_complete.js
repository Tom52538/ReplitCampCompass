
const fs = require('fs');
const path = require('path');

console.log('🔍 VOLLSTÄNDIGE POI ANALYSE - ZUHAUSE_POIS.GEOJSON');
console.log('='.repeat(70));

const geojsonPath = path.join(__dirname, 'server/data/zuhause_pois.geojson');

if (!fs.existsSync(geojsonPath)) {
  console.log('❌ GeoJSON file not found at:', geojsonPath);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf-8'));

console.log(`📊 Total POIs: ${data.features.length}`);
console.log('');

// ALLE PROPERTY-SCHLÜSSEL ANALYSIEREN
const allPropertyKeys = new Set();
const categoryStats = {};

data.features.forEach((feature, index) => {
  const props = feature.properties;
  
  // Sammle alle verfügbaren Property-Schlüssel
  Object.keys(props).forEach(key => allPropertyKeys.add(key));
  
  // Analysiere die wichtigsten Kategorisierungs-Properties
  ['amenity', 'leisure', 'tourism', 'shop', 'sport', 'building', 'place_of_worship', 'healthcare'].forEach(key => {
    if (props[key]) {
      const category = `${key}:${props[key]}`;
      categoryStats[category] = (categoryStats[category] || 0) + 1;
    }
  });
});

console.log('📋 ALLE VERFÜGBAREN PROPERTY-SCHLÜSSEL:');
console.log(Array.from(allPropertyKeys).sort().join(', '));
console.log('');

// TOP KATEGORIEN NACH HÄUFIGKEIT
console.log('🏆 TOP 20 KATEGORIEN NACH HÄUFIGKEIT:');
const sortedCategories = Object.entries(categoryStats)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 20);

sortedCategories.forEach(([category, count], index) => {
  console.log(`${index + 1}. ${category}: ${count} POIs`);
});

console.log('');

// DETAILIERTE ANALYSE NACH HAUPTKATEGORIEN
console.log('📊 DETAILIERTE KATEGORIENANALYSE:');
console.log('-'.repeat(50));

const mainCategories = {
  'amenity': {},
  'leisure': {},
  'tourism': {},
  'shop': {},
  'sport': {},
  'building': {},
  'healthcare': {}
};

data.features.forEach(feature => {
  const props = feature.properties;
  
  Object.keys(mainCategories).forEach(mainCat => {
    if (props[mainCat]) {
      const subCat = props[mainCat];
      mainCategories[mainCat][subCat] = (mainCategories[mainCat][subCat] || 0) + 1;
    }
  });
});

// Ausgabe der Hauptkategorien
Object.entries(mainCategories).forEach(([mainCat, subCats]) => {
  const totalCount = Object.values(subCats).reduce((sum, count) => sum + count, 0);
  if (totalCount > 0) {
    console.log(`\n🏷️ ${mainCat.toUpperCase()} (${totalCount} total):`);
    
    const sortedSubCats = Object.entries(subCats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
    
    sortedSubCats.forEach(([subCat, count]) => {
      console.log(`   ${subCat}: ${count}`);
    });
  }
});

// EMPFOHLENE 9 POI-BUTTON KATEGORIEN
console.log('\n');
console.log('🎯 EMPFOHLENE 9 POI-BUTTON KATEGORIEN:');
console.log('='.repeat(50));

// Berechne die Top 9 Kategorien basierend auf der Analyse
const topNineCategories = sortedCategories.slice(0, 9);

console.log('Basierend auf der Häufigkeitsanalyse:');
topNineCategories.forEach(([category, count], index) => {
  const [type, value] = category.split(':');
  let buttonCategory = '';
  let icon = '';
  let label = '';
  
  // Mapping zu sinnvollen Button-Kategorien
  switch (type) {
    case 'amenity':
      switch (value) {
        case 'parking':
          buttonCategory = 'parking';
          icon = '🅿️';
          label = 'Parkplätze';
          break;
        case 'restaurant':
        case 'cafe':
        case 'bar':
        case 'pub':
          buttonCategory = 'food-drink';
          icon = '🍽️';
          label = 'Gastronomie';
          break;
        case 'place_of_worship':
          buttonCategory = 'religious';
          icon = '⛪';
          label = 'Kirchen';
          break;
        case 'bank':
        case 'pharmacy':
        case 'post_office':
          buttonCategory = 'services';
          icon = '🏪';
          label = 'Dienstleistungen';
          break;
        case 'fuel':
          buttonCategory = 'fuel';
          icon = '⛽';
          label = 'Tankstellen';
          break;
        case 'school':
          buttonCategory = 'education';
          icon = '🏫';
          label = 'Bildung';
          break;
        case 'hospital':
        case 'clinic':
        case 'doctors':
          buttonCategory = 'healthcare';
          icon = '🏥';
          label = 'Gesundheit';
          break;
        case 'fire_station':
          buttonCategory = 'emergency';
          icon = '🚒';
          label = 'Notdienste';
          break;
        default:
          buttonCategory = 'amenity';
          icon = '🏢';
          label = 'Einrichtungen';
      }
      break;
    
    case 'leisure':
      switch (value) {
        case 'playground':
        case 'sports_centre':
        case 'swimming_pool':
        case 'pitch':
          buttonCategory = 'leisure';
          icon = '🎯';
          label = 'Freizeit & Sport';
          break;
        case 'park':
        case 'nature_reserve':
          buttonCategory = 'parks';
          icon = '🌳';
          label = 'Parks & Natur';
          break;
        default:
          buttonCategory = 'leisure';
          icon = '🎯';
          label = 'Freizeit';
      }
      break;
    
    case 'tourism':
      switch (value) {
        case 'hotel':
        case 'guest_house':
        case 'apartment':
        case 'chalet':
        case 'caravan_site':
          buttonCategory = 'accommodation';
          icon = '🏨';
          label = 'Unterkünfte';
          break;
        case 'information':
          buttonCategory = 'information';
          icon = 'ℹ️';
          label = 'Informationen';
          break;
        default:
          buttonCategory = 'tourism';
          icon = '🗺️';
          label = 'Tourismus';
      }
      break;
    
    case 'shop':
      buttonCategory = 'shopping';
      icon = '🛒';
      label = 'Geschäfte';
      break;
    
    default:
      buttonCategory = 'other';
      icon = '📍';
      label = 'Sonstiges';
  }
  
  console.log(`${index + 1}. ${buttonCategory} (${icon} ${label}) - ${count} POIs (${category})`);
});

console.log('\n');
console.log('✅ ANALYSE ABGESCHLOSSEN');
