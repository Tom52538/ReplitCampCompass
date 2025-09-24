
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { POILocalizationAnalyzer, LocalizationAnalysisReport, POILocalizationIssue } from '@/lib/poiLocalizationAnalyzer';
import { useLanguage } from '@/hooks/useLanguage';

export const POILocalizationTestPanel: React.FC = () => {
  const { currentLanguage } = useLanguage();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<LocalizationAnalysisReport | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<POILocalizationIssue | null>(null);

  const runFullAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      console.log('🔍 Starting full POI localization analysis...');
      const analysisReport = await POILocalizationAnalyzer.analyzeCompletePOILocalization(currentLanguage);
      setReport(analysisReport);
      console.log('📊 Analysis complete:', analysisReport);
    } catch (error) {
      console.error('❌ Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-600 text-white';
      case 'HIGH': return 'bg-red-400 text-white';
      case 'MEDIUM': return 'bg-yellow-500 text-black';
      case 'LOW': return 'bg-blue-400 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'MAPPING': return 'bg-purple-500 text-white';
      case 'LANGUAGE': return 'bg-green-500 text-white';
      case 'ENRICHMENT': return 'bg-blue-500 text-white';
      case 'URL': return 'bg-orange-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            🐛 POI Lokalisierung Debug Panel
            <Badge variant="outline">{currentLanguage.toUpperCase()}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={runFullAnalysis} 
            disabled={isAnalyzing}
            className="w-full"
          >
            {isAnalyzing ? 'Analysiere...' : 'Vollständige Analyse starten'}
          </Button>
        </CardContent>
      </Card>

      {report && (
        <>
          {/* Summary Report */}
          <Card>
            <CardHeader>
              <CardTitle>📊 Analyse-Ergebnis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{report.totalPOIs}</div>
                  <div className="text-sm text-gray-600">Gesamt POIs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{report.analyzedPOIs}</div>
                  <div className="text-sm text-gray-600">Analysiert</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{report.totalIssues}</div>
                  <div className="text-sm text-gray-600">Probleme</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{report.criticalPOIs.length}</div>
                  <div className="text-sm text-gray-600">Kritische POIs</div>
                </div>
              </div>

              {/* Issues by Severity */}
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Probleme nach Schweregrad:</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(report.issuesBySeverity).map(([severity, count]) => (
                    <Badge key={severity} className={getSeverityColor(severity)}>
                      {severity}: {count}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Issues by Category */}
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Probleme nach Kategorie:</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(report.issuesByCategory).map(([category, count]) => (
                    <Badge key={category} className={getCategoryColor(category)}>
                      {category}: {count}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <h4 className="font-semibold mb-2">🔧 Empfehlungen:</h4>
                <ul className="list-disc list-inside space-y-1">
                  {report.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm">{rec}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Critical POIs */}
          {report.criticalPOIs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">🚨 Kritische POIs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {report.criticalPOIs.map((poiName, index) => (
                    <Badge key={index} variant="destructive">
                      {poiName}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Issues */}
          <Card>
            <CardHeader>
              <CardTitle>🔍 Detaillierte Probleme</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {report.detailedIssues.map((issue, index) => (
                  <div 
                    key={index} 
                    className="border rounded p-3 cursor-pointer hover:bg-gray-50"
                    onClick={() => setSelectedIssue(issue)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{issue.poiName}</div>
                      <div className="flex gap-2">
                        <Badge className={getSeverityColor(issue.severity)} variant="secondary">
                          {issue.severity}
                        </Badge>
                        <Badge className={getCategoryColor(issue.category)} variant="secondary">
                          {issue.category}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 mb-1">{issue.description}</div>
                    <div className="text-xs">
                      <span className="text-green-600">Erwartet: {issue.expected}</span>
                      <br />
                      <span className="text-red-600">Aktuell: {issue.actual}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Selected Issue Details */}
      {selectedIssue && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              🔧 Problem Details: {selectedIssue.poiName}
              <Button variant="outline" size="sm" onClick={() => setSelectedIssue(null)}>
                Schließen
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <strong>POI ID:</strong> {selectedIssue.poiId}
              </div>
              <div>
                <strong>Beschreibung:</strong> {selectedIssue.description}
              </div>
              <div>
                <strong>Erwartet:</strong> <span className="text-green-600">{selectedIssue.expected}</span>
              </div>
              <div>
                <strong>Aktuell:</strong> <span className="text-red-600">{selectedIssue.actual}</span>
              </div>
              <div className="bg-blue-50 p-3 rounded">
                <strong>💡 Lösung:</strong> {selectedIssue.fix}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
