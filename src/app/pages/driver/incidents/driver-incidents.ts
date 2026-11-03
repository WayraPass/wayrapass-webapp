import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';
import { DriverTrip } from '../../../core/models/driver.models';
import { IncidentPriority, IncidentResponse, IncidentStatus, IncidentType } from '../../../core/models/incident.models';
import { TripStatus } from '../../../core/models/trip.models';
import { DriverService, driverErrorMessage } from '../../../core/services/driver.service';
import { IncidentService, incidentErrorMessage } from '../../../core/services/incident.service';

const OPERATIONAL_STATUSES: TripStatus[] = ['BOARDING', 'IN_PROGRESS'];

@Component({
  selector: 'app-driver-incidents',
  standalone: true,
  imports: [ReactiveFormsModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './driver-incidents.html',
  styleUrl: './driver-incidents.css',
})
export class DriverIncidents {
  private readonly drivers = inject(DriverService);
  private readonly incidents = inject(IncidentService);
  private readonly fb = inject(FormBuilder);

  readonly descriptionLimit = 1000;
  readonly tripLoading = signal(true);
  readonly submitting = signal(false);
  readonly eligibleTrips = signal<DriverTrip[]>([]);
  readonly tripError = signal('');
  readonly submitError = signal('');
  readonly successMessage = signal('');
  readonly createdIncident = signal<IncidentResponse | null>(null);
  readonly incidentTypes: ReadonlyArray<{ value: IncidentType; label: string }> = [
    { value: 'TRAFFIC_DELAY', label: 'Demora por tráfico' },
    { value: 'DETOUR', label: 'Desvío de ruta' },
    { value: 'VEHICLE_FAILURE', label: 'Falla del vehículo' },
    { value: 'STOP_UNAVAILABLE', label: 'Paradero no disponible' },
    { value: 'OTHER', label: 'Otra incidencia' },
  ];
  readonly priorities: ReadonlyArray<{ value: IncidentPriority; label: string }> = [
    { value: 'NORMAL', label: 'Normal' },
    { value: 'HIGH', label: 'Alta' },
    { value: 'CRITICAL', label: 'Crítica' },
  ];
  readonly form = this.fb.group({
    tripId: this.fb.control<number | null>(null, Validators.required),
    type: this.fb.nonNullable.control<IncidentType | ''>('', Validators.required),
    description: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(this.descriptionLimit), trimmedRequired]),
    delayMinutes: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0)]),
    priority: this.fb.nonNullable.control<IncidentPriority>('NORMAL', Validators.required),
  });

  constructor() { this.loadTrips(); }

  loadTrips(): void {
    this.tripLoading.set(true);
    this.tripError.set('');
    this.drivers.getTrips().pipe(finalize(() => this.tripLoading.set(false))).subscribe({
      next: (trips) => this.eligibleTrips.set(trips.filter((trip) => OPERATIONAL_STATUSES.includes(trip.status))),
      error: (error: unknown) => this.tripError.set(driverErrorMessage(error)),
    });
  }

  submit(): void {
    if (this.submitting()) return;
    const description = this.form.controls.description.value.trim();
    this.form.controls.description.setValue(description);
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const value = this.form.getRawValue();
    this.submitting.set(true);
    this.submitError.set('');
    this.successMessage.set('');
    this.createdIncident.set(null);
    this.incidents.create({
      tripId: value.tripId!,
      type: value.type as IncidentType,
      description,
      delayMinutes: value.delayMinutes,
      priority: value.priority,
    }).pipe(finalize(() => this.submitting.set(false))).subscribe({
      next: (incident) => {
        this.createdIncident.set(incident);
        this.successMessage.set('Incidencia registrada correctamente.');
        this.form.reset({ tripId: null, type: '', description: '', delayMinutes: 0, priority: 'NORMAL' });
      },
      error: (error: unknown) => this.submitError.set(incidentErrorMessage(error)),
    });
  }

  statusLabel(status: TripStatus): string {
    return ({ SCHEDULED: 'Programado', BOARDING: 'En embarque', IN_PROGRESS: 'En curso', COMPLETED: 'Finalizado', CANCELLED: 'Cancelado' } as const)[status];
  }

  typeLabel(type: IncidentType): string {
    return this.incidentTypes.find((item) => item.value === type)?.label ?? type;
  }

  priorityLabel(priority: IncidentPriority): string {
    return this.priorities.find((item) => item.value === priority)?.label ?? priority;
  }

  incidentStatusLabel(status: IncidentStatus): string {
    return status === 'OPEN' ? 'Abierta' : 'Resuelta';
  }

  dateTimeLabel(value: string): string {
    return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  }
}

function trimmedRequired(control: AbstractControl<string>): ValidationErrors | null {
  return control.value.trim() ? null : { required: true };
}
