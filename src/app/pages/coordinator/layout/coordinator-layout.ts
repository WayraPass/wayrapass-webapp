import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  
  link?: string;
  
  sections?: string[];
}

@Component({
  selector: 'app-coordinator-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, MatIconModule],
  templateUrl: './coordinator-layout.html',
  styleUrl: './coordinator-layout.css',
})
export class CoordinatorLayout {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly user = this.auth.user;
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );
  readonly initials = computed(() =>
    (this.user()?.fullName ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]!.toUpperCase())
      .join(''),
  );

  readonly navItems: ReadonlyArray<NavItem> = [
    { label: 'Rutas y paraderos', icon: 'alt_route', link: '/coordinator/routes', sections: ['/coordinator/routes', '/coordinator/stops'] },
    { label: 'Choferes y unidades', icon: 'directions_bus' },
    { label: 'Asignaciones', icon: 'event' },
    { label: 'Incidencias', icon: 'report_problem' },
    { label: 'Reportes', icon: 'bar_chart' },
  ];

  isActive(item: NavItem): boolean {
    return (item.sections ?? []).some((prefix) => this.url().startsWith(prefix));
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
