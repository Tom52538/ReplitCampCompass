import { useState, useEffect } from 'react';
import { AlertTriangle, X, Thermometer, CloudRain, Wind, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WeatherData } from '@/types/navigation';
import { useLanguage } from '@/hooks/useLanguage';

interface CampingAlert {
  id: string;
  type: 'temperature' | 'weather' | 'wind' | 'uv';
  severity: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  icon: string;
  color: string;
}

interface CampingAlertsProps {
  weather: WeatherData;
  coordinates: { lat: number; lng: number };
}

const generateAlerts = (weather: WeatherData, t: (key: string) => string): CampingAlert[] => {
  const alerts: CampingAlert[] = [];

  // Temperature alerts
  if (weather.temperature < 0) {
    alerts.push({
      id: 'freezing',
      type: 'temperature',
      severity: 'high',
      title: t('weather.alerts.coldTitle'),
      message: 'Sub-zero temperatures. Check water lines and use 4-season gear.',
      icon: '🥶',
      color: 'bg-blue-500'
    });
  } else if (weather.temperature < 5) {
    alerts.push({
      id: 'cold',
      type: 'temperature',
      severity: 'medium',
      title: t('weather.alerts.coldTitle'),
      message: 'Cold conditions expected. Ensure adequate insulation.',
      icon: '🌡️',
      color: 'bg-blue-400'
    });
  } else if (weather.temperature > 35) {
    alerts.push({
      id: 'heat',
      type: 'temperature',
      severity: 'high',
      title: t('weather.alerts.heatTitle'),
      message: 'High temperatures. Stay hydrated and seek shade.',
      icon: '🔥',
      color: 'bg-red-500'
    });
  } else if (weather.temperature > 28) {
    alerts.push({
      id: 'warm',
      type: 'temperature',
      severity: 'low',
      title: t('weather.alerts.heatTitle'),
      message: 'Warm conditions. Plan activities for cooler hours.',
      icon: '☀️',
      color: 'bg-orange-400'
    });
  }

  // Weather condition alerts
  if (weather.condition.toLowerCase().includes('rain')) {
    alerts.push({
      id: 'rain',
      type: 'weather',
      severity: 'medium',
      title: t('weather.alerts.rainTitle'),
      message: 'Secure loose items and check tent rain fly.',
      icon: '🌧️',
      color: 'bg-blue-600'
    });
  }

  if (weather.condition.toLowerCase().includes('storm')) {
    alerts.push({
      id: 'storm',
      type: 'weather',
      severity: 'high',
      title: t('weather.alerts.rainTitle'),
      message: 'Severe weather approaching. Secure all equipment.',
      icon: '⛈️',
      color: 'bg-purple-600'
    });
  }

  // Wind alerts
  if (weather.windSpeed && weather.windSpeed > 30) {
    alerts.push({
      id: 'highwind',
      type: 'wind',
      severity: 'high',
      title: t('weather.alerts.windTitle'),
      message: 'Strong winds. Double-check tent stakes and guy lines.',
      icon: '💨',
      color: 'bg-gray-600'
    });
  } else if (weather.windSpeed && weather.windSpeed > 20) {
    alerts.push({
      id: 'wind',
      type: 'wind',
      severity: 'medium',
      title: t('weather.alerts.windTitle'),
      message: 'Moderate winds. Secure lightweight items.',
      icon: '🌬️',
      color: 'bg-gray-500'
    });
  }

  return alerts;
};

export const CampingAlerts = ({ weather, coordinates }: CampingAlertsProps) => {
  const [alerts, setAlerts] = useState<CampingAlert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const { t } = useLanguage();

  useEffect(() => {
    const newAlerts = generateAlerts(weather, t);
    setAlerts(newAlerts);
  }, [weather.temperature, weather.condition, weather.windSpeed]);

  const dismissAlert = (alertId: string) => {
    const prevArray = Array.from(dismissedAlerts);
    setDismissedAlerts(new Set([...prevArray, alertId]));
  };

  const activeAlerts = alerts.filter(alert => !dismissedAlerts.has(alert.id));

  if (activeAlerts.length === 0) return null;

  return (
    <div className="absolute top-16 left-20 right-4 z-40 space-y-2">
      {activeAlerts.map((alert) => (
        <div
          key={alert.id}
          className={`${alert.color} bg-opacity-90 backdrop-blur-md rounded-xl shadow-lg border border-white/20 p-3 text-white`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <div className="text-lg">{alert.icon}</div>
              <div className="flex-1">
                <div className="font-semibold text-sm mb-1">{alert.title}</div>
                <div className="text-xs opacity-90">{alert.message}</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-white/80 hover:text-white hover:bg-white/20"
              onClick={() => dismissAlert(alert.id)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};