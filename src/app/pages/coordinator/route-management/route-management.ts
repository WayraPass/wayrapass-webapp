import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize, forkJoin } from 'rxjs';
import { InstitutionAdmin, RouteAdmin, RouteRequest, RouteScheduleAdmin, RouteStatus, RouteStopAdmin, StopAdmin } from '../../../core/models/coordinator.models';
import { CoordinatorService, coordinatorErrorMessage } from '../../../core/services/coordinator.service';

@Component({ selector: 'app-route-management', standalone: true, imports: [ReactiveFormsModule, RouterLink, MatIconModule, MatProgressSpinnerModule], templateUrl: './route-management.html', styleUrl: './route-management.css' })
export class RouteManagement {
  private readonly service = inject(CoordinatorService);
  private readonly fb = inject(FormBuilder).nonNullable;
  private detailRequestVersion = 0;
  readonly routes = signal<RouteAdmin[]>([]); readonly institutions = signal<InstitutionAdmin[]>([]); readonly stops = signal<StopAdmin[]>([]); readonly schedules = signal<RouteScheduleAdmin[]>([]);
  readonly routeStopCounts = signal(new Map<number, number>()); readonly selectedRoute = signal<RouteAdmin | null>(null); readonly selectedStops = signal<RouteStopAdmin[]>([]);
  readonly loading = signal(true); readonly detailLoading = signal(false); readonly saving = signal(false); readonly errorMessage = signal(''); readonly notice = signal(''); readonly query = signal('');
  readonly routeFormOpen = signal(false); readonly editingRoute = signal<RouteAdmin | null>(null); readonly associationOpen = signal(false);
  readonly visibleRoutes = computed(() => { const q = normalize(this.query()); return this.routes().filter((route) => !q || normalize(`${route.code} ${route.name} ${route.origin} ${route.destination}`).includes(q)); });
  readonly orderedSelectedStops = computed(() => [...this.selectedStops()].sort((a, b) => a.stopOrder - b.stopOrder));
  readonly routeForm = this.fb.group({ institutionId: [0, Validators.min(1)], code: ['', [Validators.required, Validators.maxLength(30)]], name: ['', [Validators.required, Validators.maxLength(150)]], origin: ['', [Validators.required, Validators.maxLength(200)]], destination: ['', [Validators.required, Validators.maxLength(200)]], description: ['', Validators.maxLength(500)], capacity: [1, Validators.min(1)], status: this.fb.control<RouteStatus>('ACTIVE') });
  readonly associationForm = this.fb.group({ stopId: [0, Validators.min(1)], stopOrder: [1, Validators.min(1)], estimatedMinutesFromStart: [0, Validators.min(0)], active: [true] });

