import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-dashboard-shell',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './dashboard-shell.html',
  styleUrl: './dashboard-shell.css',
})
export class DashboardShell {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly roleName = input.required<string>();
  readonly eyebrow = input.required<string>();
  readonly description = input.required<string>();
  readonly icon = input.required<string>();
  readonly user = this.auth.user;

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
