import { Injectable, signal } from '@angular/core';
import { Observable, delay, mergeMap, of, throwError, timer } from 'rxjs';
import {
  EntityStatus,
  RouteMockError,
  RouteRequest,
  Stop,
  StopRequest,
  TransportRoute,
} from '../models/route.models';

const MOCK_DELAY_MS = 350;
const ROUTES_KEY = 'wayrapass.mockRoutes';
const STOPS_KEY = 'wayrapass.mockStops';

const DEMO_STOPS: ReadonlyArray<Stop> = [
  { id: 'stop-aviacion', name: 'Av. Aviación cdra. 28', reference: 'Esquina con Av. San Luis', district: 'San Borja', status: 'ACTIVE' },
  { id: 'stop-jp-aviacion', name: 'Av. Javier Prado / Av. Aviación', reference: 'Paradero norte', district: 'San Borja', status: 'ACTIVE' },
  { id: 'stop-upc-si', name: 'UPC · Campus San Isidro', reference: 'Puerta principal', district: 'San Isidro', status: 'ACTIVE' },
  { id: 'stop-higuereta', name: 'Óvalo Higuereta', reference: 'Salida a Av. Benavides', district: 'Santiago de Surco', status: 'ACTIVE' },
  { id: 'stop-angamos', name: 'Av. Angamos / Av. Primavera', reference: 'Frente al paradero municipal', district: 'Surquillo', status: 'ACTIVE' },
  { id: 'stop-pucp', name: 'PUCP · Campus San Miguel', reference: 'Puerta principal', district: 'San Miguel', status: 'ACTIVE' },
  { id: 'stop-ceres', name: 'Paradero Ceres', reference: 'Carretera Central, puente peatonal', district: 'Ate', status: 'ACTIVE' },
  { id: 'stop-ayllon', name: 'Av. Nicolás Ayllón cdra. 45', reference: 'Lado derecho, sentido a Lima', district: 'Ate', status: 'ACTIVE' },
  {
    id: 'stop-jp-molina', name: 'Av. Javier Prado / Av. La Molina', reference: 'Paradero norte', district: 'La Molina',
    status: 'INACTIVE', inactiveReason: 'Obras en la vía', inactiveSince: Date.parse('2026-10-20T08:00:00-05:00'),
  },
  { id: 'stop-ulima', name: 'Universidad de Lima · Monterrico', reference: 'Puerta 1', district: 'Santiago de Surco', status: 'ACTIVE' },
];

const DEMO_ROUTES: ReadonlyArray<TransportRoute> = [
  {
    id: 'route-r12',
    code: 'R-12',
    name: 'San Borja – Campus San Isidro',
    origin: 'San Borja',
    destination: 'UPC · Campus San Isidro',
    status: 'ACTIVE',
    stops: [
      { stopId: 'stop-aviacion', estimatedTime: '06:30' },
      { stopId: 'stop-jp-aviacion', estimatedTime: '06:45' },
      { stopId: 'stop-upc-si', estimatedTime: '07:15' },
    ],
    schedules: [
      { departureTime: '06:30', days: [0, 1, 2, 3, 4] },
      { departureTime: '13:00', days: [0, 1, 2, 3, 4] },
    ],
    updatedAt: Date.parse('2026-10-22T10:00:00-05:00'),
  },
  {
    id: 'route-r08',
    code: 'R-08',
    name: 'Surco – San Miguel',
    origin: 'Santiago de Surco',
    destination: 'PUCP · Campus San Miguel',
    status: 'ACTIVE',
    stops: [
      { stopId: 'stop-higuereta', estimatedTime: '06:00' },
      { stopId: 'stop-angamos', estimatedTime: '06:20' },
      { stopId: 'stop-pucp', estimatedTime: '07:05' },
    ],
    schedules: [{ departureTime: '06:00', days: [0, 1, 2, 3, 4, 5] }],
    updatedAt: Date.parse('2026-10-18T09:30:00-05:00'),
  },
  {
    id: 'route-r03',
    code: 'R-03',
    name: 'La Molina – Monterrico',
    origin: 'La Molina',
    destination: 'Universidad de Lima · Monterrico',
    status: 'INACTIVE',
    stops: [
      { stopId: 'stop-jp-molina', estimatedTime: '07:00' },
      { stopId: 'stop-ulima', estimatedTime: '07:25' },
    ],
    schedules: [{ departureTime: '07:00', days: [0, 1, 2, 3, 4] }],
    updatedAt: Date.parse('2026-10-02T16:00:00-05:00'),
  },
];

// simulación sin backend
@Injectable({ providedIn: 'root' })
export class RouteService {
  private readonly _routes = signal<TransportRoute[]>(load(ROUTES_KEY, DEMO_ROUTES));
  private readonly _stops = signal<Stop[]>(load(STOPS_KEY, DEMO_STOPS));

  // Rutas 

  getRoutes(): Observable<TransportRoute[]> {
    return this.respond([...this._routes()].sort((a, b) => b.updatedAt - a.updatedAt));
  }

  getRoute(id: string): Observable<TransportRoute> {
    const route = this._routes().find((r) => r.id === id);
    return route ? this.respond(route) : this.fail(new RouteMockError('NOT_FOUND', 'La ruta no existe o fue eliminada.'));
  }

