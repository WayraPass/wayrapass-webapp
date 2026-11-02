import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiErrorResponse } from '../models/auth.models';
import {
  FamilyDriverCredential,
  FamilyTripHistoryDetail,
  FamilyUpcomingTrip,
  NotificationPreferences,
  NotificationPreferencesRequest,
} from '../models/family.models';
import { TripHistoryItem } from '../models/trip.models';

@Injectable({ providedIn: 'root' })
export class FamilyService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/family-links/me/students`;

  getLinkedStudentIds(): Observable<number[]> {
    return this.http.get<number[]>(this.baseUrl);
  }

  getUpcomingTrips(studentId: number): Observable<FamilyUpcomingTrip[]> {
    return this.http.get<FamilyUpcomingTrip[]>(`${this.baseUrl}/${studentId}/upcoming-trips`);
  }

  getCurrentDriverCredential(studentId: number): Observable<FamilyDriverCredential> {
    return this.http.get<FamilyDriverCredential>(`${this.baseUrl}/${studentId}/current-trip/driver`);
  }

  getNotificationPreferences(studentId: number): Observable<NotificationPreferences> {
    return this.http.get<NotificationPreferences>(`${this.baseUrl}/${studentId}/notification-preferences`);
  }

  updateNotificationPreferences(studentId: number, request: NotificationPreferencesRequest): Observable<NotificationPreferences> {
    return this.http.put<NotificationPreferences>(`${this.baseUrl}/${studentId}/notification-preferences`, request);
  }

  getHistory(studentId: number, from: string, to: string): Observable<TripHistoryItem[]> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<TripHistoryItem[]>(`${this.baseUrl}/${studentId}/trip-history`, { params });
  }

  getHistoryDetail(studentId: number, tripId: number): Observable<FamilyTripHistoryDetail> {
    return this.http.get<FamilyTripHistoryDetail>(`${this.baseUrl}/${studentId}/trip-history/${tripId}`);
  }
}

export function familyErrorMessage(error: unknown, fallback = 'No se pudo completar la consulta familiar.'): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'No se pudo conectar con WayraPass. Verifica que el backend esté disponible.';
    if (error.status === 401) return 'Tu sesión venció. Vuelve a iniciar sesión.';
    if (error.status === 403) return 'No tienes autorización para consultar a este estudiante.';
    if (error.status === 404) return apiMessage(error) ?? 'No se encontró la información solicitada.';
    return apiMessage(error) ?? `${fallback} (error ${error.status}).`;
  }
  return fallback;
}

function apiMessage(error: HttpErrorResponse): string | null {
  const response = error.error as ApiErrorResponse | string | null;
  if (response && typeof response === 'object' && response.message) return response.message;
  if (typeof response === 'string' && response.trim()) return response;
  return null;
}
