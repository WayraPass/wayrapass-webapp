import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { EnrollmentService } from './enrollment.service';

describe('EnrollmentService US12/US13', () => {
  let service: EnrollmentService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [EnrollmentService, provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(EnrollmentService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the authenticated student current enrollment', () => {
    service.getCurrent().subscribe();
    const request = http.expectOne(`${environment.apiUrl}/enrollments/me`);
    expect(request.request.method).toBe('GET');
    request.flush({ enrollmentId: 30, routeId: 5, stopId: 8, status: 'ACTIVE', suspendedFrom: null, suspendedUntil: null });
  });

  it('uses the same real POST contract for creation and change', () => {
    service.enroll({ routeId: 6, stopId: 9 }).subscribe();
    const request = http.expectOne(`${environment.apiUrl}/enrollments/me`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ routeId: 6, stopId: 9 });
    request.flush({ id: 31, studentId: 2, routeId: 6, stopId: 9, status: 'ACTIVE', validFrom: '2026-11-02', validUntil: null, estimatedPickupTime: '07:20:00' });
  });

  it('suspends the current enrollment using the real PUT contract', () => {
    service.suspend({ startDate: '2026-11-02', endDate: '2026-11-09' }).subscribe();
    const request = http.expectOne(`${environment.apiUrl}/enrollments/me/suspension`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ startDate: '2026-11-02', endDate: '2026-11-09' });
    request.flush({ enrollmentId: 30, routeId: 5, stopId: 8, status: 'SUSPENDED', suspendedFrom: '2026-11-02', suspendedUntil: '2026-11-09' });
  });

  it('reactivates the current enrollment using the real PUT contract', () => {
    service.reactivate().subscribe();
    const request = http.expectOne(`${environment.apiUrl}/enrollments/me/reactivation`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toBeNull();
    request.flush({ enrollmentId: 30, routeId: 5, stopId: 8, status: 'ACTIVE', suspendedFrom: '2026-11-02', suspendedUntil: '2026-11-02' });
  });
});
