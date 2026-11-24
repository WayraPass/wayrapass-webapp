import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize, forkJoin } from 'rxjs';
import { ApiErrorResponse } from '../../../core/models/auth.models';
import { CoordinatorTripStatus, RouteAdmin, RouteScheduleAdmin, TripCreateRequest, WeeklyOperation } from '../../../core/models/coordinator.models';
import { CoordinatorService, coordinatorErrorMessage } from '../../../core/services/coordinator.service';

interface CalendarDay { date: string; weekday: string; dayLabel: string; operations: WeeklyOperation[]; }
type TripScheduleMode = 'ROUTE_SCHEDULE' | 'CUSTOM';

@Component({
  selector: 'app-operations-calendar',
  standalone: true,
  imports: [ReactiveFormsModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './operations-calendar.html',
  styleUrl: './operations-calendar.css',
})
export class OperationsCalendar {
  private readonly service = inject(CoordinatorService);
  private readonly fb = inject(FormBuilder);
  readonly weekStart = signal(mondayFor(todayInLima()));
  readonly operations = signal<WeeklyOperation[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly routes = signal<RouteAdmin[]>([]);
  readonly schedules = signal<RouteScheduleAdmin[]>([]);
  readonly catalogsLoading = signal(true);
  readonly catalogError = signal('');
  readonly createOpen = signal(false);
  readonly creating = signal(false);
  readonly createError = signal('');
  readonly notice = signal('');
  readonly activeRoutes = computed(() => this.routes().filter((route) => route.status === 'ACTIVE'));
  readonly createForm = this.fb.group({
    routeId: this.fb.nonNullable.control(0, [Validators.required, Validators.min(1)]),
    routeScheduleId: this.fb.control<number | null>(null),
    scheduledStartAt: this.fb.nonNullable.control(''),
    scheduledEndAt: this.fb.nonNullable.control(''),
    scheduleMode: this.fb.nonNullable.control<TripScheduleMode>('ROUTE_SCHEDULE'),
  });
  readonly fromDate = computed(() => dateValue(this.weekStart()));
  readonly toDate = computed(() => dateValue(addDays(this.weekStart(), 6)));
  readonly periodLabel = computed(() => `${formatCalendarDate(this.weekStart())} — ${formatCalendarDate(addDays(this.weekStart(), 6))}`);
  readonly days = computed<CalendarDay[]>(() => Array.from({ length: 7 }, (_, index) => {
    const date = addDays(this.weekStart(), index); const value = dateValue(date);
    return {
      date: value,
      weekday: new Intl.DateTimeFormat('es-PE', { weekday: 'long' }).format(date),
      dayLabel: new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short' }).format(date),
      operations: this.operations().filter((operation) => operation.operationDate === value),
    };
  }));

  constructor() { this.load(); this.loadCatalogs(); }

  load(): void {
    this.loading.set(true); this.errorMessage.set('');
    this.service.weeklyCalendar(this.fromDate(), this.toDate()).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (operations) => this.operations.set(operations),
      error: (error: unknown) => this.errorMessage.set(coordinatorErrorMessage(error)),
    });
  }

  previousWeek(): void { this.weekStart.set(addDays(this.weekStart(), -7)); this.load(); }
  nextWeek(): void { this.weekStart.set(addDays(this.weekStart(), 7)); this.load(); }
  currentWeek(): void { this.weekStart.set(mondayFor(todayInLima())); this.load(); }
  loadCatalogs(): void {
    this.catalogsLoading.set(true); this.catalogError.set('');
    forkJoin({ routes: this.service.routes(), schedules: this.service.schedules() }).pipe(finalize(() => this.catalogsLoading.set(false))).subscribe({
      next: ({ routes, schedules }) => { this.routes.set(routes); this.schedules.set(schedules); },
      error: (error: unknown) => this.catalogError.set(coordinatorErrorMessage(error)),
    });
  }
  openCreate(): void {
    this.createError.set(''); this.notice.set('');
    this.createForm.reset({ routeId: 0, routeScheduleId: null, scheduledStartAt: '', scheduledEndAt: '', scheduleMode: 'ROUTE_SCHEDULE' });
    this.updateModeValidators('ROUTE_SCHEDULE'); this.createOpen.set(true);
  }
  closeCreate(): void { if (!this.creating()) { this.createOpen.set(false); this.createError.set(''); } }
  routeChanged(): void { this.createForm.controls.routeScheduleId.setValue(null); }
  scheduleModeChanged(mode: TripScheduleMode): void {
    this.createForm.controls.scheduleMode.setValue(mode);
    this.updateModeValidators(mode);
    this.createError.set('');
  }
  schedulesForSelectedRoute(): RouteScheduleAdmin[] {
    const routeId = this.createForm.controls.routeId.value;
    return this.schedules().filter((schedule) => schedule.active && schedule.routeId === routeId);
  }
  createTrip(): void {
    if (this.creating()) return;
    const value = this.createForm.getRawValue();
    if (value.routeId < 1) { this.createForm.markAllAsTouched(); this.createError.set('Selecciona una ruta activa.'); return; }

    let routeScheduleId: number | null = null;
    let scheduledStartAt = value.scheduledStartAt;
    let scheduledEndAt = value.scheduledEndAt;

    if (value.scheduleMode === 'ROUTE_SCHEDULE') {
      const schedule = this.schedulesForSelectedRoute().find((item) => item.id === value.routeScheduleId);
      if (!schedule) { this.createForm.markAllAsTouched(); this.createError.set('Selecciona un horario de ruta activo.'); return; }
      if (!schedule.estimatedArrivalTime) { this.createError.set('El horario seleccionado no tiene una hora estimada de llegada.'); return; }
      ({ scheduledStartAt, scheduledEndAt } = this.dateTimesForSchedule(schedule));
      routeScheduleId = schedule.id;
    } else {
      const validation = this.validateTrip(scheduledStartAt, scheduledEndAt);
      if (this.createForm.invalid || validation) { this.createForm.markAllAsTouched(); this.createError.set(validation || 'Completa los campos obligatorios.'); return; }
    }

    const validation = this.validateTrip(scheduledStartAt, scheduledEndAt);
    if (validation) { this.createError.set(validation); return; }

    const request: TripCreateRequest = { routeId: value.routeId, routeScheduleId, driverId: null, vehicleId: null, scheduledStartAt: limaInstant(scheduledStartAt), scheduledEndAt: limaInstant(scheduledEndAt) };
    this.creating.set(true); this.createError.set('');
    this.service.createTrip(request).pipe(finalize(() => this.creating.set(false))).subscribe({
      next: (trip) => {
        const operationDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date(trip.scheduledStartAt));
        this.weekStart.set(mondayFor(operationDate)); this.createOpen.set(false); this.createForm.reset();
        this.notice.set('Viaje creado correctamente. Ya puedes asignarle conductor y vehículo.'); this.load();
      },
      error: (error: unknown) => this.createError.set(tripCreationErrorMessage(error)),
    });
  }
  routeLabel(route: RouteAdmin): string { return `${route.code} — ${route.origin} a ${route.destination}`; }
  scheduleLabel(schedule: RouteScheduleAdmin): string { return `${dayLabel(schedule.dayOfWeek)} · ${schedule.departureTime.slice(0, 5)}${schedule.estimatedArrivalTime ? ` a ${schedule.estimatedArrivalTime.slice(0, 5)}` : ''}`; }
  statusLabel(status: CoordinatorTripStatus): string { return ({ SCHEDULED: 'Programado', BOARDING: 'En abordaje', IN_PROGRESS: 'En curso', COMPLETED: 'Completado', CANCELLED: 'Cancelado' } as const)[status]; }
  statusClass(status: CoordinatorTripStatus): string { return status.toLowerCase().replace('_', '-'); }
  time(value: string): string { return new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', hour: 'numeric', minute: '2-digit' }).format(new Date(value)); }
  private validateTrip(start: string, end: string): string {
    if (!start || !end) return 'Indica la fecha y hora de inicio y fin.';
    const startInstant = parseLimaDateTime(start); const endInstant = parseLimaDateTime(end);
    if (Number.isNaN(startInstant.getTime()) || Number.isNaN(endInstant.getTime())) return 'Las fechas ingresadas no son válidas.';
    if (startInstant.getTime() < Date.now()) return 'El inicio debe ser actual o futuro.';
    if (endInstant.getTime() <= startInstant.getTime()) return 'La fecha y hora de fin debe ser posterior al inicio.';
    return '';
  }
  private updateModeValidators(mode: TripScheduleMode): void {
    const schedule = this.createForm.controls.routeScheduleId;
    const start = this.createForm.controls.scheduledStartAt;
    const end = this.createForm.controls.scheduledEndAt;
    if (mode === 'ROUTE_SCHEDULE') {
      schedule.setValidators(Validators.required);
      start.clearValidators(); end.clearValidators();
      start.setValue(''); end.setValue('');
    } else {
      schedule.clearValidators(); schedule.setValue(null);
      start.setValidators(Validators.required); end.setValidators(Validators.required);
    }
    schedule.updateValueAndValidity(); start.updateValueAndValidity(); end.updateValueAndValidity();
  }
  private dateTimesForSchedule(schedule: RouteScheduleAdmin): { scheduledStartAt: string; scheduledEndAt: string } {
    const dayOffset = ({ MONDAY: 0, TUESDAY: 1, WEDNESDAY: 2, THURSDAY: 3, FRIDAY: 4, SATURDAY: 5, SUNDAY: 6 } as const)[schedule.dayOfWeek];
    const startDate = addDays(this.weekStart(), dayOffset);
    const endDate = schedule.estimatedArrivalTime! <= schedule.departureTime ? addDays(startDate, 1) : startDate;
    return {
      scheduledStartAt: `${dateValue(startDate)}T${schedule.departureTime.slice(0, 5)}`,
      scheduledEndAt: `${dateValue(endDate)}T${schedule.estimatedArrivalTime!.slice(0, 5)}`,
    };
  }
}

