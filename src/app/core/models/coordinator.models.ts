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
