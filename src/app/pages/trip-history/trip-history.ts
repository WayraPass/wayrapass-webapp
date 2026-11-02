import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';
import {
  BoardingStatus,
  IncidentPriority,
  IncidentStatus,
  IncidentType,
  StudentTripHistoryDetail,
  TripHistoryItem,
  TripStatus,
} from '../../core/models/trip.models';
import { TripService, historyErrorMessage } from '../../core/services/trip.service';

@Component({
  selector: 'app-trip-history',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './trip-history.html',
  styleUrl: './trip-history.css',
})
export class TripHistory {
  private readonly fb = inject(FormBuilder);
  private readonly tripsService = inject(TripService);

  readonly trips = signal<TripHistoryItem[]>([]);
  readonly selectedTripId = signal<number | null>(null);
  readonly detail = signal<StudentTripHistoryDetail | null>(null);
  readonly loading = signal(false);
  readonly detailLoading = signal(false);
  readonly errorMessage = signal('');
  readonly detailError = signal('');

  readonly filters = this.fb.nonNullable.group({
    from: isoDate(addDays(new Date(), -365)),
    to: isoDate(new Date()),
  });

  constructor() {
    this.loadHistory();
  }

  loadHistory(): void {
    const { from, to } = this.filters.getRawValue();
    this.errorMessage.set('');
    if (!from || !to || from > to) {
      this.errorMessage.set('La fecha inicial no puede ser posterior a la fecha final.');
      return;
    }

    this.loading.set(true);
    this.tripsService.getHistory(from, to).pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: (trips) => {
        this.trips.set(trips);
        const currentSelection = this.selectedTripId();
        const selected = trips.find((trip) => trip.tripId === currentSelection) ?? trips[0] ?? null;
        if (selected) this.selectTrip(selected);
        else {
          this.selectedTripId.set(null);
          this.detail.set(null);
        }
      },
      error: (error: unknown) => this.errorMessage.set(historyErrorMessage(error)),
    });
  }

  selectTrip(trip: TripHistoryItem): void {
    this.selectedTripId.set(trip.tripId);
    this.detail.set(null);
    this.detailError.set('');
    this.detailLoading.set(true);
    this.tripsService.getHistoryDetail(trip.tripId).pipe(
      finalize(() => this.detailLoading.set(false)),
    ).subscribe({
      next: (detail) => this.detail.set(detail),
      error: (error: unknown) => this.detailError.set(historyErrorMessage(error)),
    });
  }

  retryDetail(): void {
    const selected = this.trips().find((trip) => trip.tripId === this.selectedTripId());
    if (selected) this.selectTrip(selected);
  }

  tripStatusLabel(status: TripStatus): string {
    return ({ SCHEDULED: 'Programado', BOARDING: 'En embarque', IN_PROGRESS: 'En recorrido', COMPLETED: 'Finalizado', CANCELLED: 'Cancelado' } as const)[status];
  }

  boardingStatusLabel(status: BoardingStatus): string {
    return status === 'CONFIRMED' ? 'Abordaje confirmado' : 'Abordaje cancelado';
  }

  incidentTypeLabel(type: IncidentType): string {
    return ({ TRAFFIC_DELAY: 'Demora por tráfico', DETOUR: 'Desvío', VEHICLE_FAILURE: 'Falla del vehículo', STOP_UNAVAILABLE: 'Paradero no disponible', OTHER: 'Otra incidencia' } as const)[type];
  }

  incidentPriorityLabel(priority: IncidentPriority): string {
    return ({ NORMAL: 'Normal', HIGH: 'Alta', CRITICAL: 'Crítica' } as const)[priority];
  }

  incidentStatusLabel(status: IncidentStatus): string {
    return status === 'OPEN' ? 'Abierta' : 'Resuelta';
  }
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function isoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
