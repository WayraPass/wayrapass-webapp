import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({ selector: 'app-family-layout', standalone: true, imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule], templateUrl: './family-layout.html', styleUrls: ['../../student/layout/student-layout.css', './family-layout.css'] })
export class FamilyLayout implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly notificationCenter = inject(NotificationService);
  readonly user = this.auth.user;
  readonly menuOpen = signal(false);
  readonly initials = computed(() => (this.user()?.fullName ?? 'Familiar').split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]!.toUpperCase()).join(''));
  constructor() { this.notificationCenter.startPolling(); }
  ngOnDestroy(): void { this.notificationCenter.stopPolling(); }
  closeMenu(): void { this.menuOpen.set(false); }
  logout(): void { this.auth.logout(); void this.router.navigateByUrl('/login'); }
}
