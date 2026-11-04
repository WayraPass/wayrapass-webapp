export type TripStatus = 'SCHEDULED' | 'BOARDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type LocationFreshness = 'RECENT' | 'STALE' | 'UNAVAILABLE';
export type EtaSource = 'PLANNED' | 'OPERATIONAL' | 'UNAVAILABLE';
export type DriverAuthorizationStatus = 'PENDING' | 'AUTHORIZED' | 'REJECTED';
export type DriverOperationalStatus = 'AVAILABLE' | 'UNAVAILABLE' | 'INACTIVE';
export type BoardingStatus = 'CONFIRMED' | 'CANCELLED';
export type IncidentType = 'TRAFFIC_DELAY' | 'DETOUR' | 'VEHICLE_FAILURE' | 'STOP_UNAVAILABLE' | 'OTHER';
export type IncidentPriority = 'NORMAL' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'OPEN' | 'RESOLVED';

export interface CurrentTripResponse {
  available: boolean;
  message: string | null;
  trip: CurrentTripDetails | null;
}

export interface CurrentTripDetails {
  tripId: number;
  routeId: number;
  routeCode: string;
  routeName: string;
  tripStatus: TripStatus;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  actualStartAt: string | null;
  actualEndAt: string | null;
  vehicle: TripVehicle | null;
  assignedStop: AssignedStop | null;
  boarding: CurrentBoarding;
  location: TripLocationStatus | null;
  stopArrival: ArrivalEstimate | null;
  universityArrival: UniversityArrivalEstimate | null;
  driver: DriverCredential | null;
}

export interface TripVehicle {
  vehicleId: number;
  plate: string;
  brand: string | null;
  model: string | null;
}

export interface AssignedStop {
  stopId: number;
  name: string;
  address: string | null;
  district: string | null;
}

export interface CurrentBoarding {
  confirmed: boolean;
  boardedAt: string | null;
  stopName: string | null;
}

export interface TripLocationStatus {
  available: boolean;
  stale: boolean;
  freshness: LocationFreshness;
  latitude: number | null;
  longitude: number | null;
  recordedAt: string | null;
  message: string | null;
}

export interface ArrivalEstimate {
  available: boolean;
  scheduledArrivalAt: string | null;
  estimatedArrivalAt: string | null;
  remainingMinutes: number | null;
  updatedAt: string | null;
  message: string | null;
}

export interface UniversityArrivalEstimate extends ArrivalEstimate {
  delayed: boolean;
  delayMinutes: number | null;
  source: EtaSource;
}

export interface DriverCredential {
  assigned: boolean;
  message: string | null;
  driverId: number | null;
  fullName: string | null;
  credentialImageUrl: string | null;
  credentialImageAvailable: boolean;
  licenseNumber: string | null;
  licenseCategory: string | null;
  licenseExpiration: string | null;
  licenseExpired: boolean;
  authorizationStatus: DriverAuthorizationStatus | null;
  operationalStatus: DriverOperationalStatus | null;
  authorized: boolean;
}

export interface BoardingRequest {
  tripId: number;
  stopId: number;
  vehicleQrToken: string;
}

export interface BoardingResponse {
  id: number;
  tripId: number;
  studentId: number;
  stopId: number;
  boardedAt: string;
}

export interface TripHistoryItem {
  tripId: number;
  routeId: number;
  routeCode: string;
  routeName: string;
  routeOrigin: string;
  routeDestination: string;
  institutionName: string;
  campusName: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  actualStartAt: string | null;
  actualEndAt: string | null;
  tripStatus: TripStatus;
  boardingStatus: BoardingStatus;
  boardedAt: string;
  stopId: number;
  stopName: string;
  delayed: boolean;
}

export interface UpcomingTrip {
  tripId: number;
  routeId: number;
  routeCode: string;
  routeName: string;
  routeOrigin: string;
  routeDestination: string;
  institutionName: string;
  campusName: string;
  stopId: number;
  stopName: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  status: TripStatus;
  resourcesReassigned: boolean;
  studentRouteOrStopModified: boolean;
  modificationMessage: string | null;
}

export interface TripIncident {
  id: number;
  type: IncidentType;
  description: string | null;
  delayMinutes: number;
  priority: IncidentPriority;
  status: IncidentStatus;
  createdAt: string;
}

export interface StudentTripHistoryDetail {
  trip: TripHistoryItem;
  driverId: number | null;
  driverName: string | null;
  vehicleId: number | null;
  vehiclePlate: string | null;
  vehicleBrand: string | null;
  vehicleModel: string | null;
  incidents: TripIncident[];
}
