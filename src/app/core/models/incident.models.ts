export type IncidentType = 'TRAFFIC_DELAY' | 'DETOUR' | 'VEHICLE_FAILURE' | 'STOP_UNAVAILABLE' | 'OTHER';
export type IncidentPriority = 'NORMAL' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'OPEN' | 'RESOLVED';

export interface CreateIncidentRequest {
  tripId: number;
  type: IncidentType;
  description: string;
  delayMinutes: number;
  priority: IncidentPriority;
}

export interface IncidentResponse {
  id: number;
  tripId: number;
  routeId: number;
  driverId: number;
  type: IncidentType;
  description: string | null;
  delayMinutes: number;
  priority: IncidentPriority;
  status: IncidentStatus;
  createdAt: string;
}
