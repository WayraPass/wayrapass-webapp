export type RouteStatus = 'ACTIVE' | 'INACTIVE';
export type AuthorizationStatus = 'PENDING' | 'AUTHORIZED' | 'REJECTED';
export type DriverOperationalStatus = 'AVAILABLE' | 'UNAVAILABLE' | 'INACTIVE';
export type VehicleOperationalStatus = 'AVAILABLE' | 'IN_SERVICE' | 'MAINTENANCE' | 'UNAVAILABLE' | 'INACTIVE';
export type ApiDayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface InstitutionAdmin { id: number; name: string; campusName: string | null; address: string | null; district: string | null; active: boolean; createdAt: string; }
export interface RouteAdmin { id: number; institutionId: number; code: string; name: string; origin: string; destination: string; description: string | null; capacity: number; status: RouteStatus; }
export interface RouteRequest { institutionId: number; code: string; name: string; origin: string; destination: string; description: string | null; capacity: number; status: RouteStatus; }
export interface StopAdmin { id: number; name: string; address: string | null; district: string | null; latitude: number | null; longitude: number | null; active: boolean; }
export interface StopRequest { name: string; address: string | null; district: string | null; latitude: number | null; longitude: number | null; active: boolean; }
export interface RouteStopAdmin { id: number; routeId: number; stopId: number; stopOrder: number; estimatedMinutesFromStart: number; active: boolean; }
export type RouteStopRequest = Omit<RouteStopAdmin, 'id'>;
export interface RouteScheduleAdmin { id: number; routeId: number; dayOfWeek: ApiDayOfWeek; departureTime: string; estimatedArrivalTime: string | null; active: boolean; }

export interface DriverAdmin { id: number; userId: number; fullName: string; email: string; phone: string | null; licenseNumber: string; licenseCategory: string; licenseExpiration: string | null; credentialImageUrl: string | null; authorizationStatus: AuthorizationStatus; operationalStatus: DriverOperationalStatus; createdAt: string; updatedAt: string; }
export interface DriverRequest { fullName: string; email: string; password?: string; phone: string | null; licenseNumber: string; licenseCategory: string; licenseExpiration: string | null; credentialImageUrl: string | null; authorizationStatus: AuthorizationStatus; operationalStatus: DriverOperationalStatus; }

export interface VehicleAdmin { id: number; plate: string; brand: string | null; model: string | null; capacity: number; qrToken: string; authorizationStatus: AuthorizationStatus; operationalStatus: VehicleOperationalStatus; }
export interface VehicleRequest { plate: string; brand: string | null; model: string | null; capacity: number; qrToken: string | null; authorizationStatus: AuthorizationStatus; operationalStatus: VehicleOperationalStatus; }

export type CoordinatorTripStatus = 'SCHEDULED' | 'BOARDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export interface CoordinatorTrip { id: number; routeId: number; driverId: number | null; vehicleId: number | null; scheduledStartAt: string; scheduledEndAt: string; estimatedArrivalAt: string | null; status: CoordinatorTripStatus; wasReassigned: boolean; }
export interface TripCreateRequest { routeId: number; routeScheduleId: number | null; driverId: null; vehicleId: null; scheduledStartAt: string; scheduledEndAt: string; }
export interface TripAssignmentRequest { driverId: number; vehicleId: number; }
export interface TripReassignmentRequest { driverId: number | null; vehicleId: number | null; }
export interface ReassignmentDriverOption { driverId: number; fullName: string; licenseNumber: string; licenseCategory: string; licenseExpiration: string | null; authorizationStatus: AuthorizationStatus; operationalStatus: DriverOperationalStatus; }
export interface ReassignmentVehicleOption { vehicleId: number; plate: string; brand: string | null; model: string | null; capacity: number; authorizationStatus: AuthorizationStatus; operationalStatus: VehicleOperationalStatus; }
export interface ReassignmentOptions { tripId: number; drivers: ReassignmentDriverOption[]; vehicles: ReassignmentVehicleOption[]; message: string | null; }
export interface WeeklyOperation { tripId: number; operationDate: string; scheduledStartAt: string; scheduledEndAt: string; status: CoordinatorTripStatus; routeId: number; routeCode: string; routeName: string; origin: string; destination: string; driver: ReassignmentDriverOption | null; vehicle: ReassignmentVehicleOption | null; modified: boolean; modificationMessage: string | null; }

export type ReportIndicator = 'ALL' | 'PUNCTUALITY' | 'OCCUPANCY' | 'INCIDENTS' | 'STOP_DEMAND';
export type ReportFormat = 'PDF' | 'XLSX';
export interface ReportPeriod { from: string; to: string; zoneId: string; }
export interface PunctualityReport { evaluatedTrips: number; onTimeTrips: number; lateTrips: number; onTimePercentage: number; }
export interface OccupancyReport { evaluatedTrips: number; confirmedBoardings: number; offeredCapacity: number; occupancyPercentage: number; }
export interface IncidentsReport { totalIncidents: number; }
export interface StopDemandReport { stopId: number; stopName: string; confirmedBoardings: number; }
export interface OperationalReport {
  period: ReportPeriod;
  indicator: ReportIndicator;
  generatedAt: string;
  hasData: boolean;
  message: string | null;
  punctuality: PunctualityReport | null;
  occupancy: OccupancyReport | null;
  incidents: IncidentsReport | null;
  stopDemand: StopDemandReport[] | null;
}