  createRoute(request: RouteRequest): Observable<TransportRoute> {
    const error = this.validateRoute(request, null);
    if (error) return this.fail(error);
    const route: TransportRoute = { ...clean(request), id: `route-${Date.now()}`, updatedAt: Date.now() };
    this.saveRoutes([...this._routes(), route]);
    return this.respond(route);
  }

  updateRoute(id: string, request: RouteRequest): Observable<TransportRoute> {
    const current = this._routes().find((r) => r.id === id);
    if (!current) return this.fail(new RouteMockError('NOT_FOUND', 'La ruta no existe o fue eliminada.'));
    const error = this.validateRoute(request, current);
    if (error) return this.fail(error);
    const updated: TransportRoute = { ...clean(request), id, updatedAt: Date.now() };
    this.saveRoutes(this._routes().map((r) => (r.id === id ? updated : r)));
    return this.respond(updated);
  }

  // Paraderos

  getStops(): Observable<Stop[]> {
    return this.respond([...this._stops()].sort((a, b) => a.name.localeCompare(b.name, 'es')));
  }

  createStop(request: StopRequest): Observable<Stop> {
    const stop: Stop = { ...trimStop(request), id: `stop-${Date.now()}`, status: 'ACTIVE' };
    this.saveStops([...this._stops(), stop]);
    return this.respond(stop);
  }

  updateStop(id: string, request: StopRequest): Observable<Stop> {
    const current = this._stops().find((s) => s.id === id);
    if (!current) return this.fail(new RouteMockError('NOT_FOUND', 'El paradero no existe.'));
    const updated: Stop = { ...current, ...trimStop(request) };
    this.saveStops(this._stops().map((s) => (s.id === id ? updated : s)));
    return this.respond(updated);
  }

  // Escenario alternativo
  setStopStatus(id: string, status: EntityStatus, reason = ''): Observable<Stop> {
    const current = this._stops().find((s) => s.id === id);
    if (!current) return this.fail(new RouteMockError('NOT_FOUND', 'El paradero no existe.'));
    const updated: Stop =
      status === 'INACTIVE'
        ? { ...current, status, inactiveReason: reason.trim() || undefined, inactiveSince: Date.now() }
        : { ...current, status, inactiveReason: undefined, inactiveSince: undefined };
    this.saveStops(this._stops().map((s) => (s.id === id ? updated : s)));
    return this.respond(updated);
  }

  routeCodesUsingStop(stopId: string): string[] {
    return this._routes()
      .filter((r) => r.stops.some((s) => s.stopId === stopId))
      .map((r) => r.code);
  }

  // Internos

  private validateRoute(request: RouteRequest, current: TransportRoute | null): RouteMockError | null {
    const code = request.code.trim().toUpperCase();
    if (this._routes().some((r) => r.code.toUpperCase() === code && r.id !== current?.id)) {
      return new RouteMockError('DUPLICATE_CODE', `Ya existe una ruta con el código ${code}.`);
    }
    const previous = new Set(current?.stops.map((s) => s.stopId) ?? []);
    const stops = new Map(this._stops().map((s) => [s.id, s]));
    for (const item of request.stops) {
      const stop = stops.get(item.stopId);
      if (!stop) return new RouteMockError('INVALID_STOP', 'Uno de los paraderos ya no existe.');

      if (stop.status === 'INACTIVE' && !previous.has(stop.id)) {
        return new RouteMockError('INVALID_STOP', `El paradero «${stop.name}» está inactivo y no se puede asignar.`);
      }
    }
    return null;
  }

  private saveRoutes(routes: TransportRoute[]): void {
    this._routes.set(routes);
    storage()?.setItem(ROUTES_KEY, JSON.stringify(routes));
  }

  private saveStops(stops: Stop[]): void {
    this._stops.set(stops);
    storage()?.setItem(STOPS_KEY, JSON.stringify(stops));
  }

  private respond<T>(value: T): Observable<T> {
    return of(structuredClone(value)).pipe(delay(MOCK_DELAY_MS));
  }

  private fail<T>(error: RouteMockError): Observable<T> {
    return timer(MOCK_DELAY_MS).pipe(mergeMap(() => throwError(() => error)));
  }
}

export function routeErrorMessage(error: unknown): string {
  return error instanceof RouteMockError ? error.message : 'No se pudo completar la operación. Inténtalo de nuevo.';
}

function clean(request: RouteRequest): RouteRequest {
  return {
    ...request,
    code: request.code.trim().toUpperCase(),
    name: request.name.trim(),
    schedules: request.schedules.map((s) => ({ ...s, days: [...s.days].sort() })),
  };
}

function trimStop(request: StopRequest): StopRequest {
  return { name: request.name.trim(), reference: request.reference.trim(), district: request.district };
}

function load<T>(key: string, fallback: ReadonlyArray<T>): T[] {
  try {
    const parsed = JSON.parse(storage()?.getItem(key) ?? 'null');
    if (Array.isArray(parsed) && parsed.length) return parsed as T[];
  } catch {
  }
  return structuredClone([...fallback]);
}

function storage(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage;
}