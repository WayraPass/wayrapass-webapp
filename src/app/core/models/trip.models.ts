export type TripStatus = 'SCHEDULED' | 'BOARDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type LocationFreshness = 'RECENT' | 'STALE' | 'UNAVAILABLE';
export type EtaSource = 'PLANNED' | 'OPERATIONAL' | 'UNAVAILABLE';
export type DriverAuthorizationStatus = 'PENDING' | 'AUTHORIZED' | 'REJECTED';
export type DriverOperationalStatus = 'AVAILABLE' | 'UNAVAILABLE' | 'INACTIVE';

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
