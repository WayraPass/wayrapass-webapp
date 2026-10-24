import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService, authErrorMessage } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';
  readonly loading = signal(false);
  readonly showPassword = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly emailForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });
  readonly resetForm = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  });

  submit(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
    if (this.token) this.reset(); else this.requestReset();
  }

  private requestReset(): void {
    if (this.emailForm.invalid) { this.emailForm.markAllAsTouched(); return; }
    this.loading.set(true);
    this.auth.requestPasswordReset(this.emailForm.controls.email.value).pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: () => this.successMessage.set('Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.'),
      error: (error: unknown) => this.errorMessage.set(authErrorMessage(error, 'recovery')),
    });
  }

  private reset(): void {
    if (this.resetForm.invalid) { this.resetForm.markAllAsTouched(); return; }
    const value = this.resetForm.getRawValue();
    if (value.password !== value.confirmPassword) {
      this.errorMessage.set('Las contraseñas no coinciden.');
      return;
    }

    this.loading.set(true);
    this.auth.resetPassword({ token: this.token, newPassword: value.password }).pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: () => this.successMessage.set('La contraseña se actualizó. Ya puedes volver a iniciar sesión.'),
      error: (error: unknown) => this.errorMessage.set(authErrorMessage(error, 'reset')),
    });
  }
}
