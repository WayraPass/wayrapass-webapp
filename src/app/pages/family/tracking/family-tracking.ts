import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize, forkJoin } from 'rxjs';
import { FamilyDriverCredential, FamilyUpcomingTrip, NotificationPreferences } from '../../../core/models/family.models';
import { FamilyService, familyErrorMessage } from '../../../core/services/family.service';
import { DriverCredentialCard } from '../driver-credential/driver-credential';

@Component({ selector: 'app-family-tracking', standalone: true, imports: [DatePipe, ReactiveFormsModule, MatIconModule, MatProgressSpinnerModule, DriverCredentialCard], templateUrl: './family-tracking.html', styleUrl: './family-tracking.css' })
export class FamilyTracking {
  private readonly family = inject(FamilyService);
  private readonly fb = inject(FormBuilder);
  readonly studentIds = signal<number[]>([]);
  readonly selectedStudentId = signal<number | null>(null);
  readonly upcomingTrips = signal<FamilyUpcomingTrip[]>([]);
  readonly driver = signal<FamilyDriverCredential | null>(null);
  readonly preferences = signal<NotificationPreferences | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly preferencesForm = this.fb.nonNullable.group({ notifyBoarding: false, notifyArrival: false, notifyDelay: false, notifyVehicleChange: false, notifyIncident: false });

  constructor() { this.loadStudents(); }

  loadStudents(): void {
    this.loading.set(true); this.errorMessage.set('');
    this.family.getLinkedStudentIds().subscribe({
      next: (ids) => {
        this.studentIds.set(ids);
        if (!ids.length) { this.loading.set(false); return; }
        this.selectStudent(ids[0]!);
      },
      error: (error: unknown) => { this.loading.set(false); this.errorMessage.set(familyErrorMessage(error)); },
    });
  }

  selectStudent(studentId: number): void {
    this.selectedStudentId.set(studentId); this.loading.set(true); this.errorMessage.set(''); this.successMessage.set('');
    forkJoin({ trips: this.family.getUpcomingTrips(studentId), driver: this.family.getCurrentDriverCredential(studentId), preferences: this.family.getNotificationPreferences(studentId) }).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: ({ trips, driver, preferences }) => {
        this.upcomingTrips.set(trips); this.driver.set(driver); this.preferences.set(preferences);
        this.preferencesForm.setValue({ notifyBoarding: preferences.notifyBoarding, notifyArrival: preferences.notifyArrival, notifyDelay: preferences.notifyDelay, notifyVehicleChange: preferences.notifyVehicleChange, notifyIncident: preferences.notifyIncident });
      },
      error: (error: unknown) => this.errorMessage.set(familyErrorMessage(error, 'No pudimos cargar el seguimiento.')),
    });
  }

  studentLabel(studentId: number): string { return `Estudiante vinculado ${this.studentIds().indexOf(studentId) + 1}`; }

  savePreferences(): void {
    const studentId = this.selectedStudentId();
    if (!studentId) return;
    this.saving.set(true); this.successMessage.set(''); this.errorMessage.set('');
    this.family.updateNotificationPreferences(studentId, this.preferencesForm.getRawValue()).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (preferences) => { this.preferences.set(preferences); this.successMessage.set('Preferencias guardadas correctamente.'); },
      error: (error: unknown) => this.errorMessage.set(familyErrorMessage(error, 'No pudimos guardar las preferencias.')),
    });
  }
}
