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
    scheduledStartAt: this.fb.nonNullable.control('', Validators.required),
    scheduledEndAt: this.fb.nonNullable.control('', Validators.required),
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
    this.createError.set(''); this.notice.set(''); this.createForm.reset({ routeId: 0, routeScheduleId: null, scheduledStartAt: '', scheduledEndAt: '' }); this.createOpen.set(true);
  }
  closeCreate(): void { if (!this.creating()) { this.createOpen.set(false); this.createError.set(''); } }
  routeChanged(): void { this.createForm.controls.routeScheduleId.setValue(null); }
  schedulesForSelectedRoute(): RouteScheduleAdmin[] {
    const routeId = this.createForm.controls.routeId.value;
    return this.schedules().filter((schedule) => schedule.active && schedule.routeId === routeId);
  }
  createTrip(): void {
    if (this.creating()) return;
    const value = this.createForm.getRawValue(); const validation = this.validateTrip(value.scheduledStartAt, value.scheduledEndAt);
    if (this.createForm.invalid || value.routeId < 1 || validation) { this.createForm.markAllAsTouched(); this.createError.set(validation || 'Completa los campos obligatorios.'); return; }
    if (value.routeScheduleId !== null && !this.schedulesForSelectedRoute().some((schedule) => schedule.id === value.routeScheduleId)) { this.createError.set('El horario seleccionado no pertenece a la ruta o ya no está activo.'); return; }
    const request: TripCreateRequest = { routeId: value.routeId, routeScheduleId: value.routeScheduleId, driverId: null, vehicleId: null, scheduledStartAt: limaInstant(value.scheduledStartAt), scheduledEndAt: limaInstant(value.scheduledEndAt) };
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
