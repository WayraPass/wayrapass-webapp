import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiErrorResponse } from '../models/auth.models';
import { CreateIncidentRequest, IncidentResponse } from '../models/incident.models';

@Injectable({ providedIn: 'root' })
export class IncidentService {
  private readonly http = inject(HttpClient);

  create(request: CreateIncidentRequest): Observable<IncidentResponse> {
    return this.http.post<IncidentResponse>(`${environment.apiUrl}/incidents`, request);
  }
}

export function incidentErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'No se pudo registrar la incidencia. Inténtalo nuevamente.';
  if (error.status === 0) return 'No se pudo conectar con WayraPass. Verifica que el backend esté disponible.';
  if (error.status === 401) return 'Tu sesión venció. Vuelve a iniciar sesión.';
  if (error.status === 403) return 'No tienes permiso para registrar una incidencia en este viaje.';
  if (error.status === 404) return 'El viaje seleccionado ya no está disponible.';
  if (error.status === 409) return apiMessage(error) ?? 'La incidencia no pudo registrarse debido a un conflicto. Actualiza los viajes e inténtalo nuevamente.';
  if (error.status === 400) return apiMessage(error) ?? 'Revisa los datos ingresados antes de continuar.';
  return apiMessage(error) ?? `No se pudo registrar la incidencia (error ${error.status}).`;
}

function apiMessage(error: HttpErrorResponse): string | null {
  const response = error.error as ApiErrorResponse | string | null;
  if (response && typeof response === 'object') {
    const fieldError = response.fieldErrors ? Object.values(response.fieldErrors)[0] : null;
    return fieldError ?? response.message ?? null;
  }
  return typeof response === 'string' && response.trim() ? response : null;
}
