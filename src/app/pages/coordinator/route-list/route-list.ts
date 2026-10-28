import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TransportRoute } from '../../../core/models/route.models';
import { RouteService, routeErrorMessage } from '../../../core/services/route.service';
import { StatusBadge } from '../status-badge/status-badge';

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

@Component({
  selector: 'app-route-list',
  standalone: true,
  imports: [DatePipe, RouterLink, MatIconModule, MatProgressSpinnerModule, StatusBadge],
  templateUrl: './route-list.html',
  styleUrl: './route-list.css',
})
export class RouteList {
  private readonly service = inject(RouteService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly routes = signal<TransportRoute[]>([]);
  readonly stopCount = signal<number | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly query = signal('');
  readonly statusFilter = signal<StatusFilter>('ALL');

  readonly savedId = signal<string | null>(this.route.snapshot.queryParamMap.get('saved'));
  readonly savedMode = this.route.snapshot.queryParamMap.get('mode') === 'updated' ? 'updated' : 'created';

  readonly filters: ReadonlyArray<{ value: StatusFilter; label: string }> = [
    { value: 'ALL', label: 'Todas' },
    { value: 'ACTIVE', label: 'Activas' },
    { value: 'INACTIVE', label: 'Inactivas' },
  ];

  readonly visibleRoutes = computed(() => {
    const q = normalize(this.query());
    const status = this.statusFilter();
    return this.routes().filter(
      (r) =>
        (status === 'ALL' || r.status === status) &&
        (!q || normalize(`${r.code} ${r.name} ${r.origin} ${r.destination}`).includes(q)),
    );
  });
  readonly resultLabel = computed(() => {
    const n = this.visibleRoutes().length;
    return `${n} ${n === 1 ? 'ruta' : 'rutas'}`;
  });
  readonly savedRoute = computed(() => this.routes().find((r) => r.id === this.savedId()) ?? null);

  constructor() {
    this.service.getRoutes().subscribe({
      next: (routes) => {
        this.routes.set(routes);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(routeErrorMessage(error));
        this.loading.set(false);
      },
    });
    this.service.getStops().subscribe((stops) => this.stopCount.set(stops.length));
  }

  onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  dismissSaved(): void {
    this.savedId.set(null);
    void this.router.navigate([], { queryParams: {}, replaceUrl: true });
  }
}

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}