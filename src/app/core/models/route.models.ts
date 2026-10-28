export type EntityStatus = 'ACTIVE' | 'INACTIVE';
export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Stop {
  id: string;
  name: string;
  reference: string;
  district: string;
  status: EntityStatus;
  inactiveReason?: string;
  inactiveSince?: number;
}

export interface RouteStop {
  stopId: string;
  estimatedTime: string;
}

export interface RouteSchedule {
  departureTime: string;
  days: WeekDay[];
}

export interface TransportRoute {
  id: string;
  code: string;
  name: string;
  origin: string;
  destination: string;
  status: EntityStatus;
  stops: RouteStop[];
  schedules: RouteSchedule[];
  updatedAt: number;
}

export type RouteRequest = Omit<TransportRoute, 'id' | 'updatedAt'>;
export type StopRequest = Pick<Stop, 'name' | 'reference' | 'district'>;

export type RouteErrorCode = 'DUPLICATE_CODE' | 'NOT_FOUND' | 'INVALID_STOP';

export class RouteMockError extends Error {
  constructor(readonly code: RouteErrorCode, message: string) {
    super(message);
    this.name = 'RouteMockError';
  }
}

export const WEEK_DAYS: ReadonlyArray<{ value: WeekDay; short: string; label: string }> = [
  { value: 0, short: 'L', label: 'Lunes' },
  { value: 1, short: 'M', label: 'Martes' },
  { value: 2, short: 'M', label: 'Miércoles' },
  { value: 3, short: 'J', label: 'Jueves' },
  { value: 4, short: 'V', label: 'Viernes' },
  { value: 5, short: 'S', label: 'Sábado' },
  { value: 6, short: 'D', label: 'Domingo' },
];

export const DISTRICTS: ReadonlyArray<string> = [
  'Ate',
  'Callao',
  'La Molina',
  'Los Olivos',
  'San Borja',
  'San Isidro',
  'San Juan de Lurigancho',
  'San Miguel',
  'Santiago de Surco',
  'Surquillo',
];

export const INSTITUTIONS: ReadonlyArray<string> = [
  'UPC · Campus San Isidro',
  'UPC · Campus Monterrico',
  'PUCP · Campus San Miguel',
  'Universidad de Lima · Monterrico',
  'UNMSM · Ciudad Universitaria',
];