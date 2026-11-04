import { Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { TripStatus, UpcomingTrip } from '../../../core/models/trip.models';
import { TripService, upcomingTripsErrorMessage } from '../../../core/services/trip.service';

@Component({
  selector: 'app-upcoming-trips',
  standalone: true,
  imports: [RouterLink, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './upcoming-trips.html',
  styleUrl: './upcoming-trips.css',
})
export class UpcomingTrips {
  private readonly tripService = inject(TripService);

  readonly loading = signal(true);
  readonly trips = signal<UpcomingTrip[]>([]);
  readonly errorMessage = signal('');

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.tripService.getUpcomingTrips().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (trips) => {
        this.trips.set([...trips].sort((left, right) => left.scheduledStartAt.localeCompare(right.scheduledStartAt)));
      },
      error: (error: unknown) => this.errorMessage.set(upcomingTripsErrorMessage(error)),
    });
  }

  statusLabel(status: TripStatus): string {
    return ({ SCHEDULED: 'Programado', BOARDING: 'En embarque', IN_PROGRESS: 'En recorrido', COMPLETED: 'Completado', CANCELLED: 'Cancelado' } as const)[status];
  }

  dateLabel(value: string): string {
    return new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(value));
  }

  timeLabel(value: string): string {
    return new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  }
}
