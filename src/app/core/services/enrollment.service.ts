import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiErrorResponse } from '../models/auth.models';
import { CurrentEnrollment, EnrollmentRequest, EnrollmentResponse, SuspensionRequest } from '../models/enrollment.models';

@Injectable({ providedIn: 'root' })
export class EnrollmentService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/enrollments/me`;

  getCurrent(): Observable<CurrentEnrollment> {
    return this.http.get<CurrentEnrollment>(this.url);
  }

  enroll(request: EnrollmentRequest): Observable<EnrollmentResponse> {
    return this.http.post<EnrollmentResponse>(this.url, request);
  }

  suspend(request: SuspensionRequest): Observable<CurrentEnrollment> {
    return this.http.put<CurrentEnrollment>(`${this.url}/suspension`, request);
  }

  reactivate(): Observable<CurrentEnrollment> {
    return this.http.put<CurrentEnrollment>(`${this.url}/reactivation`, null);
  }
}

export function enrollmentErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'No se pudo conectar con WayraPass. Verifica que el backend esté disponible.';
    if (error.status === 401) return 'Tu sesión venció. Vuelve a iniciar sesión.';
    if (error.status === 403) return 'Tu cuenta no tiene permiso para gestionar esta inscripción.';
    if (error.status === 404) return apiMessage(error) ?? 'No se encontró la ruta o el paradero seleccionado.';
    if (error.status === 409) return apiMessage(error) ?? 'La ruta seleccionada no tiene cupos disponibles.';
    return apiMessage(error) ?? `No se pudo guardar la inscripción (error ${error.status}).`;
  }
  return 'No se pudo guardar la inscripción. Inténtalo nuevamente.';
}

export function enrollmentStatusErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'No se pudo conectar con WayraPass. Verifica que el backend esté disponible.';
    if (error.status === 401) return 'Tu sesión venció. Vuelve a iniciar sesión.';
    if (error.status === 403) return 'Tu cuenta no tiene permiso para gestionar esta inscripción.';
    if (error.status === 404) return apiMessage(error) ?? 'No tienes una inscripción para gestionar.';
    if (error.status === 409) return apiMessage(error) ?? 'La inscripción no puede actualizarse en este momento.';
    return apiMessage(error) ?? `No se pudo actualizar la inscripción (error ${error.status}).`;
  }
  return 'No se pudo actualizar la inscripción. Inténtalo nuevamente.';
}

function apiMessage(error: HttpErrorResponse): string | null {
  const response = error.error as ApiErrorResponse | string | null;
  if (response && typeof response === 'object') {
    const fieldError = response.fieldErrors ? Object.values(response.fieldErrors)[0] : null;
    return fieldError ?? response.message ?? null;
  }
  if (typeof response === 'string' && response.trim()) return response;
  return null;
}