  constructor() { this.load(); }
  load(): void { this.loading.set(true); this.errorMessage.set(''); forkJoin({ routes: this.service.routes(), institutions: this.service.institutions(), stops: this.service.stops(), schedules: this.service.schedules() }).pipe(finalize(() => this.loading.set(false))).subscribe({ next: (data) => { this.routes.set(data.routes); this.institutions.set(data.institutions); this.stops.set(data.stops); this.schedules.set(data.schedules); if (!data.routes.length) this.routeStopCounts.set(new Map()); else forkJoin(data.routes.map((route) => this.service.routeStops(route.id))).subscribe((groups) => this.routeStopCounts.set(new Map(data.routes.map((route, index) => [route.id, groups[index].length])))); }, error: (error: unknown) => this.errorMessage.set(coordinatorErrorMessage(error)) }); }
  openRouteForm(route: RouteAdmin | null = null): void { this.editingRoute.set(route); this.routeForm.reset(route ? { ...route, description: route.description ?? '' } : { institutionId: 0, code: '', name: '', origin: '', destination: '', description: '', capacity: 1, status: 'ACTIVE' }); this.routeFormOpen.set(true); this.errorMessage.set(''); }
  saveRoute(): void { if (this.routeForm.invalid) { this.routeForm.markAllAsTouched(); return; } const value = this.routeForm.getRawValue(); const request: RouteRequest = { ...value, code: value.code.trim().toUpperCase(), name: value.name.trim(), origin: value.origin.trim(), destination: value.destination.trim(), description: value.description.trim() || null }; const editing = this.editingRoute(); this.saving.set(true); (editing ? this.service.updateRoute(editing.id, request) : this.service.createRoute(request)).pipe(finalize(() => this.saving.set(false))).subscribe({ next: (saved) => { this.routes.update((list) => editing ? list.map((route) => route.id === saved.id ? saved : route) : [...list, saved]); this.routeFormOpen.set(false); this.notice.set(editing ? `Ruta ${saved.code} actualizada.` : `Ruta ${saved.code} creada correctamente.`); if (!editing) { this.routeStopCounts.update((counts) => new Map(counts).set(saved.id, 0)); this.selectRoute(saved); } }, error: (error: unknown) => this.errorMessage.set(coordinatorErrorMessage(error)) }); }
  selectRoute(route: RouteAdmin): void {
    if (this.selectedRoute()?.id === route.id) {
      this.detailRequestVersion++;
      this.selectedRoute.set(null);
      this.selectedStops.set([]);
      this.associationOpen.set(false);
      this.detailLoading.set(false);
      return;
    }

    const requestVersion = ++this.detailRequestVersion;
    this.selectedRoute.set(route);
    this.selectedStops.set([]);
    this.associationOpen.set(false);
    this.detailLoading.set(true);
    this.service.routeStops(route.id).subscribe({
      next: (items) => {
        if (requestVersion !== this.detailRequestVersion || this.selectedRoute()?.id !== route.id) return;
        this.selectedStops.set(items);
        this.routeStopCounts.update((counts) => new Map(counts).set(route.id, items.length));
        this.detailLoading.set(false);
      },
      error: (error: unknown) => {
        if (requestVersion !== this.detailRequestVersion || this.selectedRoute()?.id !== route.id) return;
        this.errorMessage.set(coordinatorErrorMessage(error));
        this.detailLoading.set(false);
      },
    });
  }
  openAssociation(): void { this.associationForm.reset({ stopId: 0, stopOrder: Math.max(0, ...this.selectedStops().map((item) => item.stopOrder)) + 1, estimatedMinutesFromStart: 0, active: true }); this.associationOpen.set(true); }
  addAssociation(): void { const route = this.selectedRoute(); if (!route || this.associationForm.invalid) { this.associationForm.markAllAsTouched(); return; } this.saving.set(true); this.service.createRouteStop({ routeId: route.id, ...this.associationForm.getRawValue() }).pipe(finalize(() => this.saving.set(false))).subscribe({ next: (saved) => { this.selectedStops.update((items) => [...items, saved]); this.associationOpen.set(false); this.routeStopCounts.update((counts) => new Map(counts).set(route.id, this.selectedStops().length)); this.notice.set('Paradero asociado correctamente.'); }, error: (error: unknown) => this.errorMessage.set(coordinatorErrorMessage(error)) }); }
  move(item: RouteStopAdmin, direction: -1 | 1): void { const ordered = this.orderedSelectedStops(); const index = ordered.findIndex((current) => current.id === item.id); const other = ordered[index + direction]; if (!other) return; const first = { ...item, stopOrder: other.stopOrder }; const second = { ...other, stopOrder: item.stopOrder }; forkJoin([this.service.updateRouteStop(item.id, routeStopRequest(first)), this.service.updateRouteStop(other.id, routeStopRequest(second))]).subscribe({ next: ([updated, swapped]) => this.selectedStops.update((items) => items.map((current) => current.id === updated.id ? updated : current.id === swapped.id ? swapped : current)), error: (error: unknown) => this.errorMessage.set(coordinatorErrorMessage(error)) }); }
  institutionName(id: number): string { const item = this.institutions().find((institution) => institution.id === id); return item ? `${item.name}${item.campusName ? ' — ' + item.campusName : ''}` : 'Institución no disponible'; }
  stop(id: number): StopAdmin | undefined { return this.stops().find((item) => item.id === id); }
  scheduleCount(id: number): number { return this.schedules().filter((item) => item.routeId === id).length; }
  onSearch(event: Event): void { this.query.set((event.target as HTMLInputElement).value); }
}
function routeStopRequest(item: RouteStopAdmin) { return { routeId: item.routeId, stopId: item.stopId, stopOrder: item.stopOrder, estimatedMinutesFromStart: item.estimatedMinutesFromStart, active: item.active }; }
function normalize(value: string): string { return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
