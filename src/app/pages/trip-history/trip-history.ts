import { DatePipe } from '@angular/common';
import { Component, inject, Injector, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { FamilyTripHistoryDetail, LinkedStudent } from '../../core/models/family.models';
import { FamilyService, familyErrorMessage } from '../../core/services/family.service';
import {
  BoardingStatus,
  IncidentPriority,
  IncidentStatus,
  IncidentType,
  StudentTripHistoryDetail,
  TripHistoryItem,
  TripStatus,
} from '../../core/models/trip.models';
import { TripService, historyErrorMessage } from '../../core/services/trip.service';

@Component({
  selector: 'app-trip-history',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './trip-history.html',
  styleUrl: './trip-history.css',
})
export class TripHistory {
  private readonly fb = inject(FormBuilder);
  private readonly tripsService = inject(TripService);
  private readonly injector = inject(Injector);
  private readonly route = inject(ActivatedRoute, { optional: true });

  readonly familyMode = Boolean(this.route?.snapshot.data['familyMode']);
  readonly students = signal<LinkedStudent[]>([]);
  readonly selectedStudentId = signal<number | null>(null);

  readonly trips = signal<TripHistoryItem[]>([]);
  readonly selectedTripId = signal<number | null>(null);
  readonly detail = signal<StudentTripHistoryDetail | FamilyTripHistoryDetail | null>(null);
  readonly loading = signal(false);
  readonly detailLoading = signal(false);
  readonly errorMessage = signal('');
  readonly detailError = signal('');

  readonly filters = this.fb.nonNullable.group({
    from: isoDate(addDays(new Date(), -365)),
    to: isoDate(new Date()),
  });

  constructor() {
    if (this.familyMode) this.loadFamilyStudents();
    else this.loadHistory();
  }

  loadFamilyStudents(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.familyService.getLinkedStudents().subscribe({
      next: (students) => {
        this.students.set(students);
        if (students.length) this.selectStudent(students[0]!.studentId);
        else this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(familyErrorMessage(error));
      },
    });
  }

  selectStudent(studentId: number): void {
    this.selectedStudentId.set(studentId);
    this.selectedTripId.set(null);
    this.detail.set(null);
    this.loadHistory();
  }

  studentLabel(studentId: number): string {
    return this.students().find((student) => student.studentId === studentId)?.fullName ?? 'Estudiante vinculado';
  }

  loadHistory(): void {
    const { from, to } = this.filters.getRawValue();
    this.errorMessage.set('');
    if (!from || !to || from > to) {
      this.errorMessage.set('La fecha inicial no puede ser posterior a la fecha final.');
      return;
    }

    const studentId = this.selectedStudentId();
    if (this.familyMode && !studentId) return;

    this.loading.set(true);
    const request = this.familyMode
      ? this.familyService.getHistory(studentId!, from, to)
      : this.tripsService.getHistory(from, to);
    request.pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: (trips) => {
        this.trips.set(trips);
        const currentSelection = this.selectedTripId();
        const selected = trips.find((trip) => trip.tripId === currentSelection) ?? trips[0] ?? null;
        if (selected) this.selectTrip(selected);
        else {
          this.selectedTripId.set(null);
          this.detail.set(null);
        }
      },
      error: (error: unknown) => this.errorMessage.set(this.errorText(error)),
    });
  }

  selectTrip(trip: TripHistoryItem): void {
    this.selectedTripId.set(trip.tripId);
    this.detail.set(null);
    this.detailError.set('');
    this.detailLoading.set(true);
    const request = this.familyMode
      ? this.familyService.getHistoryDetail(this.selectedStudentId()!, trip.tripId)
      : this.tripsService.getHistoryDetail(trip.tripId);
    request.pipe(
      finalize(() => this.detailLoading.set(false)),
    ).subscribe({
      next: (detail) => this.detail.set(detail),
      error: (error: unknown) => this.detailError.set(this.errorText(error)),
    });
  }

  retryDetail(): void {
    const selected = this.trips().find((trip) => trip.tripId === this.selectedTripId());
    if (selected) this.selectTrip(selected);
  }

  retry(): void {
    if (this.familyMode && !this.students().length) this.loadFamilyStudents();
    else this.loadHistory();
  }

  tripStatusLabel(status: TripStatus): string {
    return ({ SCHEDULED: 'Programado', BOARDING: 'En embarque', IN_PROGRESS: 'En recorrido', COMPLETED: 'Finalizado', CANCELLED: 'Cancelado' } as const)[status];
  }

  boardingStatusLabel(status: BoardingStatus): string {
    return status === 'CONFIRMED' ? 'Abordaje confirmado' : 'Abordaje cancelado';
  }

  incidentTypeLabel(type: IncidentType): string {
    return ({ TRAFFIC_DELAY: 'Demora por tráfico', DETOUR: 'Desvío', VEHICLE_FAILURE: 'Falla del vehículo', STOP_UNAVAILABLE: 'Paradero no disponible', OTHER: 'Otra incidencia' } as const)[type];
  }

  incidentPriorityLabel(priority: IncidentPriority): string {
    return ({ NORMAL: 'Normal', HIGH: 'Alta', CRITICAL: 'Crítica' } as const)[priority];
  }

  incidentStatusLabel(status: IncidentStatus): string {
    return status === 'OPEN' ? 'Abierta' : 'Resuelta';
  }

  studentDetail(detail: StudentTripHistoryDetail | FamilyTripHistoryDetail): StudentTripHistoryDetail | null {
    return 'vehiclePlate' in detail ? detail : null;
  }

  private get familyService(): FamilyService {
    return this.injector.get(FamilyService);
  }

  private errorText(error: unknown): string {
    return this.familyMode ? familyErrorMessage(error, 'No se pudo consultar el historial.') : historyErrorMessage(error);
  }
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function isoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
