import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { RouteService } from '../../../core/services/route.service';
import { StudentRouteSearch } from './route-search';

class AuthServiceStub {
  user = signal({ id: 2, email: 'student@test', fullName: 'Estudiante Demo', phone: null, role: 'STUDENT' as const, institutionId: 25 });
  currentUser() { return of(this.user()!); }
  preferredStudentInstitutionId() { return 25; }
}
class RouteServiceStub {
  getPublicInstitutions() { return of([{ id: 25, name: 'UPC', campusName: 'Monterrico', displayName: 'UPC — Monterrico', district: 'Surco' }]); }
  getDistricts() { return of([]); }
  getFavoriteRoutes() { return of([]); }
  searchGroupedRoutes() { return of([{ routeId: 5, routeCode: 'UPC-SMI-01', routeName: 'San Miguel - UPC', origin: 'San Miguel', destination: 'UPC Monterrico', institution: { id: 25, name: 'UPC', campusName: 'Monterrico', displayName: 'UPC — Monterrico', district: 'Surco' }, stops: [], schedules: [], favorite: false }]); }
  getStopsByDistrict() { return of([]); }
}

describe('StudentRouteSearch enrollment integration', () => {
  it('offers the enrollment CTA for a real grouped route', async () => {
    await TestBed.configureTestingModule({ imports: [StudentRouteSearch], providers: [provideRouter([]), { provide: AuthService, useClass: AuthServiceStub }, { provide: RouteService, useClass: RouteServiceStub }] }).compileComponents();
    const fixture = TestBed.createComponent(StudentRouteSearch); fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('.enrollment-action') as HTMLAnchorElement;
    expect(link.textContent).toContain('Inscribirme en esta ruta');
    expect(link.getAttribute('href')).toContain('/student/enrollment?routeId=5');
  });
});
