import { HttpClient, HttpErrorResponse, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiErrorResponse } from '../models/auth.models';
import { CoordinatorTrip, DriverAdmin, DriverRequest, InstitutionAdmin, OperationalReport, ReassignmentOptions, ReportFormat, ReportIndicator, RouteAdmin, RouteRequest, RouteScheduleAdmin, RouteStopAdmin, RouteStopRequest, StopAdmin, StopRequest, TripAssignmentRequest, TripCreateRequest, TripReassignmentRequest, VehicleAdmin, VehicleRequest, WeeklyOperation } from '../models/coordinator.models';

@Injectable({ providedIn: 'root' })
export class CoordinatorService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  institutions(): Observable<InstitutionAdmin[]> { return this.http.get<InstitutionAdmin[]>(`${this.api}/institutions`); }
  routes(): Observable<RouteAdmin[]> { return this.http.get<RouteAdmin[]>(`${this.api}/routes`); }
  createRoute(request: RouteRequest): Observable<RouteAdmin> { return this.http.post<RouteAdmin>(`${this.api}/routes`, request); }
  updateRoute(id: number, request: RouteRequest): Observable<RouteAdmin> { return this.http.put<RouteAdmin>(`${this.api}/routes/${id}`, request); }
  stops(): Observable<StopAdmin[]> { return this.http.get<StopAdmin[]>(`${this.api}/stops`); }
  createStop(request: StopRequest): Observable<StopAdmin> { return this.http.post<StopAdmin>(`${this.api}/stops`, request); }
  updateStop(id: number, request: StopRequest): Observable<StopAdmin> { return this.http.put<StopAdmin>(`${this.api}/stops/${id}`, request); }
  routeStops(routeId: number): Observable<RouteStopAdmin[]> { return this.http.get<RouteStopAdmin[]>(`${this.api}/route-stops/route/${routeId}`); }
  createRouteStop(request: RouteStopRequest): Observable<RouteStopAdmin> { return this.http.post<RouteStopAdmin>(`${this.api}/route-stops`, request); }
  updateRouteStop(id: number, request: RouteStopRequest): Observable<RouteStopAdmin> { return this.http.put<RouteStopAdmin>(`${this.api}/route-stops/${id}`, request); }
  schedules(): Observable<RouteScheduleAdmin[]> { return this.http.get<RouteScheduleAdmin[]>(`${this.api}/route-schedules`); }

  drivers(): Observable<DriverAdmin[]> { return this.http.get<DriverAdmin[]>(`${this.api}/drivers`); }
  createDriver(request: DriverRequest): Observable<DriverAdmin> { return this.http.post<DriverAdmin>(`${this.api}/drivers`, request); }
  updateDriver(id: number, request: DriverRequest): Observable<DriverAdmin> { return this.http.put<DriverAdmin>(`${this.api}/drivers/${id}`, request); }

  vehicles(): Observable<VehicleAdmin[]> { return this.http.get<VehicleAdmin[]>(`${this.api}/vehicles`); }
  createVehicle(request: VehicleRequest): Observable<VehicleAdmin> { return this.http.post<VehicleAdmin>(`${this.api}/vehicles`, request); }
  updateVehicle(id: number, request: VehicleRequest): Observable<VehicleAdmin> { return this.http.put<VehicleAdmin>(`${this.api}/vehicles/${id}`, request); }

  trips(): Observable<CoordinatorTrip[]> { return this.http.get<CoordinatorTrip[]>(`${this.api}/trips`); }
  createTrip(request: TripCreateRequest): Observable<CoordinatorTrip> { return this.http.post<CoordinatorTrip>(`${this.api}/trips`, request); }
  assignTripResources(id: number, request: TripAssignmentRequest): Observable<CoordinatorTrip> { return this.http.put<CoordinatorTrip>(`${this.api}/trips/${id}/assignment`, request); }
  reassignmentOptions(id: number): Observable<ReassignmentOptions> { return this.http.get<ReassignmentOptions>(`${this.api}/trips/${id}/reassignment-options`); }
  reassignTripResources(id: number, request: TripReassignmentRequest): Observable<CoordinatorTrip> { return this.http.put<CoordinatorTrip>(`${this.api}/trips/${id}/reassignment`, request); }
  weeklyCalendar(from: string, to: string): Observable<WeeklyOperation[]> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<WeeklyOperation[]>(`${this.api}/trips/calendar`, { params });
  }

  operationalReport(from: string, to: string, indicator: ReportIndicator): Observable<OperationalReport> {
    const params = this.reportParams(from, to, indicator);
    return this.http.get<OperationalReport>(`${this.api}/reports/operations`, { params });
  }

  exportOperationalReport(from: string, to: string, indicator: ReportIndicator, format: ReportFormat): Observable<HttpResponse<Blob>> {
    const params = this.reportParams(from, to, indicator).set('format', format);
    return this.http.get(`${this.api}/reports/operations/export`, { params, responseType: 'blob', observe: 'response' });
  }

  private reportParams(from: string, to: string, indicator: ReportIndicator): HttpParams {
    return new HttpParams().set('from', from).set('to', to).set('indicator', indicator);
  }
}

export function coordinatorErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'No se pudo completar la operación. Inténtalo nuevamente.';
  if (error.status === 0) return 'No se pudo conectar con WayraPass. Verifica que el backend esté disponible.';
  if (error.status === 401) return 'Tu sesión venció. Vuelve a iniciar sesión.';
  if (error.status === 403) return 'Tu cuenta no tiene permiso para realizar esta operación.';
  const response = error.error as ApiErrorResponse | string | null;
  if (response && typeof response === 'object') {
    const fieldError = response.fieldErrors ? Object.values(response.fieldErrors)[0] : null;
    return fieldError ?? response.message ?? fallback(error.status);
  }
  if (typeof response === 'string' && response.trim()) return response;
  return fallback(error.status);
}

function fallback(status: number): string {
  if (status === 404) return 'El recurso solicitado ya no existe.';
  if (status === 409) return 'Ya existe un registro con esos datos.';
  if (status === 400) return 'Revisa los datos ingresados.';
  return `La operación no pudo completarse (error ${status}).`;
}
