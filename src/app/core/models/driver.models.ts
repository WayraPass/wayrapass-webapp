import { TripStatus } from './trip.models';

export type AuthorizationStatus = 'PENDING' | 'AUTHORIZED' | 'REJECTED';
export type DriverOperationalStatus = 'AVAILABLE' | 'UNAVAILABLE' | 'INACTIVE';

export interface DriverProfile {
  id: number;
  userId: number;
  fullName: string;
  email: string;
  phone: string | null;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiration: string | null;
  credentialImageUrl: string | null;
  authorizationStatus: AuthorizationStatus;
  operationalStatus: DriverOperationalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DriverVehicle {
  vehicleId: number;
  plate: string;
  brand: string | null;
  model: string | null;
  capacity: number;
}

export interface DriverRouteStop {
  stopId: number;
  stopOrder: number;
  name: string;
  address: string | null;
  district: string | null;
  estimatedMinutesFromStart: number;
  active: boolean;
}

export interface DriverTrip {
  id: number;
  tripId: number;
  routeId: number;
  driverId: number;
  vehicleId: number | null;
  scheduledStartAt: string;
  scheduledEndAt: string;
  estimatedArrivalAt: string | null;
  status: TripStatus;
  wasReassigned: boolean;
  routeCode: string;
  routeName: string;
  origin: string;
  destination: string;
  routeScheduleId: number | null;
  actualStartAt: string | null;
  actualEndAt: string | null;
  assignmentChanged: boolean;
  assignmentChangeMessage: string | null;
  vehicle: DriverVehicle | null;
  stops: DriverRouteStop[];
}

export interface DriverTripFilters {
  from?: string;
  to?: string;
}
