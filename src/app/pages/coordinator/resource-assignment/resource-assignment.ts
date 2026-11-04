import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize, forkJoin } from 'rxjs';
import { ApiErrorResponse } from '../../../core/models/auth.models';
import { CoordinatorTrip, DriverAdmin, ReassignmentDriverOption, ReassignmentOptions, ReassignmentVehicleOption, RouteAdmin, TripAssignmentRequest, TripReassignmentRequest, VehicleAdmin } from '../../../core/models/coordinator.models';
import { CoordinatorService, coordinatorErrorMessage } from '../../../core/services/coordinator.service';

@Component({
  selector: 'app-resource-assignment',
  standalone: true,
  imports: [ReactiveFormsModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './resource-assignment.html',
  styleUrl: './resource-assignment.css',
})
export class ResourceAssignment {
  private readonly service = inject(CoordinatorService);
  private readonly fb = inject(FormBuilder);

  readonly trips = signal<CoordinatorTrip[]>([]);
  readonly routes = signal<RouteAdmin[]>([]);
  readonly drivers = signal<DriverAdmin[]>([]);
  readonly vehicles = signal<VehicleAdmin[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly assignmentError = signal('');
  readonly notice = signal('');
  readonly selectedTrip = signal<CoordinatorTrip | null>(null);
  readonly confirmationOpen = signal(false);
  readonly reassignmentTrip = signal<CoordinatorTrip | null>(null);
  readonly reassignmentOptions = signal<ReassignmentOptions | null>(null);
  readonly optionsLoading = signal(false);
  readonly reassignmentError = signal('');
  readonly reassignmentConfirmationOpen = signal(false);

  readonly scheduledTrips = computed(() => this.trips()
    .filter((trip) => trip.status === 'SCHEDULED')
    .sort((left, right) => left.scheduledStartAt.localeCompare(right.scheduledStartAt)));
  readonly manageableTrips = computed(() => this.trips()
    .filter((trip) => trip.status !== 'COMPLETED' && trip.status !== 'CANCELLED')
    .sort((left, right) => left.scheduledStartAt.localeCompare(right.scheduledStartAt)));
  readonly eligibleDrivers = computed(() => this.drivers().filter((driver) =>
    driver.authorizationStatus === 'AUTHORIZED'
    && driver.operationalStatus === 'AVAILABLE'
    && !!driver.licenseExpiration
    && driver.licenseExpiration >= today(),
  ));
  readonly eligibleVehicles = computed(() => this.vehicles().filter((vehicle) =>
    vehicle.authorizationStatus === 'AUTHORIZED' && vehicle.operationalStatus === 'AVAILABLE',
  ));
  readonly form = this.fb.group({
    driverId: this.fb.control<number | null>(null, Validators.required),
    vehicleId: this.fb.control<number | null>(null, Validators.required),
  });
  readonly reassignmentForm = this.fb.group({
    driverId: this.fb.control<number | null>(null),
    vehicleId: this.fb.control<number | null>(null),
  });

  constructor() { this.load(); }

  load(preserveSelection = false): void {
    const selectedId = preserveSelection ? this.selectedTrip()?.id : null;
    if (!preserveSelection) this.loading.set(true);
    this.errorMessage.set('');
    forkJoin({ trips: this.service.trips(), routes: this.service.routes(), drivers: this.service.drivers(), vehicles: this.service.vehicles() })
      .pipe(finalize(() => { if (!preserveSelection) this.loading.set(false); }))
      .subscribe({
        next: ({ trips, routes, drivers, vehicles }) => {
          this.trips.set(trips); this.routes.set(routes); this.drivers.set(drivers); this.vehicles.set(vehicles);
          if (selectedId !== null) this.selectedTrip.set(trips.find((trip) => trip.id === selectedId) ?? null);
        },
        error: (error: unknown) => this.errorMessage.set(coordinatorErrorMessage(error)),
      });
  }

  openAssignment(trip: CoordinatorTrip): void {
    if (!this.canAssign(trip)) return;
    this.closeReassignment();
    this.selectedTrip.set(trip);
    this.form.reset({ driverId: null, vehicleId: null });
    this.assignmentError.set(''); this.notice.set(''); this.confirmationOpen.set(false);
  }

  closeAssignment(): void {
    if (this.saving()) return;
    this.selectedTrip.set(null); this.confirmationOpen.set(false); this.form.reset(); this.assignmentError.set('');
  }

  reviewAssignment(): void {
    if (this.form.invalid || !this.selectedTrip()) { this.form.markAllAsTouched(); return; }
    this.assignmentError.set(''); this.confirmationOpen.set(true);
  }

  confirmAssignment(): void {
    const trip = this.selectedTrip();
    const request = this.form.getRawValue();
    if (this.saving() || !trip || request.driverId === null || request.vehicleId === null) return;
    const body: TripAssignmentRequest = { driverId: request.driverId, vehicleId: request.vehicleId };
    this.saving.set(true); this.assignmentError.set('');
    this.service.assignTripResources(trip.id, body).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (saved) => {
        this.trips.update((items) => items.map((item) => item.id === saved.id ? saved : item));
        this.selectedTrip.set(null); this.confirmationOpen.set(false); this.form.reset();
        this.notice.set('Recursos asignados correctamente.');
      },
      error: (error: unknown) => {
        this.confirmationOpen.set(false);
        this.assignmentError.set(assignmentErrorMessage(error));
        if (error instanceof HttpErrorResponse && error.status === 409) this.load(true);
      },
    });
  }

  openReassignment(trip: CoordinatorTrip): void {
    if (!this.canReassign(trip)) return;
    this.closeAssignment();
    this.reassignmentTrip.set(trip); this.reassignmentOptions.set(null);
    this.reassignmentForm.reset({ driverId: null, vehicleId: null });
    this.reassignmentError.set(''); this.notice.set(''); this.reassignmentConfirmationOpen.set(false);
    this.loadReassignmentOptions(trip.id);
  }

  loadReassignmentOptions(tripId = this.reassignmentTrip()?.id): void {
    if (tripId === undefined) return;
    this.optionsLoading.set(true); this.reassignmentError.set('');
    this.service.reassignmentOptions(tripId).pipe(finalize(() => this.optionsLoading.set(false))).subscribe({
      next: (options) => this.reassignmentOptions.set(options),
      error: (error: unknown) => this.reassignmentError.set(reassignmentErrorMessage(error)),
    });
  }

  closeReassignment(): void {
    if (this.saving()) return;
    this.reassignmentTrip.set(null); this.reassignmentOptions.set(null);
    this.reassignmentConfirmationOpen.set(false); this.reassignmentForm.reset(); this.reassignmentError.set('');
  }

  reviewReassignment(): void {
    if (!this.hasReassignmentSelection() || !this.reassignmentTrip()) {
      this.reassignmentError.set('Selecciona al menos un conductor o vehículo diferente.'); return;
    }
    this.reassignmentError.set(''); this.reassignmentConfirmationOpen.set(true);
  }

  confirmReassignment(): void {
    const trip = this.reassignmentTrip(); const value = this.reassignmentForm.getRawValue();
    if (this.saving() || !trip || (value.driverId === null && value.vehicleId === null)) return;
    const body: TripReassignmentRequest = { driverId: value.driverId, vehicleId: value.vehicleId };
    this.saving.set(true); this.reassignmentError.set('');
    this.service.reassignTripResources(trip.id, body).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (saved) => {
        this.trips.update((items) => items.map((item) => item.id === saved.id ? saved : item));
        this.reassignmentTrip.set(null); this.reassignmentOptions.set(null);
        this.reassignmentConfirmationOpen.set(false); this.reassignmentForm.reset();
        this.notice.set('Recursos reasignados correctamente.');
      },
      error: (error: unknown) => {
        this.reassignmentConfirmationOpen.set(false);
        this.reassignmentError.set(reassignmentErrorMessage(error));
        if (error instanceof HttpErrorResponse && error.status === 409) {
          this.load(true); this.loadReassignmentOptions(trip.id);
        }
      },
    });
  }

  canAssign(trip: CoordinatorTrip): boolean { return trip.status === 'SCHEDULED' && trip.driverId === null && trip.vehicleId === null; }
  canReassign(trip: CoordinatorTrip): boolean { return trip.status !== 'COMPLETED' && trip.status !== 'CANCELLED' && (trip.driverId !== null || trip.vehicleId !== null); }
  hasCompleteAssignment(trip: CoordinatorTrip): boolean { return trip.driverId !== null && trip.vehicleId !== null; }
  hasReassignmentSelection(): boolean { return this.reassignmentForm.controls.driverId.value !== null || this.reassignmentForm.controls.vehicleId.value !== null; }
  routeFor(trip: CoordinatorTrip): RouteAdmin | null { return this.routes().find((route) => route.id === trip.routeId) ?? null; }
  driverName(id: number | null): string { return id === null ? 'Sin conductor' : this.drivers().find((driver) => driver.id === id)?.fullName ?? `Conductor #${id}`; }
  vehicleName(id: number | null): string { return id === null ? 'Sin vehículo' : this.vehicles().find((vehicle) => vehicle.id === id)?.plate ?? `Vehículo #${id}`; }
  selectedDriver(): DriverAdmin | null { return this.drivers().find((driver) => driver.id === this.form.controls.driverId.value) ?? null; }
  selectedVehicle(): VehicleAdmin | null { return this.vehicles().find((vehicle) => vehicle.id === this.form.controls.vehicleId.value) ?? null; }
  selectedReplacementDriver(): ReassignmentDriverOption | null { return this.reassignmentOptions()?.drivers.find((driver) => driver.driverId === this.reassignmentForm.controls.driverId.value) ?? null; }
  selectedReplacementVehicle(): ReassignmentVehicleOption | null { return this.reassignmentOptions()?.vehicles.find((vehicle) => vehicle.vehicleId === this.reassignmentForm.controls.vehicleId.value) ?? null; }
  statusLabel(status: CoordinatorTrip['status']): string { return ({ SCHEDULED: 'Programado', BOARDING: 'En abordaje', IN_PROGRESS: 'En curso', COMPLETED: 'Completado', CANCELLED: 'Cancelado' } as const)[status]; }
  formatDate(value: string): string { return new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
}

