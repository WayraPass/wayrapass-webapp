import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService, authErrorMessage } from '../../../core/services/auth.service';
import { SelfRegistrationRole } from '../../../core/models/auth.models';

const passwordsMatch: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const confirmation = control.get('confirmPassword')?.value;
  return !confirmation || password === confirmation ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly errorMessage = signal('');
  readonly selectedRole = signal<SelfRegistrationRole>('STUDENT');

  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
    lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    phone: ['', [Validators.maxLength(30), Validators.pattern(/^$|^\+?[0-9][0-9 ()-]{6,29}$/)]],
    institutionId: [0, [Validators.required, Validators.min(1)]],
    studentCode: ['', Validators.maxLength(40)],
    password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(128)]],
    confirmPassword: ['', Validators.required],
  }, { validators: passwordsMatch });

  selectRole(role: SelfRegistrationRole): void {
    this.selectedRole.set(role);
    const institutionId = this.form.controls.institutionId;
    if (role === 'STUDENT') {
      institutionId.setValidators([Validators.required, Validators.min(1)]);
    } else {
      institutionId.clearValidators();
      institutionId.setValue(0);
    }
    institutionId.updateValueAndValidity();
  }

  submit(): void {
    this.errorMessage.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.loading.set(true);
    const request = {
      fullName: `${value.firstName} ${value.lastName}`.trim(),
      email: value.email.trim(),
      password: value.password,
      phone: value.phone.trim() || undefined,
      role: this.selectedRole(),
      ...(this.selectedRole() === 'STUDENT' ? {
        institutionId: value.institutionId,
        studentCode: value.studentCode.trim() || undefined,
      } : {}),
    };
    this.auth.register(request).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => void this.router.navigate(['/login'], { queryParams: { registered: '1' } }),
      error: (error: unknown) => this.errorMessage.set(authErrorMessage(error)),
    });
  }
}
