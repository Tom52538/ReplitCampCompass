
const fs = require('fs');

console.log('🎯 SMART POI ANALYSE - ZUHAUSE');
console.log('=' .repeat(50));

try {
  // Load the debug data (simulated - you can copy-paste your actual data)
  const debugData = {
    "categoryOverview": {
      "services": { "count": 586, "examples": ["ALDI Süd", "Netto Marken-Discount", "Volksbank"] },
      "leisure": { "count": 161, "examples": ["Sportplatz", "Mehrzweckplatz", "Spielplatz"] },
      "parking": { "count": 580, "examples": ["Parking", "Parkplatz"] },
      "gastronomie": { "count": 25, "examples": ["Restaurant", "Gasthof", "Café"] },
      "accommodation": { "count": 58, "examples": ["Hotel", "Pension"] },
      "other": { "count": 120, "examples": ["Sonstiges"] }
    },
    "totalPOIs": 1297
  };

  console.log(`📊 Gesamt: ${debugData.totalPOIs} POIs analysiert\n`);

  // Calculate percentages and create actionable recommendations
  const categories = Object.entries(debugData.categoryOverview)
    .map(([name, data]) => ({
      name,
      count: data.count,
      percentage: Math.round((data.count / debugData.totalPOIs) * 100),
      examples: data.examples,
      priority: data.count > 100 ? 'HIGH' : data.count > 50 ? 'MEDIUM' : 'LOW'
    }))
    .sort((a, b) => b.count - a.count);

  console.log('🏆 TOP KATEGORIEN (nach Häufigkeit):');
  console.log('-'.repeat(60));
  categories.forEach((cat, i) => {
    const priority = cat.priority === 'HIGH' ? '🔥' : cat.priority === 'MEDIUM' ? '⚡' : '💡';
    console.log(`${i+1}. ${priority} ${cat.name}: ${cat.count} POIs (${cat.percentage}%)`);
    console.log(`   Beispiele: ${cat.examples.join(', ')}`);
    console.log('');
  });

  // Generate the 8 recommended POI buttons for Zuhause
  console.log('🎯 EMPFOHLENE 8 POI-BUTTONS FÜR ZUHAUSE:');
  console.log('='.repeat(50));

  const buttonRecommendations = [
    { 
      category: 'parking', 
      icon: '🅿️', 
      label: 'Parken', 
      color: 'bg-blue-500',
      count: 580,
      reason: '45% aller POIs - absolut kritisch!'
    },
    { 
      category: 'services', 
      icon: '🛒', 
      label: 'Einkaufen & Services', 
      color: 'bg-green-500',
      count: 586,
      reason: '45% aller POIs - Supermärkte, Banken, etc.'
    },
    { 
      category: 'leisure', 
      icon: '⚽', 
      label: 'Sport & Freizeit', 
      color: 'bg-orange-500',
      count: 161,
      reason: '12% - Spielplätze, Sportplätze'
    },
    { 
      category: 'accommodation', 
      icon: '🏨', 
      label: 'Übernachten', 
      color: 'bg-purple-500',
      count: 58,
      reason: '4% - Hotels, Pensionen'
    },
    { 
      category: 'gastronomie', 
      icon: '🍽️', 
      label: 'Gastronomie', 
      color: 'bg-red-500',
      count: 25,
      reason: '2% - Restaurants, Cafés'
    },
    { 
      category: 'kultur', 
      icon: '⛪', 
      label: 'Kultur & Sehenswürdigkeiten', 
      color: 'bg-amber-600',
      count: 30,
      reason: 'Geschätzt - Kirchen, Museen'
    },
    { 
      category: 'gesundheit', 
      icon: '🏥', 
      label: 'Gesundheit', 
      color: 'bg-teal-500',
      count: 20,
      reason: 'Geschätzt - Ärzte, Apotheken'
    },
    { 
      category: 'verkehr', 
      icon: '🚌', 
      label: 'Öffentlicher Verkehr', 
      color: 'bg-indigo-500',
      count: 15,
      reason: 'Geschätzt - Bushaltestellen, Bahnhöfe'
    }
  ];

  console.log('📝 FINALER CODE FÜR LIGHTWEIGHTPOIBUTTONS.TSX:');
  console.log('```typescript');
  console.log('const ZUHAUSE_POI_BUTTONS = [');
  buttonRecommendations.forEach((btn, i) => {
    const comma = i < buttonRecommendations.length - 1 ? ',' : '';
    console.log(`  { category: '${btn.category}', icon: '${btn.icon}', label: '${btn.label}', color: '${btn.color}' }${comma} // ${btn.count} POIs - ${btn.reason}`);
  });
  console.log('];');
  console.log('```');

  console.log('\n🎯 NÄCHSTE SCHRITTE:');
  console.log('1. Kopiere den ZUHAUSE_POI_BUTTONS Code oben');
  console.log('2. Ersetze die bestehenden Buttons in LightweightPOIButtons.tsx');
  console.log('3. Teste die Filter-Funktionalität');
  console.log('4. Prüfe ob alle Kategorien korrekt zugeordnet werden');

  console.log('\n✅ ANALYSE KOMPLETT - BEREIT FÜR IMPLEMENTATION!');

} catch (error) {
  console.error('❌ Fehler bei der Analyse:', error.message);
}
