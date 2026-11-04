import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { DriverProfile } from '../../../core/models/driver.models';
import { AuthService } from '../../../core/services/auth.service';
import { DriverService } from '../../../core/services/driver.service';

@Component({
  selector: 'app-driver-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './driver-layout.html',
  styleUrl: '../../student/layout/student-layout.css',
})
export class DriverLayout {
  private readonly auth = inject(AuthService);
  private readonly drivers = inject(DriverService);
  private readonly router = inject(Router);

  readonly user = this.auth.user;
  readonly profile = signal<DriverProfile | null>(null);
  readonly menuOpen = signal(false);
  readonly initials = computed(() => (this.profile()?.fullName ?? this.user()?.fullName ?? 'Conductor')
    .split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]!.toUpperCase()).join(''));

  constructor() {
    this.drivers.getProfile().subscribe({
      next: (profile) => this.profile.set(profile),
      error: () => this.profile.set(null),
    });
  }

  closeMenu(): void { this.menuOpen.set(false); }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
