import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PasswordResetResponse } from '../../../core/models/auth.models';
import { AuthService, authErrorMessage } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly response = signal<PasswordResetResponse | null>(null);
  readonly requestedEmail = signal('');
  readonly form = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]] });

  submit(): void {
    this.errorMessage.set('');
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.auth.requestPasswordReset(this.form.controls.email.value).pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: (response) => {
        this.requestedEmail.set(this.form.controls.email.value.trim());
        this.response.set(response);
      },
      error: (error: unknown) => this.errorMessage.set(authErrorMessage(error)),
    });
  }

  continueToReset(): void {
    const token = this.response()?.developmentToken;
    if (!token) return;
    void this.router.navigate(['/reset-password'], { queryParams: { token } });
  }
}
