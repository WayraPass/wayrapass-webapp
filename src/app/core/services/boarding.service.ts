import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiErrorResponse } from '../models/auth.models';
import { BoardingRequest, BoardingResponse } from '../models/trip.models';

@Injectable({ providedIn: 'root' })
export class BoardingService {
  private readonly http = inject(HttpClient);

  confirm(request: BoardingRequest): Observable<BoardingResponse> {
    return this.http.post<BoardingResponse>(`${environment.apiUrl}/boardings`, request);
  }
}

export function boardingErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'No se pudo conectar con WayraPass. Verifica que el backend esté disponible.';
    if (error.status === 401) return 'Tu sesión venció. Vuelve a iniciar sesión para confirmar el abordaje.';
    if (error.status === 403) return 'Tu cuenta no tiene permiso para confirmar este abordaje.';
    if (error.status === 404) return apiMessage(error) ?? 'El viaje o paradero ya no está disponible.';
    if (error.status === 409) return 'Tu abordaje ya fue registrado.';
    if (error.status === 400) {
      const message = apiMessage(error);
      if (message?.toLocaleLowerCase('es').includes('qr')) {
        return 'El código del vehículo no corresponde a este viaje.';
      }
      return message ?? 'El código del vehículo no corresponde a este viaje.';
    }
    return apiMessage(error) ?? `No se pudo confirmar el abordaje (error ${error.status}).`;
  }
  return 'No se pudo confirmar el abordaje. Inténtalo nuevamente.';
}

function apiMessage(error: HttpErrorResponse): string | null {
  const response = error.error as ApiErrorResponse | string | null;
  if (response && typeof response === 'object' && response.message) return response.message;
  if (typeof response === 'string' && response.trim()) return response;
  return null;
}
