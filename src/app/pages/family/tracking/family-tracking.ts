import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError, finalize, forkJoin, of, throwError } from 'rxjs';
import { FamilyDriverCredential, FamilyUpcomingTrip, LinkedStudent, NotificationPreferences } from '../../../core/models/family.models';
import { FamilyService, familyErrorMessage } from '../../../core/services/family.service';
import { DriverCredentialCard } from '../driver-credential/driver-credential';

@Component({ selector: 'app-family-tracking', standalone: true, imports: [DatePipe, ReactiveFormsModule, MatIconModule, MatProgressSpinnerModule, DriverCredentialCard], templateUrl: './family-tracking.html', styleUrl: './family-tracking.css' })
export class FamilyTracking {
  private readonly family = inject(FamilyService);
  private readonly fb = inject(FormBuilder);
  readonly students = signal<LinkedStudent[]>([]);
  readonly selectedStudentId = signal<number | null>(null);
  readonly upcomingTrips = signal<FamilyUpcomingTrip[]>([]);
  readonly driver = signal<FamilyDriverCredential | null>(null);
  readonly preferences = signal<NotificationPreferences | null>(null);
  readonly initialLoading = signal(true);
  readonly studentDataLoading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly preferencesForm = this.fb.nonNullable.group({ notifyBoarding: false, notifyArrival: false, notifyDelay: false, notifyVehicleChange: false, notifyIncident: false });
  private selectionRequest = 0;

  constructor() { this.loadStudents(); }

  loadStudents(): void {
    this.initialLoading.set(true); this.errorMessage.set('');
    this.family.getLinkedStudents().subscribe({
      next: (students) => {
        this.students.set(students);
        this.initialLoading.set(false);
        if (!students.length) return;
        this.selectStudent(students[0]!.studentId);
      },
      error: (error: unknown) => { this.initialLoading.set(false); this.errorMessage.set(familyErrorMessage(error)); },
    });
  }

  selectStudent(studentId: number): void {
    const request = ++this.selectionRequest;
    this.selectedStudentId.set(studentId);
    this.clearStudentData();
    this.studentDataLoading.set(true); this.errorMessage.set(''); this.successMessage.set('');
    forkJoin({
      trips: this.family.getUpcomingTrips(studentId),
      driver: this.optionalDriver(studentId),
      preferences: this.family.getNotificationPreferences(studentId),
    }).pipe(finalize(() => { if (request === this.selectionRequest) this.studentDataLoading.set(false); })).subscribe({
      next: ({ trips, driver, preferences }) => {
        if (request !== this.selectionRequest) return;
        this.upcomingTrips.set(trips); this.driver.set(driver); this.preferences.set(preferences);
        this.preferencesForm.setValue({ notifyBoarding: preferences.notifyBoarding, notifyArrival: preferences.notifyArrival, notifyDelay: preferences.notifyDelay, notifyVehicleChange: preferences.notifyVehicleChange, notifyIncident: preferences.notifyIncident });
      },
      error: (error: unknown) => { if (request === this.selectionRequest) this.errorMessage.set(familyErrorMessage(error, 'No pudimos cargar el seguimiento.')); },
    });
  }

  retry(): void {
    const studentId = this.selectedStudentId();
    if (studentId) this.selectStudent(studentId);
    else this.loadStudents();
  }

  studentLabel(studentId: number): string {
    return this.students().find((student) => student.studentId === studentId)?.fullName ?? 'Estudiante vinculado';
  }

  savePreferences(): void {
    const studentId = this.selectedStudentId();
    if (!studentId) return;
    this.saving.set(true); this.successMessage.set(''); this.errorMessage.set('');
    this.family.updateNotificationPreferences(studentId, this.preferencesForm.getRawValue()).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (preferences) => { this.preferences.set(preferences); this.successMessage.set('Preferencias guardadas correctamente.'); },
      error: (error: unknown) => this.errorMessage.set(familyErrorMessage(error, 'No pudimos guardar las preferencias.')),
    });
  }

  private clearStudentData(): void {
    this.upcomingTrips.set([]);
    this.driver.set(null);
    this.preferences.set(null);
    this.preferencesForm.reset({ notifyBoarding: false, notifyArrival: false, notifyDelay: false, notifyVehicleChange: false, notifyIncident: false });
  }

  private optionalDriver(studentId: number) {
    return this.family.getCurrentDriverCredential(studentId).pipe(
      catchError((error: unknown) => error instanceof HttpErrorResponse && error.status === 404 ? of(null) : throwError(() => error)),
    );
  }
}
