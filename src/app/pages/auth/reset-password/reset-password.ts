import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService, authErrorMessage } from '../../../core/services/auth.service';

const passwordsMatch: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  control.get('password')?.value === control.get('confirmPassword')?.value ? null : { passwordMismatch: true };

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPassword {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';
  readonly email = this.route.snapshot.queryParamMap.get('email') ?? '';
  readonly loading = signal(false);
  readonly showPassword = signal(false);
  readonly completed = signal(false);
  readonly errorMessage = signal('');
  readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
    confirmPassword: ['', Validators.required],
  }, { validators: passwordsMatch });

  submit(): void {
    this.errorMessage.set('');
    if (!this.token || !this.email) { this.errorMessage.set('El enlace mock está incompleto. Solicita uno nuevo.'); return; }
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.auth.resetPassword({ email: this.email, token: this.token, newPassword: this.form.controls.password.value }).pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: () => this.completed.set(true),
      error: (error: unknown) => this.errorMessage.set(authErrorMessage(error)),
    });
  }
}
