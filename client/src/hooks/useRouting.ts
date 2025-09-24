import { useMutation } from '@tanstack/react-query';
import { NavigationRoute } from '@/types/navigation';

interface RouteRequest {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  mode?: 'walking' | 'cycling' | 'driving';
  options?: {
    avoidSteps?: boolean;
    preferPaved?: boolean;
    alternativeCount?: number;
  };
}

async function getRouteService(request: RouteRequest): Promise<NavigationRoute> {
  console.log('🗺️ ROUTING REQUEST DEBUG:', {
    from: request.from,
    to: request.to,
    mode: request.mode,
    hasValidFrom: !!(request.from?.lat && request.from?.lng),
    hasValidTo: !!(request.to?.lat && request.to?.lng)
  });

  // Validate coordinates
  if (!request.from?.lat || !request.from?.lng || !request.to?.lat || !request.to?.lng) {
    console.error('❌ ROUTING: Invalid coordinates:', { from: request.from, to: request.to });
    throw new Error('Invalid coordinates provided');
  }

  // Ensure coordinates are numbers
  const fromLat = Number(request.from.lat);
  const fromLng = Number(request.from.lng);
  const toLat = Number(request.to.lat);
  const toLng = Number(request.to.lng);

  if (isNaN(fromLat) || isNaN(fromLng) || isNaN(toLat) || isNaN(toLng)) {
    console.error('❌ ROUTING: Non-numeric coordinates:', { from: request.from, to: request.to });
    throw new Error('Coordinates must be numeric');
  }

  const requestBody = {
    from: {
      lat: fromLat,
      lng: fromLng
    },
    to: {
      lat: toLat,
      lng: toLng
    },
    profile: request.mode || 'walking'
  };

  console.log('🗺️ SENDING ROUTING REQUEST:', requestBody);

  const response = await fetch('/api/route/enhanced', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('🗺️ ROUTING ERROR RESPONSE:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText
    });
    throw new Error(`Routing failed with status ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  console.log('🗺️ ROUTING RESPONSE:', data);

  if (!data.success) {
    throw new Error(data.error || 'Routing failed');
  }

  const route: NavigationRoute = {
    totalDistance: data.totalDistance || 0,
    estimatedTime: data.estimatedTime || '0 min',
    durationSeconds: data.durationSeconds || 0,
    instructions: data.instructions?.map((instruction: any) => ({
      instruction: instruction.instruction || instruction,
      distance: instruction.distance || '0m',
      duration: instruction.duration || '0s',
      type: instruction.maneuverType === 'arrive' ? 1 : 0
    })) || [],
    geometry: data.geometry || [],
    nextInstruction: null,
    arrivalTime: calculateArrivalTime(data.durationSeconds || 0)
  };

  return route;
}

export const useRouting = () => {
  const getRoute = useMutation<NavigationRoute, Error, RouteRequest>({
    mutationFn: async (request: RouteRequest) => {
      console.log('🗺️ OSM-ONLY ROUTING: No fallbacks, no bird routes');
      return await getRouteService(request);
    },
    retry: 1,
    retryDelay: 1000,
  });

  return {
    getRoute,
    isLoading: getRoute.isPending,
    error: getRoute.error,
    data: getRoute.data
  };
};

function calculateArrivalTime(durationSeconds: number): string {
  const now = new Date();
  const arrival = new Date(now.getTime() + durationSeconds * 1000);

  return arrival.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}