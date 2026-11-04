import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';
import { FamilyLinkCode } from '../../../core/models/family.models';
import { AuthService } from '../../../core/services/auth.service';
import { FamilyService, familyErrorMessage } from '../../../core/services/family.service';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [DatePipe, RouterLink, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class StudentDashboard {
  readonly user = inject(AuthService).user;
  private readonly family = inject(FamilyService);
  readonly linkCode = signal<FamilyLinkCode | null>(null);
  readonly generatingCode = signal(false);
  readonly codeError = signal('');
  readonly copyMessage = signal('');

  generateFamilyCode(): void {
    this.generatingCode.set(true);
    this.codeError.set('');
    this.copyMessage.set('');
    this.family.generateLinkCode().pipe(finalize(() => this.generatingCode.set(false))).subscribe({
      next: (code) => this.linkCode.set(code),
      error: (error: unknown) => this.codeError.set(familyErrorMessage(error, 'No pudimos generar el código.')),
    });
  }

  async copyFamilyCode(): Promise<void> {
    const code = this.linkCode()?.code;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      this.copyMessage.set('Código copiado.');
    } catch {
      this.copyMessage.set('Selecciona y copia el código manualmente.');
    }
  }
}
