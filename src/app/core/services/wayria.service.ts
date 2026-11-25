import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiErrorResponse } from '../models/auth.models';
import { WayriaChatRequest, WayriaChatResponse, WayriaProactiveMessage } from '../models/wayria.models';

@Injectable({ providedIn: 'root' })
export class WayriaService {
  private readonly http = inject(HttpClient);

  chat(message: string): Observable<WayriaChatResponse> {
    const body: WayriaChatRequest = { message };
    return this.http.post<WayriaChatResponse>(`${environment.apiUrl}/agent/chat`, body);
  }

  proactiveMessages(): Observable<WayriaProactiveMessage[]> {
    return this.http.get<WayriaProactiveMessage[]>(`${environment.apiUrl}/agent/proactive-messages`);
  }
}

export function wayriaErrorMessage(error: unknown): string {
  const unavailable = 'No pude consultar la información del servicio en este momento. Intenta nuevamente más tarde.';
  if (error instanceof HttpErrorResponse) {
    if (error.status === 401) return 'Tu sesión venció. Vuelve a iniciar sesión para consultar WayrIA.';
    if (error.status === 403) return 'Tu cuenta no tiene permiso para usar WayrIA.';
    if (error.status === 0 || error.status >= 500) return unavailable;
    const response = error.error as ApiErrorResponse | string | null;
    if (response && typeof response === 'object' && response.message) return response.message;
    if (typeof response === 'string' && response.trim()) return response;
  }
  return unavailable;
}
