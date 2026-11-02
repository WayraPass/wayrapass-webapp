import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, catchError, exhaustMap, map, merge, of, tap, timer } from 'rxjs';
import { CurrentTripResponse, TripStatus } from '../../../core/models/trip.models';
import { TripService, tripErrorMessage } from '../../../core/services/trip.service';

export const CURRENT_TRIP_POLL_MS = 8_000;

interface TripLoadResult {
  response?: CurrentTripResponse;
  error: string;
}

@Component({
  selector: 'app-current-trip',
  standalone: true,
  imports: [DatePipe, DecimalPipe, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './current-trip.html',
  styleUrl: './current-trip.css',
})
export class CurrentTrip {
  private readonly trips = inject(TripService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly refreshRequests = new Subject<void>();
  private loaded = false;

  readonly response = signal<CurrentTripResponse | null>(null);
  readonly loading = signal(true);
  readonly refreshing = signal(false);
  readonly errorMessage = signal('');
  readonly trip = computed(() => this.response()?.trip ?? null);

  constructor() {
    merge(timer(0, CURRENT_TRIP_POLL_MS), this.refreshRequests).pipe(
      tap(() => {
        if (this.loaded) this.refreshing.set(true);
      }),
      exhaustMap(() => this.trips.getCurrentTrip().pipe(
        map((response): TripLoadResult => ({ response, error: '' })),
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 404) {
            return of<TripLoadResult>({
              response: { available: false, message: 'No hay un viaje activo o programado para la inscripción actual.', trip: null },
              error: '',
            });
          }
          return of<TripLoadResult>({ error: tripErrorMessage(error) });
        }),
      )),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ response, error }) => {
      if (response) this.response.set(response);
      this.errorMessage.set(error);
      this.loading.set(false);
      this.refreshing.set(false);
      this.loaded = true;
    });
  }

  refresh(): void {
    this.errorMessage.set('');
    this.refreshRequests.next();
  }

  statusLabel(status: TripStatus): string {
    return ({
      SCHEDULED: 'Programado',
      BOARDING: 'En embarque',
      IN_PROGRESS: 'En recorrido',
      COMPLETED: 'Finalizado',
      CANCELLED: 'Cancelado',
    } as const)[status];
  }

  freshnessLabel(freshness: string): string {
    return ({ RECENT: 'Ubicación reciente', STALE: 'Ubicación desactualizada', UNAVAILABLE: 'Sin ubicación' } as Record<string, string>)[freshness] ?? freshness;
  }

  etaSourceLabel(source: string): string {
    return ({ PLANNED: 'Horario planificado', OPERATIONAL: 'Operación en vivo', UNAVAILABLE: 'No disponible' } as Record<string, string>)[source] ?? source;
  }
}
