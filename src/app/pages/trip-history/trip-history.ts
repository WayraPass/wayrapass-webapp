import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService, roleLabel } from '../../core/services/auth.service';

type TripStatus = 'Completado' | 'Con retraso' | 'No abordado';
type Stop = { name: string; time: string };
type Trip = {
  id: number;
  date: string;
  route: string;
  direction: 'Ida' | 'Vuelta';
  departure: string;
  arrival: string;
  status: TripStatus;
  bus: string;
  duration: number | null;
  stops: Stop[];
};

const ROUTE_STOPS: Stop[] = [
  { name: 'Paradero de abordaje', time: '07:10' },
  { name: 'Paradero Los Olivos', time: '07:24' },
  { name: 'Paradero Central', time: '07:38' },
  { name: 'Puerta de la Universidad', time: '07:52' },
];

@Component({
  selector: 'app-trip-history',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './trip-history.html',
  styleUrl: './trip-history.css',
})
export class TripHistory {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly user = this.auth.user;
  readonly userRoleLabel = computed(() => this.user() ? roleLabel(this.user()!.role) : 'Usuario');
  readonly initials = computed(() =>
    (this.user()?.fullName ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]!.toUpperCase())
      .join(''),
  );

  private readonly pageSize = 6;
  readonly currentPage = signal(1);
  readonly selectedTrip = signal<Trip | null>(null);

  readonly trips: Trip[] = [
    { id: 1, date: '23/10/2026', route: 'Ruta 01 · Norte', direction: 'Ida', departure: '07:10', arrival: '07:52', status: 'Completado', bus: 'ABC-123', duration: 42, stops: ROUTE_STOPS },
    { id: 2, date: '22/10/2026', route: 'Ruta 01 · Norte', direction: 'Vuelta', departure: '17:05', arrival: '17:51', status: 'Completado', bus: 'ABC-123', duration: 46, stops: [...ROUTE_STOPS].reverse() },
    { id: 3, date: '21/10/2026', route: 'Ruta 03 · Este', direction: 'Ida', departure: '07:18', arrival: '08:04', status: 'Con retraso', bus: 'DEF-456', duration: 46, stops: ROUTE_STOPS },
    { id: 4, date: '20/10/2026', route: 'Ruta 01 · Norte', direction: 'Vuelta', departure: '17:02', arrival: '17:46', status: 'Completado', bus: 'ABC-123', duration: 44, stops: [...ROUTE_STOPS].reverse() },
    { id: 5, date: '19/10/2026', route: 'Ruta 02 · Sur', direction: 'Ida', departure: '—', arrival: '—', status: 'No abordado', bus: 'GHI-789', duration: null, stops: ROUTE_STOPS },
    { id: 6, date: '16/10/2026', route: 'Ruta 01 · Norte', direction: 'Ida', departure: '07:08', arrival: '07:49', status: 'Completado', bus: 'ABC-123', duration: 41, stops: ROUTE_STOPS },
    { id: 7, date: '15/10/2026', route: 'Ruta 03 · Este', direction: 'Vuelta', departure: '17:12', arrival: '18:01', status: 'Completado', bus: 'DEF-456', duration: 49, stops: [...ROUTE_STOPS].reverse() },
    { id: 8, date: '14/10/2026', route: 'Ruta 02 · Sur', direction: 'Ida', departure: '07:15', arrival: '08:01', status: 'Con retraso', bus: 'GHI-789', duration: 46, stops: ROUTE_STOPS },
  ];

  readonly pageCount = Math.ceil(this.trips.length / this.pageSize);
  readonly visibleTrips = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.trips.slice(start, start + this.pageSize);
  });

  constructor() {
    this.selectedTrip.set(this.trips[0]);
  }

  selectTrip(trip: Trip): void {
    this.selectedTrip.set(trip);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.pageCount) return;
    this.currentPage.set(page);
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
