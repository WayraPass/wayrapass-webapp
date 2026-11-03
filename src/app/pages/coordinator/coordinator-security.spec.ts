import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, CanActivateFn, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { Observable, firstValueFrom, of } from 'rxjs';
import { routes } from '../../app.routes';
import { AuthenticatedUser, UserRole } from '../../core/models/auth.models';
import { AuthService } from '../../core/services/auth.service';
import { CoordinatorLayout } from './layout/coordinator-layout';

class AuthServiceStub {
  readonly user = signal<AuthenticatedUser | null>(user('COORDINATOR'));
  ensureSession() { return of(true); }
  dashboardPath(role: UserRole): string { return `/${role.toLowerCase()}/dashboard`; }
  logout(): void {}
}

describe('Coordinator C3 security and navigation', () => {
  let auth: AuthServiceStub;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CoordinatorLayout], providers: [provideRouter(routes), { provide: AuthService, useClass: AuthServiceStub }] }).compileComponents();
    auth = TestBed.inject(AuthService) as unknown as AuthServiceStub;
  });
  it('protects all C3 pages at the COORDINATOR parent route', () => {
    const coordinator = routes.find((route) => route.path === 'coordinator');
    expect(coordinator?.canActivate).toHaveLength(2);
    expect(coordinator?.children?.map((route) => route.path)).toEqual(expect.arrayContaining(['dashboard', 'routes', 'stops', 'drivers', 'vehicles', 'assignments', 'calendar', 'reports']));
  });
  it.each(['STUDENT', 'FAMILY', 'DRIVER'] as UserRole[])('blocks the %s role from coordinator pages', async (role) => {
    auth.user.set(user(role));
    const coordinator = routes.find((route) => route.path === 'coordinator')!;
    const guard = coordinator.canActivate![1] as CanActivateFn;
    const result = TestBed.runInInjectionContext(() => guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
    const resolved = await firstValueFrom(result as Observable<boolean | UrlTree>);
    expect(resolved).not.toBe(true);
  });
  it('adds the D1/D2/D3 coordinator navigation', () => {
    const fixture = TestBed.createComponent(CoordinatorLayout); fixture.detectChanges(); const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Rutas y paraderos'); expect(text).toContain('Conductores'); expect(text).toContain('Vehículos');
    expect(text).toContain('Asignaciones'); expect(text).toContain('Calendario'); expect(text).toContain('Reportes');
  });
});

function user(role: UserRole): AuthenticatedUser { return { id: 1, email: `${role.toLowerCase()}@test.com`, fullName: 'Usuario Prueba', phone: null, role }; }
