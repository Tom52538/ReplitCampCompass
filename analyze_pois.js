import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  // Analyze both sites
  const kamperland = path.join(__dirname, 'server/data/combined_pois_roompot.geojson');
  const zuhause = path.join(__dirname, 'server/data/zuhause_pois.geojson');
  
  console.log('🔍 POI ANALYSIS REPORT - BOTH SITES');
  console.log('='.repeat(60));
  
  // Analyze Kamperland
  const geojsonPath = kamperland;

  if (!fs.existsSync(geojsonPath)) {
    console.log('❌ GeoJSON file not found at:', geojsonPath);
    console.log('📁 Available files in server/data/:');
    const dataDir = path.join(__dirname, 'server/data/');
    if (fs.existsSync(dataDir)) {
      fs.readdirSync(dataDir).forEach(file => console.log(`  - ${file}`));
    }
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf-8'));

  console.log('🔍 POI ANALYSIS REPORT');
  console.log('='.repeat(50));

  // Count total POIs
  const totalPOIs = data.features.length;
  console.log(`📊 Total POIs: ${totalPOIs}`);

  // Analyze categories
  const categoryStats = {};
  const roompotCategoryStats = {};
  const buildingTypeStats = {};

  data.features.forEach((feature) => {
    const props = feature.properties;

    // Category analysis
    if (props.category) {
      categoryStats[props.category] = (categoryStats[props.category] || 0) + 1;
    }

    // Roompot category analysis
    if (props.roompot_category) {
      roompotCategoryStats[props.roompot_category] = (roompotCategoryStats[props.roompot_category] || 0) + 1;
    }

    // Building type analysis
    if (props.building_type) {
      buildingTypeStats[props.building_type] = (buildingTypeStats[props.building_type] || 0) + 1;
    }
  });

  console.log('\n📂 CATEGORIES:');
  Object.entries(categoryStats)
    .sort(([,a], [,b]) => b - a)
    .forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count} POIs`);
    });

  console.log('\n🏢 ROOMPOT CATEGORIES:');
  Object.entries(roompotCategoryStats)
    .sort(([,a], [,b]) => b - a)
    .forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count} POIs`);
    });

  console.log('\n🏗️ BUILDING TYPES:');
  Object.entries(buildingTypeStats)
    .sort(([,a], [,b]) => b - a)
    .forEach(([type, count]) => {
      console.log(`  ${type}: ${count} POIs`);
    });

  // Accommodation analysis
  console.log('\n🏠 ACCOMMODATION BREAKDOWN:');
  const accommodationTypes = data.features.filter(f => {
    const props = f.properties;
    const buildingType = String(props.building_type || '').toLowerCase();
    const roompotCat = String(props.roompot_category || '').toLowerCase();
    const name = String(props.name || '').toLowerCase();

    return buildingType.includes('bungalow') || 
           buildingType.includes('beach house') ||
           roompotCat.includes('bungalow') ||
           roompotCat.includes('beach house') ||
           name.includes('beach house') ||
           name.includes('bungalow');
  });

  console.log(`Total accommodation POIs: ${accommodationTypes.length}`);

  console.log('\n✅ Analysis complete!');

} catch (error) {
  console.error('❌ Error analyzing POIs:', error.message);
}