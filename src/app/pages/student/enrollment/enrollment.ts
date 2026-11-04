import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, Observable, of } from 'rxjs';
import { CurrentEnrollment, EnrollmentStatus } from '../../../core/models/enrollment.models';
import { GroupedRouteSearch, GroupedRouteStop } from '../../../core/models/route.models';
import { EnrollmentService, enrollmentErrorMessage, enrollmentStatusErrorMessage } from '../../../core/services/enrollment.service';
import { RouteService, routeErrorMessage } from '../../../core/services/route.service';

@Component({ selector: 'app-student-enrollment', standalone: true, imports: [ReactiveFormsModule, RouterLink, MatIconModule, MatProgressSpinnerModule], templateUrl: './enrollment.html', styleUrls: ['./enrollment.css', './enrollment-suspension.css'] })
export class StudentEnrollment {
  private readonly enrollments = inject(EnrollmentService);
  private readonly routesService = inject(RouteService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly routes = signal<GroupedRouteSearch[]>([]);
  readonly current = signal<CurrentEnrollment | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editing = signal(false);
  readonly suspensionOpen = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly selectedRouteId = signal(0);
  readonly selectedStopId = signal(0);
  readonly form = this.fb.nonNullable.group({ routeId: 0, stopId: 0 });
  readonly today = localDate();
  readonly suspensionForm = this.fb.nonNullable.group({
    startDate: [this.today, Validators.required],
    endDate: ['', Validators.required],
  });

  readonly currentRoute = computed(() => this.routes().find((route) => route.routeId === this.current()?.routeId) ?? null);
  readonly currentStop = computed(() => this.currentRoute()?.stops.find((stop) => stop.id === this.current()?.stopId) ?? null);
  readonly selectedRoute = computed(() => this.routes().find((route) => route.routeId === this.selectedRouteId()) ?? null);
  readonly selectedStop = computed(() => this.selectedRoute()?.stops.find((stop) => stop.id === this.selectedStopId()) ?? null);

  constructor() {
    this.observeSelection();
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    forkJoin({
      routes: this.routesService.searchGroupedRoutes(),
      current: this.enrollments.getCurrent().pipe(catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 404) return of(null);
        throw error;
      })),
    }).pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: ({ routes, current }) => {
        this.routes.set(routes);
        const active = current && current.status !== 'ENDED' ? current : null;
        this.current.set(active);
        const requestedRouteId = Number(this.route.snapshot.queryParamMap.get('routeId')) || 0;
        if (active) {
          const routeId = routes.some((item) => item.routeId === requestedRouteId) ? requestedRouteId : active.routeId;
          const stopId = routeId === active.routeId ? active.stopId : 0;
          this.setSelection(routeId, stopId);
          this.editing.set(routeId !== active.routeId);
        } else {
          this.setSelection(routes.some((item) => item.routeId === requestedRouteId) ? requestedRouteId : 0, 0);
          this.editing.set(true);
        }
      },
      error: (error: unknown) => this.errorMessage.set(routeErrorMessage(error)),
    });
  }

  startChange(): void {
    const current = this.current();
    if (!current) return;
    this.setSelection(current.routeId, current.stopId);
    this.editing.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  cancelChange(): void {
    const current = this.current();
    if (current) this.setSelection(current.routeId, current.stopId);
    this.editing.set(false);
    this.errorMessage.set('');
  }

  submit(): void {
    const selectedRoute = this.selectedRoute();
    const selectedStop = this.selectedStop();
    if (!selectedRoute || !selectedStop) {
      this.errorMessage.set('Selecciona una ruta y un paradero válido.');
      return;
    }
    const current = this.current();
    if (current?.routeId === selectedRoute.routeId && current.stopId === selectedStop.id) {
      this.errorMessage.set('Selecciona una ruta o paradero diferente al actual.');
      return;
    }

    const wasChange = Boolean(current);
    this.saving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.enrollments.enroll({ routeId: selectedRoute.routeId, stopId: selectedStop.id }).pipe(
      finalize(() => this.saving.set(false)),
    ).subscribe({
      next: (response) => {
        this.current.set({ enrollmentId: response.id, routeId: response.routeId, stopId: response.stopId, status: response.status, suspendedFrom: null, suspendedUntil: null });
        this.setSelection(response.routeId, response.stopId);
        this.editing.set(false);
        this.successMessage.set(wasChange ? 'Tu inscripción fue actualizada correctamente.' : 'Inscripción registrada correctamente.');
      },
      error: (error: unknown) => this.errorMessage.set(enrollmentErrorMessage(error)),
    });
  }

  openSuspension(): void {
    this.suspensionForm.setValue({ startDate: this.today, endDate: '' });
    this.suspensionOpen.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  closeSuspension(): void {
    if (this.saving()) return;
    this.suspensionOpen.set(false);
    this.suspensionForm.reset({ startDate: this.today, endDate: '' });
  }

  suspend(): void {
    const request = this.suspensionForm.getRawValue();
    if (this.suspensionForm.invalid || request.startDate !== this.today) {
      this.errorMessage.set('La suspensión debe comenzar hoy y debe incluir una fecha final.');
      return;
    }
    if (request.endDate <= request.startDate) {
      this.errorMessage.set('La fecha final debe ser posterior a la fecha de inicio.');
      return;
    }
    this.updateStatus(
      this.enrollments.suspend(request),
      'Tu inscripción quedó suspendida temporalmente.',
      true,
    );
  }

  reactivate(): void {
    this.updateStatus(
      this.enrollments.reactivate(),
      'Tu inscripción fue reactivada correctamente.',
      false,
    );
  }

  statusLabel(status: EnrollmentStatus): string {
    return ({ ACTIVE: 'Activa', SUSPENDED: 'Suspendida', ENDED: 'Finalizada' } as const)[status];
  }

  stopLabel(stop: GroupedRouteStop, route: GroupedRouteSearch): string {
    return stop.id === route.stops.at(-1)?.id ? `${stop.name} · destino final` : stop.name;
  }

  dateLabel(value: string | null): string {
    if (!value) return '';
    return new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })
      .format(new Date(`${value}T12:00:00`));
  }

  private updateStatus(request: Observable<CurrentEnrollment>, success: string, closePanel: boolean): void {
    this.saving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (enrollment) => {
        this.current.set(enrollment);
        if (closePanel) this.suspensionOpen.set(false);
        this.successMessage.set(success);
      },
      error: (error: unknown) => this.errorMessage.set(enrollmentStatusErrorMessage(error)),
    });
  }

  private observeSelection(): void {
    this.form.controls.routeId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((routeId) => {
      this.selectedRouteId.set(routeId);
      this.form.controls.stopId.setValue(0, { emitEvent: false });
      this.selectedStopId.set(0);
      this.errorMessage.set('');
    });
    this.form.controls.stopId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((stopId) => {
      this.selectedStopId.set(stopId);
      this.errorMessage.set('');
    });
  }

  private setSelection(routeId: number, stopId: number): void {
    this.form.setValue({ routeId, stopId }, { emitEvent: false });
    this.selectedRouteId.set(routeId);
    this.selectedStopId.set(stopId);
  }
}

function localDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
