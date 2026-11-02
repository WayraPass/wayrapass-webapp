import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiErrorResponse } from '../models/auth.models';
import {
  CurrentTripResponse,
  StudentTripHistoryDetail,
  TripHistoryItem,
} from '../models/trip.models';

@Injectable({ providedIn: 'root' })
export class TripService {
  private readonly http = inject(HttpClient);

  getCurrentTrip(): Observable<CurrentTripResponse> {
    return this.http.get<CurrentTripResponse>(`${environment.apiUrl}/trips/me/current`);
  }

  getHistory(from: string, to: string): Observable<TripHistoryItem[]> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<TripHistoryItem[]>(`${environment.apiUrl}/trips/me/history`, { params });
  }

  getHistoryDetail(tripId: number): Observable<StudentTripHistoryDetail> {
    return this.http.get<StudentTripHistoryDetail>(`${environment.apiUrl}/trips/me/history/${tripId}`);
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

export function historyErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'No se pudo conectar con WayraPass. Verifica que el backend esté disponible.';
    if (error.status === 401) return 'Tu sesión venció. Vuelve a iniciar sesión para consultar el historial.';
    if (error.status === 403) return 'No tienes permiso para consultar este viaje.';
    if (error.status === 404) return apiMessage(error) ?? 'El viaje solicitado no existe.';
    return apiMessage(error) ?? `No se pudo consultar el historial (error ${error.status}).`;
  }
  return 'No se pudo consultar el historial. Inténtalo nuevamente.';
}

function apiMessage(error: HttpErrorResponse): string | null {
  const response = error.error as ApiErrorResponse | string | null;
  if (response && typeof response === 'object' && response.message) return response.message;
  if (typeof response === 'string' && response.trim()) return response;
  return null;
}
