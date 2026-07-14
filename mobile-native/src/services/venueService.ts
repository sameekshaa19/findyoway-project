import { FLASK_API_URL } from '../config';

export interface VenueInfo {
  id: string;
  name: string;
  city: string;
  address?: string;
  floors?: number;
  created_at?: string;
}

export interface FloorPlanData {
  id: string;
  venue_id: string;
  graph_json: {
    nodes: Record<string, { label: string; x?: number; y?: number; floor?: number; type?: string }>;
    edges: Array<{ from: string; to: string; distance?: number; weight?: number; label?: string }>;
  };
  version: number;
  is_published: boolean;
}

async function apiFetch<T>(url: string, errorMessage: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new Error('No internet connection. Check your network and try again.');
  }
  if (!response.ok) {
    if (response.status === 503) throw new Error('Server is unavailable. Try again later.');
    throw new Error(errorMessage);
  }
  return response.json();
}

export async function fetchVenues(): Promise<VenueInfo[]> {
  return apiFetch<VenueInfo[]>(`${FLASK_API_URL}/api/venues`, 'Failed to fetch venues');
}

export async function fetchFloorPlan(venueId: string): Promise<FloorPlanData> {
  return apiFetch<FloorPlanData>(
    `${FLASK_API_URL}/api/venues/${venueId}/floorplan`,
    'Failed to fetch floor plan',
  );
}
