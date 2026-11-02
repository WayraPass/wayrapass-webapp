import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, forkJoin, of, switchMap, tap } from 'rxjs';
import {
  ApiDayOfWeek,
  FavoriteRoute,
  GroupedRouteSchedule,
  GroupedRouteSearch,
  GroupedRouteSearchFilters,
  InstitutionCatalog,
  PickupStop,
} from '../../../core/models/route.models';
import { AuthService } from '../../../core/services/auth.service';
import { RouteService, routeErrorMessage } from '../../../core/services/route.service';

interface ScheduleGroup {
  day: ApiDayOfWeek;
  schedules: GroupedRouteSchedule[];
}

const DAY_ORDER: ApiDayOfWeek[] = [
  'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY',
];

@Component({
  selector: 'app-student-route-search',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './route-search.html',
})
export class StudentRouteSearch {
  private readonly fb = inject(FormBuilder);
  private readonly routesService = inject(RouteService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly user = this.auth.user;
  readonly institutions = signal<InstitutionCatalog[]>([]);
  readonly districts = signal<string[]>([]);
  readonly pickups = signal<PickupStop[]>([]);
  readonly results = signal<GroupedRouteSearch[]>([]);
  readonly favorites = signal<FavoriteRoute[]>([]);
  readonly catalogsLoading = signal(false);
  readonly pickupsLoading = signal(false);
  readonly loading = signal(false);
  readonly favoritesLoading = signal(false);
  readonly pendingRoutes = signal<ReadonlySet<number>>(new Set());
  readonly errorMessage = signal('');
  readonly catalogError = signal('');
  readonly pickupError = signal('');
  readonly successMessage = signal('');
  readonly resultLabel = computed(() => {
    const count = this.results().length;
    return `${count} ${count === 1 ? 'ruta encontrada' : 'rutas encontradas'}`;
  });

  readonly form = this.fb.nonNullable.group({
    institutionId: 0,
    district: '',
    stopId: 0,
  });

  constructor() {
    this.observeDistrict();
    this.loadCatalogs();
    this.loadFavorites();
  }

  loadCatalogs(): void {
    if (this.catalogsLoading()) return;
    this.catalogsLoading.set(true);
    this.catalogError.set('');
    forkJoin({
      profile: this.auth.currentUser(),
      institutions: this.routesService.getPublicInstitutions(),
      districts: this.routesService.getDistricts(),
    }).pipe(
      finalize(() => this.catalogsLoading.set(false)),
    ).subscribe({
      next: ({ profile, institutions, districts }) => {
        const sortedInstitutions = [...institutions].sort((a, b) =>
          a.displayName.localeCompare(b.displayName, 'es', { sensitivity: 'base' }));
        this.institutions.set(sortedInstitutions);
        this.districts.set([...districts].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })));
        const preferredId = profile.institutionId ?? this.auth.preferredStudentInstitutionId();
        if (preferredId && sortedInstitutions.some((institution) => institution.id === preferredId)) {
          this.form.controls.institutionId.setValue(preferredId);
        }
        this.search();
      },
      error: (error: unknown) => this.catalogError.set(routeErrorMessage(error)),
    });
  }

  search(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
    this.loading.set(true);
    this.routesService.searchGroupedRoutes(this.filters()).pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: (results) => this.results.set(results),
      error: (error: unknown) => this.errorMessage.set(routeErrorMessage(error)),
    });
  }

  clearFilters(): void {
    const preferredId = this.auth.preferredStudentInstitutionId();
    this.form.reset({ institutionId: preferredId ?? 0, district: '', stopId: 0 });
    this.pickups.set([]);
    this.pickupError.set('');
    this.search();
  }

  toggleFavorite(route: GroupedRouteSearch): void {
    if (this.isPending(route.routeId)) return;
    const nextFavorite = !route.favorite;
    this.setPending(route.routeId, true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.markFavorite(route.routeId, nextFavorite);

    const request = nextFavorite
      ? this.routesService.addFavorite(route.routeId)
      : this.routesService.removeFavorite(route.routeId);

    request.pipe(
      switchMap(() => this.routesService.getFavoriteRoutes()),
      finalize(() => this.setPending(route.routeId, false)),
    ).subscribe({
      next: (favorites) => {
        this.favorites.set(favorites);
        this.successMessage.set(nextFavorite
          ? `Ruta ${route.routeCode} guardada como favorita.`
          : `Ruta ${route.routeCode} retirada de favoritos.`);
      },
      error: (error: unknown) => {
        if (nextFavorite && error instanceof HttpErrorResponse && error.status === 409) {
          this.markFavorite(route.routeId, true);
          this.successMessage.set(`La ruta ${route.routeCode} ya estaba guardada como favorita.`);
          this.loadFavorites();
          return;
        }
        this.markFavorite(route.routeId, !nextFavorite);
        this.errorMessage.set(routeErrorMessage(error));
      },
    });
  }

  removeFavorite(favorite: FavoriteRoute): void {
    if (this.isPending(favorite.routeId)) return;
    const previous = this.favorites();
    this.setPending(favorite.routeId, true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.favorites.update((favorites) => favorites.filter((item) => item.routeId !== favorite.routeId));
    this.markFavorite(favorite.routeId, false);

    this.routesService.removeFavorite(favorite.routeId).pipe(
      finalize(() => this.setPending(favorite.routeId, false)),
    ).subscribe({
      next: () => this.successMessage.set(`Ruta ${favorite.routeCode} retirada de favoritos.`),
      error: (error: unknown) => {
        this.favorites.set(previous);
        this.markFavorite(favorite.routeId, true);
        this.errorMessage.set(routeErrorMessage(error));
      },
    });
  }

  isPending(routeId: number): boolean {
    return this.pendingRoutes().has(routeId);
  }

  favoriteCampus(routeId: number): string {
    return this.results().find((route) => route.routeId === routeId)?.institution.displayName
      ?? 'Campus disponible al consultar la ruta';
  }

  scheduleGroups(schedules: GroupedRouteSchedule[]): ScheduleGroup[] {
    return DAY_ORDER.map((day) => ({ day, schedules: schedules.filter((schedule) => schedule.dayOfWeek === day) }))
      .filter((group) => group.schedules.length > 0);
  }

  dayLabel(day: ApiDayOfWeek): string {
    return ({
      MONDAY: 'Lunes', TUESDAY: 'Martes', WEDNESDAY: 'Miércoles', THURSDAY: 'Jueves',
      FRIDAY: 'Viernes', SATURDAY: 'Sábado', SUNDAY: 'Domingo',
    } as const)[day];
  }

  shortTime(value: string): string {
    return value.slice(0, 5);
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  private observeDistrict(): void {
    this.form.controls.district.valueChanges.pipe(
      tap(() => {
        this.form.controls.stopId.setValue(0, { emitEvent: false });
        this.pickups.set([]);
        this.pickupError.set('');
      }),
      switchMap((district) => {
        if (!district) return of([] as PickupStop[]);
        this.pickupsLoading.set(true);
        return this.routesService.getStopsByDistrict(district).pipe(
          catchError((error: unknown) => {
            this.pickupError.set(routeErrorMessage(error));
            return of([] as PickupStop[]);
          }),
          finalize(() => this.pickupsLoading.set(false)),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((pickups) => this.pickups.set(pickups));
  }

  private loadFavorites(): void {
    this.favoritesLoading.set(true);
    this.routesService.getFavoriteRoutes().pipe(
      finalize(() => this.favoritesLoading.set(false)),
    ).subscribe({
      next: (favorites) => this.favorites.set(favorites),
      error: (error: unknown) => this.errorMessage.set(routeErrorMessage(error)),
    });
  }

  private filters(): GroupedRouteSearchFilters {
    const value = this.form.getRawValue();
    return {
      ...(value.institutionId ? { institutionId: value.institutionId } : {}),
      ...(value.district ? { district: value.district } : {}),
      ...(value.stopId ? { stopId: value.stopId } : {}),
    };
  }

  private markFavorite(routeId: number, favorite: boolean): void {
    this.results.update((results) => results.map((route) =>
      route.routeId === routeId ? { ...route, favorite } : route));
  }

  private setPending(routeId: number, pending: boolean): void {
    const next = new Set(this.pendingRoutes());
    if (pending) next.add(routeId); else next.delete(routeId);
    this.pendingRoutes.set(next);
  }
}
