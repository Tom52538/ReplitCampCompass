
const fs = require('fs');
const path = require('path');

console.log('🔍 ZUHAUSE POI ANALYSE - 9 HÄUFIGSTE KATEGORIEN');
console.log('='.repeat(60));

try {
  const geojsonPath = path.join(__dirname, 'server/data/zuhause_pois.geojson');
  
  if (!fs.existsSync(geojsonPath)) {
    console.error('❌ GeoJSON file not found at:', geojsonPath);
    console.log('📁 Available files in server/data/:');
    const dataDir = path.join(__dirname, 'server/data/');
    if (fs.existsSync(dataDir)) {
      fs.readdirSync(dataDir).forEach(file => console.log(`  - ${file}`));
    }
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf-8'));
  
  console.log(`📊 Total Features: ${data.features.length}`);
  
  // Kategorien-Zählung
  const categoryStats = {};
  let validPOIs = 0;
  
  data.features.forEach((feature) => {
    const props = feature.properties || {};
    
    // Skip features without names
    if (!props.name) return;
    
    validPOIs++;
    
    // Hauptkategorien extrahieren
    ['amenity', 'leisure', 'tourism', 'shop', 'healthcare', 'sport', 'building'].forEach(key => {
      if (props[key]) {
        const category = `${key}:${props[key]}`;
        categoryStats[category] = (categoryStats[category] || 0) + 1;
      }
    });
  });
  
  console.log(`📈 Valid POIs with names: ${validPOIs}`);
  
  // Top 9 Kategorien
  const top9Categories = Object.entries(categoryStats)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 9);
  
  console.log('\n🏆 TOP 9 KATEGORIEN:');
  top9Categories.forEach(([category, count], index) => {
    console.log(`${index + 1}. ${category}: ${count} POIs`);
  });
  
  // Button-Mapping für die 9 häufigsten Kategorien
  console.log('\n🎯 EMPFOHLENE 9 POI-BUTTONS FÜR ZUHAUSE:');
  
  const buttonMapping = [];
  
  top9Categories.forEach(([category, count], index) => {
    const [type, value] = category.split(':');
    let icon, label, color;
    
    switch (type) {
      case 'amenity':
        switch (value) {
          case 'parking':
            icon = '🅿️'; label = 'Parkplätze'; color = 'bg-gray-500';
            break;
          case 'place_of_worship':
            icon = '⛪'; label = 'Kirchen'; color = 'bg-purple-600';
            break;
          case 'restaurant':
          case 'cafe':
            icon = '🍽️'; label = 'Gastronomie'; color = 'bg-orange-500';
            break;
          case 'fire_station':
            icon = '🚒'; label = 'Feuerwehr'; color = 'bg-red-500';
            break;
          case 'bank':
            icon = '🏦'; label = 'Banken'; color = 'bg-blue-600';
            break;
          case 'school':
            icon = '🏫'; label = 'Schulen'; color = 'bg-green-600';
            break;
          default:
            icon = '🏢'; label = 'Einrichtungen'; color = 'bg-gray-600';
        }
        break;
      
      case 'leisure':
        switch (value) {
          case 'nature_reserve':
            icon = '🌳'; label = 'Naturschutz'; color = 'bg-green-500';
            break;
          case 'playground':
            icon = '🎪'; label = 'Spielplätze'; color = 'bg-yellow-500';
            break;
          case 'pitch':
            icon = '⚽'; label = 'Sportplätze'; color = 'bg-green-700';
            break;
          case 'sports_centre':
            icon = '🏃'; label = 'Sportzentren'; color = 'bg-blue-700';
            break;
          default:
            icon = '🎯'; label = 'Freizeit'; color = 'bg-green-500';
        }
        break;
      
      case 'tourism':
        switch (value) {
          case 'apartment':
          case 'guest_house':
          case 'chalet':
            icon = '🏠'; label = 'Unterkünfte'; color = 'bg-blue-500';
            break;
          case 'caravan_site':
            icon = '🚐'; label = 'Wohnmobilplätze'; color = 'bg-orange-600';
            break;
          default:
            icon = '🗺️'; label = 'Tourismus'; color = 'bg-indigo-500';
        }
        break;
      
      case 'shop':
        switch (value) {
          case 'supermarket':
            icon = '🛒'; label = 'Supermärkte'; color = 'bg-purple-500';
            break;
          default:
            icon = '🛍️'; label = 'Geschäfte'; color = 'bg-purple-500';
        }
        break;
      
      case 'healthcare':
        icon = '🏥'; label = 'Gesundheit'; color = 'bg-red-600';
        break;
      
      case 'sport':
        icon = '🏆'; label = 'Sport'; color = 'bg-yellow-600';
        break;
      
      default:
        icon = '📍'; label = 'Sonstiges'; color = 'bg-gray-500';
    }
    
    buttonMapping.push({
      id: type === 'amenity' && value === 'parking' ? 'parking' : 
          type === 'leisure' && value === 'nature_reserve' ? 'nature' :
          type === 'amenity' && value === 'place_of_worship' ? 'religious' :
          type === 'leisure' && value === 'playground' ? 'playground' :
          type === 'leisure' && value === 'pitch' ? 'sports' :
          type === 'shop' ? 'shopping' :
          type === 'tourism' ? 'accommodation' :
          type === 'healthcare' ? 'healthcare' :
          'other',
      icon,
      label,
      color,
      category: type,
      value,
      count
    });
    
    console.log(`${index + 1}. ${icon} ${label} (${count} POIs)`);
  });
  
  console.log('\n📝 CODE FÜR ZUHAUSE_POI_BUTTONS:');
  console.log(`const ZUHAUSE_POI_BUTTONS = [`);
  buttonMapping.forEach((btn, index) => {
    const comma = index < buttonMapping.length - 1 ? ',' : '';
    console.log(`  { id: '${btn.id}', icon: '${btn.icon}', label: '${btn.label}', color: '${btn.color}' }${comma}`);
  });
  console.log(`];`);
  
  console.log('\n✅ ANALYSE ABGESCHLOSSEN');
  console.log(`📊 Analysiert: ${validPOIs} POIs mit Namen aus ${data.features.length} Features`);
  
} catch (error) {
  console.error('❌ Fehler:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
