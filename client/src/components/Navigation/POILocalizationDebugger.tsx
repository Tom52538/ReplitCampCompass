
import React from 'react';
import { LocalizationDebugger } from '@/lib/localizationDebugger';
import { useLanguage } from '@/hooks/useLanguage';

interface POILocalizationDebuggerProps {
  poi: any;
  enrichmentData?: any;
  isVisible?: boolean;
}

export const POILocalizationDebugger: React.FC<POILocalizationDebuggerProps> = ({
  poi,
  enrichmentData,
  isVisible = false
}) => {
  const { currentLanguage } = useLanguage();
  const [isExpanded, setIsExpanded] = React.useState(false);

  React.useEffect(() => {
    if (poi && enrichmentData) {
      // Analyze enrichment data when component mounts
      LocalizationDebugger.analyzeEnrichmentData(poi, enrichmentData, currentLanguage);
    }
  }, [poi, enrichmentData, currentLanguage]);

  const debugReport = React.useMemo(() => {
    return LocalizationDebugger.getIssueReport();
  }, [poi, enrichmentData, currentLanguage]);

  if (!poi) return null;

  const detectLanguage = (text: string): string => {
    if (!text) return 'none';
    
    const germanWords = ['komfortabel', 'perfekt', 'familien', 'moderne', 'unterkunft'];
    const englishWords = ['comfortable', 'perfect', 'families', 'modern', 'accommodation'];
    
    const lowerText = text.toLowerCase();
    const hasGerman = germanWords.some(word => lowerText.includes(word));
    const hasEnglish = englishWords.some(word => lowerText.includes(word));
    
    if (hasGerman && hasEnglish) return 'mixed';
    if (hasGerman) return 'de';
    if (hasEnglish) return 'en';
    return 'unknown';
  };

  const hasMultiLanguageData = (enrichmentData: any): boolean => {
    return ['name', 'description', 'features', 'price_info'].some(field => 
      enrichmentData[field] && typeof enrichmentData[field] === 'object' && 
      !Array.isArray(enrichmentData[field])
    );
  };

  // Always show the toggle button, but only show content when expanded
  return (
    <>
      {/* Debug Toggle Button - always visible in bottom left */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="fixed bottom-4 left-4 z-50 bg-red-600 hover:bg-red-700 text-white rounded-full w-12 h-12 shadow-lg flex items-center justify-center transition-all duration-200"
        title="Toggle Debug Info"
      >
        🐛
      </button>

      {/* Debug Panel - only visible when expanded */}
      {isExpanded && (
        <div className="fixed bottom-20 left-4 z-40 bg-red-50 border border-red-200 rounded-lg p-4 max-w-sm shadow-lg max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-red-800 font-semibold">🐛 Debug Info</h4>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-red-600 hover:text-red-800 text-lg leading-none"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-2 text-sm">
            <div>
              <strong>POI:</strong> {poi.name} ({poi.id})
            </div>
            <div>
              <strong>Category:</strong> {poi.category} | <strong>Roompot Category:</strong> {poi.roompot_category}
            </div>
            <div>
              <strong>User Language:</strong> {currentLanguage}
            </div>
            
            {enrichmentData && (
              <>
                <div>
                  <strong>Enrichment ID:</strong> {enrichmentData.accommodation_id}
                </div>
                <div>
                  <strong>Description Language:</strong> {detectLanguage(enrichmentData.description || '')}
                </div>
                <div>
                  <strong>Has Multi-lang Data:</strong> {hasMultiLanguageData(enrichmentData) ? 'Yes' : 'No'}
                </div>
              </>
            )}
            
            <div className="bg-red-100 p-2 rounded">
              <strong>Debug Summary:</strong>
              <div>Total Issues: {debugReport.summary.totalIssues}</div>
              <div>Language Mismatches: {debugReport.summary.languageMismatchCount}</div>
            </div>

            {debugReport.details.length > 0 && (
              <details className="bg-red-100 p-2 rounded">
                <summary className="cursor-pointer font-medium">Show Issues ({debugReport.details.length})</summary>
                <div className="mt-2 space-y-1">
                  {debugReport.details.slice(-5).map((log, index) => (
                    <div key={index} className="text-xs bg-white p-1 rounded">
                      <div><strong>{log.component}:</strong> {log.poiName}</div>
                      <div className="text-red-600">{log.issues.join(', ')}</div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>
      )}
    </>
  );
};
