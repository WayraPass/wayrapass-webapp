export interface WayriaChatRequest {
  message: string;
}

export interface WayriaProactiveMessage {
  id: number;
  tripId: number;
  incidentId: number | null;
  type: string;
  message: string;
  createdAt: string;
}

export interface WayriaRouteSummary {
  code: string;
  name: string;
  origin: string;
  destination: string;
  institution: string;
  campus: string | null;
}

export interface WayriaServiceStatus {
  studentName: string | null;
  routeCode: string | null;
  routeName: string | null;
  status: string | null;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  estimatedArrivalAt: string | null;
  delayMinutes: number | null;
  assignedStop: string | null;
  message: string;
}

export interface WayriaDelayedRoute { routeId: number; routeCode: string; routeName: string; evaluatedTrips: number; lateTrips: number; latePercentage: number; averageDelayMinutes: number; }
export interface WayriaAffectedSchedule { routeCode: string; dayOfWeek: string; departureTime: string; lateTrips: number; }
export interface WayriaPunctualitySummary {
  from: string; to: string; evaluatedTrips: number; onTimeTrips: number; lateTrips: number; onTimePercentage: number;
  mostDelayedRoutes: WayriaDelayedRoute[]; affectedSchedules: WayriaAffectedSchedule[];
}

export interface WayriaChatResponse {
  message: string;
  routes: WayriaRouteSummary[] | null;
  serviceStatus: WayriaServiceStatus | null;
  punctualitySummary?: WayriaPunctualitySummary | null;
}
