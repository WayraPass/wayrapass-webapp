import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { LinkedStudent } from '../../../core/models/family.models';
import { AuthService } from '../../../core/services/auth.service';
import { FamilyService, familyErrorMessage } from '../../../core/services/family.service';

@Component({ selector: 'app-family-dashboard', standalone: true, imports: [RouterLink, MatIconModule, MatProgressSpinnerModule, ReactiveFormsModule], templateUrl: './dashboard.html', styleUrl: '../../student/dashboard/dashboard.css' })
export class FamilyDashboard {
  readonly user = inject(AuthService).user;
  private readonly family = inject(FamilyService);
  private readonly fb = inject(FormBuilder);
  readonly students = signal<LinkedStudent[]>([]);
  readonly loadingStudents = signal(true);
  readonly linking = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly linkForm = this.fb.nonNullable.group({ code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]] });

  constructor() { this.loadStudents(); }

  loadStudents(): void {
    this.loadingStudents.set(true);
    this.errorMessage.set('');
    this.family.getLinkedStudents().pipe(finalize(() => this.loadingStudents.set(false))).subscribe({
      next: (students) => this.students.set(students),
      error: (error: unknown) => this.errorMessage.set(familyErrorMessage(error, 'No pudimos cargar tus vínculos.')),
    });
  }

  linkStudent(): void {
    if (this.linkForm.invalid) { this.linkForm.markAllAsTouched(); return; }
    this.linking.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    const code = this.linkForm.controls.code.value.trim();
    this.family.linkStudent({ code, relationship: 'Familiar' }).pipe(finalize(() => this.linking.set(false))).subscribe({
      next: (student) => {
        this.students.update((current) => [...current.filter((item) => item.studentId !== student.studentId), student]);
        this.linkForm.reset();
        this.successMessage.set(`${student.fullName} fue vinculado correctamente.`);
      },
      error: (error: unknown) => this.errorMessage.set(familyErrorMessage(error, 'No pudimos vincular al estudiante.')),
    });
  }
}
