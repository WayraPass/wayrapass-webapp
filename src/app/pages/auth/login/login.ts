import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService, authErrorMessage } from '../../../core/services/auth.service';
import { AuthenticatedUser, UserRole } from '../../../core/models/auth.models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly showPassword = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  constructor() {
    if (this.route.snapshot.queryParamMap.get('registered') === '1') {
      this.successMessage.set('Tu solicitud de registro se procesó. Inicia sesión cuando tu cuenta esté habilitada.');
    }
  }

  submit(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.auth.login(this.form.getRawValue()).pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: (user) => this.router.navigateByUrl(this.pathForRole(user)),
      error: (error: unknown) => this.errorMessage.set(authErrorMessage(error, 'login')),
    });
  }

  private pathForRole(user: AuthenticatedUser): string {
    const paths: Record<UserRole, string> = {
      STUDENT: '/student/dashboard',
      FAMILY: '/family/dashboard',
      DRIVER: '/driver/dashboard',
      COORDINATOR: '/coordinator/dashboard',
    };
    return paths[user.role];
  }
}