function today(): string { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date()); }

export function assignmentErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'No se pudo completar la asignación. Inténtalo nuevamente.';
  if (error.status === 0) return 'No se pudo conectar con WayraPass. Verifica que el backend esté disponible.';
  if (error.status === 401) return 'Tu sesión venció. Vuelve a iniciar sesión.';
  if (error.status === 403) return 'Tu cuenta no tiene permiso para asignar recursos.';
  if (error.status === 404) return 'El viaje o recurso seleccionado ya no existe.';
  const response = error.error as ApiErrorResponse | null;
  const message = response && typeof response === 'object' ? response.message ?? '' : '';
  if (error.status === 409) {
    if (message.toLowerCase().includes('ya tiene recursos')) return 'Este viaje ya cuenta con recursos asignados.';
    return 'El conductor o vehículo seleccionado ya no está disponible. Se actualizaron los candidatos.';
  }
  if (error.status === 400) return message || 'El viaje o los recursos seleccionados no admiten esta asignación.';
  return coordinatorErrorMessage(error);
}

export function reassignmentErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'No se pudo completar la reasignación. Inténtalo nuevamente.';
  if (error.status === 0) return 'No se pudo conectar con WayraPass. Verifica que el backend esté disponible.';
  if (error.status === 401) return 'Tu sesión venció. Vuelve a iniciar sesión.';
  if (error.status === 403) return 'Tu cuenta no tiene permiso para reasignar recursos.';
  if (error.status === 404) return 'El viaje o recurso seleccionado ya no existe.';
  const response = error.error as ApiErrorResponse | null;
  const message = response && typeof response === 'object' ? response.message ?? '' : '';
  if (error.status === 409) return 'El conductor o vehículo seleccionado ya no está disponible. Se actualizaron las alternativas.';
  if (error.status === 400) return message || 'El viaje o los recursos seleccionados no admiten esta reasignación.';
  return coordinatorErrorMessage(error);
}