function todayInLima(): string { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date()); }
function parseDate(value: string): Date { const [year, month, day] = value.split('-').map(Number); return new Date(year!, month! - 1, day!, 12); }
function mondayFor(value: string): Date { const date = parseDate(value); const offset = (date.getDay() + 6) % 7; return addDays(date, -offset); }
function addDays(value: Date, days: number): Date { const copy = new Date(value); copy.setDate(copy.getDate() + days); return copy; }
function dateValue(value: Date): string { const year = value.getFullYear(); const month = String(value.getMonth() + 1).padStart(2, '0'); const day = String(value.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`; }
function formatCalendarDate(value: Date): string { return new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }).format(value); }
function parseLimaDateTime(value: string): Date { return new Date(`${value.length === 16 ? value + ':00' : value}-05:00`); }
function limaInstant(value: string): string { return parseLimaDateTime(value).toISOString(); }
function dayLabel(value: RouteScheduleAdmin['dayOfWeek']): string { return ({ MONDAY: 'Lunes', TUESDAY: 'Martes', WEDNESDAY: 'Miércoles', THURSDAY: 'Jueves', FRIDAY: 'Viernes', SATURDAY: 'Sábado', SUNDAY: 'Domingo' } as const)[value]; }

export function tripCreationErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'No se pudo crear el viaje. Inténtalo nuevamente.';
  if (error.status === 0) return 'No se pudo conectar con WayraPass. Verifica que el backend esté disponible.';
  if (error.status === 401) return 'Tu sesión venció. Vuelve a iniciar sesión.';
  if (error.status === 403) return 'Tu cuenta no tiene permiso para crear viajes.';
  const response = error.error as ApiErrorResponse | null; const message = response && typeof response === 'object' ? response.message ?? '' : '';
  if (error.status === 404) return message || 'La ruta o el horario seleccionado ya no existe.';
  if (error.status === 409) return message || 'El viaje entra en conflicto con otra operación.';
  if (error.status === 400) return message || 'Revisa la ruta, el horario y las fechas del viaje.';
  return coordinatorErrorMessage(error);
}
