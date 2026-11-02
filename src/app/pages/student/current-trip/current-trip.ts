import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, catchError, exhaustMap, map, merge, of, tap, timer } from 'rxjs';
import { BoardingResponse, CurrentTripResponse, TripStatus } from '../../../core/models/trip.models';
import { BoardingService, boardingErrorMessage } from '../../../core/services/boarding.service';
import { TripService, tripErrorMessage } from '../../../core/services/trip.service';

export const CURRENT_TRIP_POLL_MS = 8_000;

interface TripLoadResult {
  response?: CurrentTripResponse;
  error: string;
}

@Component({
  selector: 'app-current-trip',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './current-trip.html',
  styleUrl: './current-trip.css',
})
export class CurrentTrip {
  private readonly trips = inject(TripService);
  private readonly boardings = inject(BoardingService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly refreshRequests = new Subject<void>();
  private loaded = false;

  readonly response = signal<CurrentTripResponse | null>(null);
  readonly loading = signal(true);
  readonly refreshing = signal(false);
  readonly errorMessage = signal('');
  readonly trip = computed(() => this.response()?.trip ?? null);
  readonly boardingPanelOpen = signal(false);
  readonly boardingCode = signal('');
  readonly boardingLoading = signal(false);
  readonly boardingError = signal('');
  readonly boardingResult = signal<BoardingResponse | null>(null);
  readonly boardingRegistered = signal(false);
  readonly canBoard = computed(() => {
    const trip = this.trip();
    return Boolean(
      trip
      && (trip.tripStatus === 'BOARDING' || trip.tripStatus === 'IN_PROGRESS')
      && trip.assignedStop
      && trip.vehicle
      && !this.boardingRegistered()
    );
  });

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

  openBoarding(): void {
    if (!this.canBoard()) return;
    this.boardingError.set('');
    this.boardingPanelOpen.set(true);
  }

  closeBoarding(): void {
    if (this.boardingLoading()) return;
    this.boardingCode.set('');
    this.boardingError.set('');
    this.boardingPanelOpen.set(false);
  }

  confirmBoarding(): void {
    const trip = this.trip();
    const code = this.boardingCode().trim();
    if (!trip || !trip.assignedStop || !this.canBoard()) return;
    if (!code) {
      this.boardingError.set('Ingresa el código obtenido del QR del vehículo.');
      return;
    }

    this.boardingLoading.set(true);
    this.boardingError.set('');
    this.boardingCode.set('');
    this.boardings.confirm({ tripId: trip.tripId, stopId: trip.assignedStop.stopId, vehicleQrToken: code }).subscribe({
      next: (result) => {
        this.boardingResult.set(result);
        this.boardingRegistered.set(true);
        this.boardingPanelOpen.set(false);
        this.boardingLoading.set(false);
      },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 409) {
          this.boardingRegistered.set(true);
          this.boardingPanelOpen.set(false);
        }
        this.boardingError.set(boardingErrorMessage(error));
        this.boardingLoading.set(false);
      },
    });
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
