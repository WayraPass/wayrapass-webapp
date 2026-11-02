import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiErrorResponse } from '../models/auth.models';
import { CurrentTripResponse } from '../models/trip.models';

@Injectable({ providedIn: 'root' })
export class TripService {
  private readonly http = inject(HttpClient);

  getCurrentTrip(): Observable<CurrentTripResponse> {
    return this.http.get<CurrentTripResponse>(`${environment.apiUrl}/trips/me/current`);
  }
}

export function tripErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'No se pudo conectar con WayraPass. Verifica que el backend esté disponible.';
    if (error.status === 401) return 'Tu sesión venció. Vuelve a iniciar sesión para consultar el viaje.';
    if (error.status === 403) return 'Tu cuenta no tiene permiso para consultar este viaje.';
    const response = error.error as ApiErrorResponse | string | null;
    if (response && typeof response === 'object' && response.message) return response.message;
    if (typeof response === 'string' && response.trim()) return response;
  }
  return 'No pudimos actualizar el viaje. Inténtalo nuevamente.';
}
