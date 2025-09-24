export interface WeatherResponse {
  main: {
    temp: number;
    humidity: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  wind: {
    speed: number;
  };
  name: string;
}

export class WeatherService {
  private apiKey: string;
  private baseUrl = 'https://api.openweathermap.org/data/2.5';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getCurrentWeather(lat: number, lon: number): Promise<WeatherResponse> {
    const url = `${this.baseUrl}/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`;
    
    console.log('🌡️ Making OpenWeatherMap request:', {
      url: url.replace(this.apiKey, 'API_KEY_HIDDEN'),
      coordinates: { lat, lon },
      hasApiKey: !!this.apiKey,
      keyLength: this.apiKey?.length || 0
    });
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenWeatherMap API Error:', {
        status: response.status,
        statusText: response.statusText,
        responseBody: errorText
      });
      throw new Error(`Weather API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('✅ OpenWeatherMap response received:', {
      temperature: data.main?.temp,
      location: data.name,
      condition: data.weather?.[0]?.main
    });
    
    return data;
  }

  async getForecast(lat: number, lon: number): Promise<any> {
    const url = `${this.baseUrl}/forecast?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Weather forecast API error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  async getWeatherAlerts(lat: number, lon: number): Promise<any> {
    // OneCall API 3.0 includes alerts - requires subscription but has free tier
    const url = `${this.baseUrl}/onecall?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric&exclude=minutely`;
    
    console.log('🚨 Fetching weather alerts from OpenWeatherMap OneCall API');
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn('⚠️ Weather alerts not available:', response.status);
      return { alerts: [] }; // Fallback if OneCall API not available
    }
    
    const data = await response.json();
    console.log('🚨 Weather alerts received:', data.alerts?.length || 0, 'alerts');
    
    return data;
  }

  async getAirQuality(lat: number, lon: number): Promise<any> {
    const url = `http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${this.apiKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn('⚠️ Air quality data not available');
      return null;
    }
    
    return response.json();
  }

  getWeatherIcon(iconCode: string): string {
    // Map OpenWeatherMap icons to FontAwesome icons
    const iconMap: Record<string, string> = {
      '01d': 'fas fa-sun',
      '01n': 'fas fa-moon',
      '02d': 'fas fa-cloud-sun',
      '02n': 'fas fa-cloud-moon',
      '03d': 'fas fa-cloud',
      '03n': 'fas fa-cloud',
      '04d': 'fas fa-clouds',
      '04n': 'fas fa-clouds',
      '09d': 'fas fa-cloud-rain',
      '09n': 'fas fa-cloud-rain',
      '10d': 'fas fa-cloud-sun-rain',
      '10n': 'fas fa-cloud-moon-rain',
      '11d': 'fas fa-bolt',
      '11n': 'fas fa-bolt',
      '13d': 'fas fa-snowflake',
      '13n': 'fas fa-snowflake',
      '50d': 'fas fa-smog',
      '50n': 'fas fa-smog',
    };
    
    return iconMap[iconCode] || 'fas fa-cloud';
  }
}
