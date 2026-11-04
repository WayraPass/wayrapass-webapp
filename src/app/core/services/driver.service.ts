import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiErrorResponse } from '../models/auth.models';
import { DriverProfile, DriverTrip, DriverTripFilters } from '../models/driver.models';

@Injectable({ providedIn: 'root' })
export class DriverService {
  private readonly http = inject(HttpClient);

  getProfile(): Observable<DriverProfile> {
    return this.http.get<DriverProfile>(`${environment.apiUrl}/drivers/me`);
  }

  getTrips(filters: DriverTripFilters = {}): Observable<DriverTrip[]> {
    let params = new HttpParams();
    if (filters.from) params = params.set('from', filters.from);
    if (filters.to) params = params.set('to', filters.to);
    return this.http.get<DriverTrip[]>(`${environment.apiUrl}/trips/me`, { params });
  }
}

export function driverErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'No se pudo conectar con WayraPass. Verifica que el backend esté disponible.';
    if (error.status === 401) return 'Tu sesión venció. Vuelve a iniciar sesión.';
    if (error.status === 403) return 'Tu cuenta no tiene autorización para consultar estos viajes.';
    return apiMessage(error) ?? `No se pudieron consultar tus viajes (error ${error.status}).`;
  }
  return 'No se pudieron consultar tus viajes. Inténtalo nuevamente.';
}

function apiMessage(error: HttpErrorResponse): string | null {
  const response = error.error as ApiErrorResponse | string | null;
  if (response && typeof response === 'object' && response.message) return response.message;
  if (typeof response === 'string' && response.trim()) return response;
  return null;
}
