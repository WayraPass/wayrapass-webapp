import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { AuthService, authErrorMessage } from '../../../core/services/auth.service';
import { SelfRegistrationRole } from '../../../core/models/auth.models';

const passwordsMatch: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return !confirmPassword || password === confirmPassword ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule, MatSelectModule],
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
  readonly successMessage = signal('');

  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
    lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(160)]],
    role: ['STUDENT' as SelfRegistrationRole, Validators.required],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
    confirmPassword: ['', Validators.required],
  }, { validators: passwordsMatch });

  passwordStrength(): string {
    const password = this.form.controls.password.value;
    if (!password) return '';
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 1) return 'Débil';
    if (score === 2) return 'Regular';
    if (score === 3) return 'Buena';
    return 'Fuerte';
  }

  submit(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.loading.set(true);
    this.auth.register({
      fullName: `${value.firstName} ${value.lastName}`.trim(),
      email: value.email,
      password: value.password,
      role: value.role,
    }).pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: () => {
        this.successMessage.set('La solicitud de registro se envió correctamente. Ahora puedes iniciar sesión si el backend ya habilitó tu cuenta.');
        void this.router.navigate(['/login'], { queryParams: { registered: '1' } });
      },
      error: (error: unknown) => this.errorMessage.set(authErrorMessage(error, 'register')),
    });
  }
}
