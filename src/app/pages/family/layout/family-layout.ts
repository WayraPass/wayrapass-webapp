import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({ selector: 'app-family-layout', standalone: true, imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule], templateUrl: './family-layout.html', styleUrl: '../../student/layout/student-layout.css' })
export class FamilyLayout {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly user = this.auth.user;
  readonly menuOpen = signal(false);
  readonly initials = computed(() => (this.user()?.fullName ?? 'Familiar').split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]!.toUpperCase()).join(''));
  closeMenu(): void { this.menuOpen.set(false); }
  logout(): void { this.auth.logout(); void this.router.navigateByUrl('/login'); }
}
