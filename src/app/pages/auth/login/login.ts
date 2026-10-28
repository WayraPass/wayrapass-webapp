import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService, DEMO_PASSWORD, authErrorMessage, formatDuration, roleLabel } from '../../../core/services/auth.service';
import { UserRole } from '../../../core/models/auth.models';

interface RoleOption {
  role: UserRole;
  label: string;
  shortDescription: string;
  description: string;
  email: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatCheckboxModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly roles: ReadonlyArray<RoleOption> = [
    { role: 'STUDENT', label: 'Estudiante', shortDescription: 'Universidad o instituto', description: 'Ve los buses, paraderos y avisos de tu ruta.', email: 'student@wayrapass.com' },
    { role: 'FAMILY', label: 'Familiar', shortDescription: 'Autorizado', description: 'Sigue el viaje del estudiante que tienes asociado.', email: 'family@wayrapass.com' },
    { role: 'DRIVER', label: 'Chofer', shortDescription: 'Conductor del bus', description: 'Consulta tu ruta, paraderos y horarios del día.', email: 'driver@wayrapass.com' },
    { role: 'COORDINATOR', label: 'Coordinador', shortDescription: 'De transporte', description: 'Gestiona rutas, buses y avisos del servicio.', email: 'coordinator@wayrapass.com' },
  ];
  readonly demoPassword = DEMO_PASSWORD;
  readonly selectedRole = signal<UserRole>('STUDENT');
  readonly loading = signal(false);
  readonly showPassword = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly selectedRoleLabel = computed(() => roleLabel(this.selectedRole()));
  readonly blockCountdown = computed(() => formatDuration(this.auth.remainingBlockSeconds()));

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    rememberMe: [false],
  });

  constructor() {
    if (this.route.snapshot.queryParamMap.get('registered') === '1') {
      this.successMessage.set('Cuenta creada localmente. Ya puedes iniciar sesión con tus nuevos datos.');
    }
    if (this.route.snapshot.queryParamMap.get('reset') === '1') {
      this.successMessage.set('Contraseña actualizada. Inicia sesión con tu nueva contraseña.');
    }
  }

  selectRole(role: UserRole): void {
    this.selectedRole.set(role);
    this.errorMessage.set('');
  }

  useDemo(option: RoleOption): void {
    this.selectRole(option.role);
    this.form.patchValue({ email: option.email, password: DEMO_PASSWORD });
  }

  submit(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.auth.isBlocked()) {
      this.errorMessage.set(`Acceso bloqueado temporalmente. Intenta de nuevo en ${this.blockCountdown()}.`);
      return;
    }

    this.loading.set(true);
    this.auth.login({ ...this.form.getRawValue(), role: this.selectedRole() }).pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: (user) => void this.router.navigateByUrl(this.auth.dashboardPath(user.role)),
      error: (error: unknown) => this.errorMessage.set(authErrorMessage(error)),
    });
  }
}
