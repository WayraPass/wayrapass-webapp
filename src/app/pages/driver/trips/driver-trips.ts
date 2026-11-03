import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription, finalize } from 'rxjs';
import { DriverRouteStop, DriverTrip, DriverTripFilters } from '../../../core/models/driver.models';
import { TripStatus } from '../../../core/models/trip.models';
import { DriverService, driverErrorMessage } from '../../../core/services/driver.service';

@Component({
  selector: 'app-driver-trips',
  standalone: true,
  imports: [ReactiveFormsModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './driver-trips.html',
  styleUrl: './driver-trips.css',
})
export class DriverTrips implements OnDestroy {
  private readonly drivers = inject(DriverService);
  private readonly fb = inject(FormBuilder);
  private request?: Subscription;
  private lastFilters: DriverTripFilters | null = null;

  readonly PAGE_SIZE = 10;
  readonly loading = signal(false);
  readonly trips = signal<DriverTrip[]>([]);
  readonly errorMessage = signal('');
  readonly filterMessage = signal('');
  readonly hasSearched = signal(false);
  readonly listingAll = signal(false);
  readonly currentPage = signal(1);
  readonly totalPages = computed(() => Math.ceil(this.trips().length / this.PAGE_SIZE));
  readonly pagedTrips = computed(() => {
    const start = (this.currentPage() - 1) * this.PAGE_SIZE;
    return this.trips().slice(start, start + this.PAGE_SIZE);
  });
  readonly firstVisibleResult = computed(() => this.trips().length ? (this.currentPage() - 1) * this.PAGE_SIZE + 1 : 0);
  readonly lastVisibleResult = computed(() => Math.min(this.currentPage() * this.PAGE_SIZE, this.trips().length));
  readonly filters = this.fb.nonNullable.group({ from: '', to: '' });

  applyFilters(): void {
    const filters = this.currentFilters();
    this.currentPage.set(1);
    this.errorMessage.set('');
    if (filters.from && filters.to && filters.from > filters.to) {
      this.trips.set([]);
      this.hasSearched.set(false);
      this.filterMessage.set('La fecha inicial no puede ser posterior a la fecha final.');
      return;
    }
    if (!filters.from && !filters.to) {
      this.trips.set([]);
      this.hasSearched.set(false);
      this.listingAll.set(false);
      this.filterMessage.set('Selecciona al menos una fecha o utiliza "Listar todos".');
      return;
    }
    this.filterMessage.set('');
    this.listingAll.set(false);
    this.load(filters);
  }

  listAll(): void {
    this.filters.reset({ from: '', to: '' });
    this.filterMessage.set('');
    this.listingAll.set(true);
    this.load({});
  }

  clearFilters(): void {
    this.request?.unsubscribe();
    this.filters.reset({ from: '', to: '' });
    this.trips.set([]);
    this.filterMessage.set('');
    this.errorMessage.set('');
    this.loading.set(false);
    this.hasSearched.set(false);
    this.listingAll.set(false);
    this.currentPage.set(1);
    this.lastFilters = null;
  }

  retry(): void {
    if (this.lastFilters) this.load(this.lastFilters);
  }

  previousPage(): void {
    this.currentPage.update((page) => Math.max(1, page - 1));
  }

  nextPage(): void {
    this.currentPage.update((page) => Math.min(this.totalPages(), page + 1));
  }

  ngOnDestroy(): void { this.request?.unsubscribe(); }

  statusLabel(status: TripStatus): string {
    return ({ SCHEDULED: 'Programado', BOARDING: 'En embarque', IN_PROGRESS: 'En curso', COMPLETED: 'Finalizado', CANCELLED: 'Cancelado' } as const)[status];
  }

  statusClass(status: TripStatus): string { return status.toLowerCase().replace('_', '-'); }

  orderedStops(trip: DriverTrip): DriverRouteStop[] {
    return [...trip.stops].sort((left, right) => left.stopOrder - right.stopOrder);
  }

  dateLabel(value: string): string {
    return new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));
  }

  timeLabel(value: string): string {
    return new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  }

  private load(filters: DriverTripFilters = {}): void {
    this.request?.unsubscribe();
    this.lastFilters = { ...filters };
    this.currentPage.set(1);
    this.hasSearched.set(true);
    this.loading.set(true);
    this.errorMessage.set('');
    this.request = this.drivers.getTrips(filters).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (trips) => this.trips.set(trips),
      error: (error: unknown) => this.errorMessage.set(driverErrorMessage(error)),
    });
  }

  private currentFilters(): DriverTripFilters {
    const { from, to } = this.filters.getRawValue();
    return { ...(from ? { from } : {}), ...(to ? { to } : {}) };
  }
}
