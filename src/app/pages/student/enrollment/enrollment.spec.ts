import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { CurrentEnrollment, EnrollmentRequest, EnrollmentResponse, SuspensionRequest } from '../../../core/models/enrollment.models';
import { GroupedRouteSearch } from '../../../core/models/route.models';
import { EnrollmentService } from '../../../core/services/enrollment.service';
import { RouteService } from '../../../core/services/route.service';
import { StudentEnrollment } from './enrollment';

const routes: GroupedRouteSearch[] = [
  { routeId: 5, routeCode: 'UPC-SMI-01', routeName: 'San Miguel - UPC', origin: 'San Miguel', destination: 'UPC Monterrico', institution: { id: 25, name: 'UPC', campusName: 'Monterrico', displayName: 'UPC — Monterrico', district: 'Surco' }, stops: [{ id: 10, name: 'Plaza San Miguel', address: 'Av. La Marina', district: 'San Miguel', sequence: 1, estimatedOffsetMinutes: 10 }, { id: 11, name: 'Óvalo La Perla', address: null, district: 'Callao', sequence: 2, estimatedOffsetMinutes: 20 }, { id: 12, name: 'UPC Monterrico', address: null, district: 'Surco', sequence: 3, estimatedOffsetMinutes: 50 }], schedules: [], favorite: false },
  { routeId: 6, routeCode: 'UPC-LOL-01', routeName: 'Los Olivos - UPC', origin: 'Los Olivos', destination: 'UPC Monterrico', institution: { id: 25, name: 'UPC', campusName: 'Monterrico', displayName: 'UPC — Monterrico', district: 'Surco' }, stops: [{ id: 20, name: 'Municipalidad de Los Olivos', address: null, district: 'Los Olivos', sequence: 1, estimatedOffsetMinutes: 8 }, { id: 12, name: 'UPC Monterrico', address: null, district: 'Surco', sequence: 2, estimatedOffsetMinutes: 60 }], schedules: [], favorite: false },
  { routeId: 49, routeCode: 'UCV-ATE-CIE-01', routeName: 'Cieneguilla a UCV Ate', origin: 'Cieneguilla', destination: 'UCV Ate', institution: { id: 14, name: 'UCV', campusName: 'Ate', displayName: 'UCV — Ate', district: 'Ate' }, stops: [{ id: 50, name: 'Óvalo Cieneguilla', address: null, district: 'Cieneguilla', sequence: 1, estimatedOffsetMinutes: 0 }, { id: 51, name: 'UCV Ate', address: null, district: 'Ate', sequence: 2, estimatedOffsetMinutes: 45 }], schedules: [], favorite: false },
  { routeId: 60, routeCode: 'PUCP-SMI-01', routeName: 'Magdalena a PUCP', origin: 'Magdalena', destination: 'PUCP San Miguel', institution: { id: 3, name: 'PUCP', campusName: 'San Miguel', displayName: 'PUCP — San Miguel', district: 'San Miguel' }, stops: [{ id: 61, name: 'Parque Túpac Amaru', address: null, district: 'Magdalena', sequence: 1, estimatedOffsetMinutes: 0 }, { id: 62, name: 'PUCP San Miguel', address: null, district: 'San Miguel', sequence: 2, estimatedOffsetMinutes: 20 }], schedules: [], favorite: false },
];
const active: CurrentEnrollment = { enrollmentId: 30, routeId: 5, stopId: 10, status: 'ACTIVE', suspendedFrom: null, suspendedUntil: null };
const response = (request: EnrollmentRequest): EnrollmentResponse => ({ id: 31, studentId: 2, ...request, status: 'ACTIVE', validFrom: '2026-11-02', validUntil: null, estimatedPickupTime: '07:15:00' });

class EnrollmentServiceStub {
  current: Observable<CurrentEnrollment> = of(active);
  result: (request: EnrollmentRequest) => Observable<EnrollmentResponse> = (request) => of(response(request));
  requests: EnrollmentRequest[] = [];
  suspensions: SuspensionRequest[] = [];
  statusResult: (status: CurrentEnrollment) => Observable<CurrentEnrollment> = (status) => of(status);
  getCurrent() { return this.current; }
  enroll(request: EnrollmentRequest) { this.requests.push(request); return this.result(request); }
  suspend(request: SuspensionRequest) {
    this.suspensions.push(request);
    return this.statusResult({ ...active, status: 'SUSPENDED', suspendedFrom: request.startDate, suspendedUntil: request.endDate });
  }
  reactivate() { return this.statusResult({ ...active, status: 'ACTIVE' }); }
}
class RouteServiceStub {
  filters: unknown[] = [];
  searchGroupedRoutes(filters?: unknown) { this.filters.push(filters); return of(routes); }
}

describe('StudentEnrollment US12/US13/US14', () => {
  let fixture: ComponentFixture<StudentEnrollment>;
  let service: EnrollmentServiceStub;
  let routeService: RouteServiceStub;
  let queryRouteId: string | null;

  beforeEach(async () => {
    queryRouteId = null;
    await TestBed.configureTestingModule({
      imports: [StudentEnrollment],
      providers: [provideRouter([]), { provide: EnrollmentService, useClass: EnrollmentServiceStub }, { provide: RouteService, useClass: RouteServiceStub }, { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => queryRouteId } } } }],
    }).compileComponents();
    service = TestBed.inject(EnrollmentService) as unknown as EnrollmentServiceStub;
    routeService = TestBed.inject(RouteService) as unknown as RouteServiceStub;
  });

  function create(): void { fixture = TestBed.createComponent(StudentEnrollment); fixture.detectChanges(); }

  it('shows the empty state when the student has no enrollment', () => {
    service.current = throwError(() => new HttpErrorResponse({ status: 404 }));
    create();
    expect(fixture.nativeElement.textContent).toContain('Todavía no tienes una inscripción activa');
  });

  it('loads and presents the current enrollment with human labels', () => {
    create();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('San Miguel - UPC');
    expect(text).toContain('Plaza San Miguel');
    expect(text).toContain('Activa');
  });

  it('loads the global route catalog without filtering by the profile institution', () => {
    create();
    expect(routeService.filters).toEqual([undefined]);
    expect(fixture.componentInstance.routes().map((route) => route.institution.id)).toEqual([25, 25, 14, 3]);
  });

  it('accepts an external-institution route received through the query parameter', () => {
    queryRouteId = '49';
    create();
    expect(fixture.componentInstance.selectedRoute()?.routeCode).toBe('UCV-ATE-CIE-01');
    expect(fixture.componentInstance.editing()).toBe(true);
  });

  it('allows sequential changes from the profile institution to two other institutions', () => {
    create();
    fixture.componentInstance.startChange();
    fixture.componentInstance.form.controls.routeId.setValue(49);
    expect(fixture.componentInstance.form.controls.stopId.value).toBe(0);
    fixture.componentInstance.form.controls.stopId.setValue(50);
    fixture.componentInstance.submit();
    fixture.componentInstance.startChange();
    fixture.componentInstance.form.controls.routeId.setValue(60);
    fixture.componentInstance.form.controls.stopId.setValue(61);
    fixture.componentInstance.submit();

    expect(service.requests).toEqual([{ routeId: 49, stopId: 50 }, { routeId: 60, stopId: 61 }]);
    expect(fixture.componentInstance.current()?.routeId).toBe(60);
  });

  it('creates an enrollment with a stop belonging to the selected route', () => {
    service.current = throwError(() => new HttpErrorResponse({ status: 404 }));
    create();
    fixture.componentInstance.form.controls.routeId.setValue(5);
    fixture.componentInstance.form.controls.stopId.setValue(11);
    fixture.componentInstance.submit(); fixture.detectChanges();
    expect(service.requests).toEqual([{ routeId: 5, stopId: 11 }]);
    expect(fixture.nativeElement.textContent).toContain('Inscripción registrada correctamente');
  });

  it('changes only the stop and updates the displayed enrollment', () => {
    create(); fixture.componentInstance.startChange();
    fixture.componentInstance.form.controls.stopId.setValue(11);
    fixture.componentInstance.submit(); fixture.detectChanges();
    expect(service.requests).toEqual([{ routeId: 5, stopId: 11 }]);
    expect(fixture.nativeElement.textContent).toContain('Óvalo La Perla');
  });

  it('resets the stop when changing route and then changes both values', () => {
    create(); fixture.componentInstance.startChange();
    fixture.componentInstance.form.controls.stopId.setValue(11);
    fixture.componentInstance.form.controls.routeId.setValue(6);
    expect(fixture.componentInstance.form.controls.stopId.value).toBe(0);
    fixture.componentInstance.form.controls.stopId.setValue(20);
    fixture.componentInstance.submit();
    expect(service.requests).toEqual([{ routeId: 6, stopId: 20 }]);
  });

  it('prevents a no-op before calling the backend', () => {
    create(); fixture.componentInstance.startChange(); fixture.componentInstance.submit(); fixture.detectChanges();
    expect(service.requests).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('diferente al actual');
  });

  it('shows the backend 409 capacity conflict', () => {
    service.result = () => throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'La ruta ya no dispone de cupos.' } }));
    create(); fixture.componentInstance.startChange(); fixture.componentInstance.form.controls.stopId.setValue(11); fixture.componentInstance.submit(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('La ruta ya no dispone de cupos');
  });

  it('shows a backend 400 rule message', () => {
    service.result = () => throwError(() => new HttpErrorResponse({ status: 400, error: { message: 'El paradero no pertenece a la ruta.' } }));
    create(); fixture.componentInstance.startChange(); fixture.componentInstance.form.controls.stopId.setValue(11); fixture.componentInstance.submit(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('El paradero no pertenece a la ruta');
  });

  it('offers suspension for an active enrollment and applies a valid period immediately', () => {
    create();
    expect(fixture.nativeElement.textContent).toContain('Suspender temporalmente');
    fixture.componentInstance.openSuspension();
    fixture.componentInstance.suspensionForm.controls.endDate.setValue('2099-12-31');
    fixture.componentInstance.suspend();
    fixture.detectChanges();

    expect(service.suspensions).toEqual([{ startDate: fixture.componentInstance.today, endDate: '2099-12-31' }]);
    expect(fixture.componentInstance.current()?.status).toBe('SUSPENDED');
    expect(fixture.nativeElement.textContent).toContain('quedó suspendida temporalmente');
  });

  it('rejects an invalid suspension period before calling the backend', () => {
    create();
    fixture.componentInstance.openSuspension();
    fixture.componentInstance.suspensionForm.controls.endDate.setValue(fixture.componentInstance.today);
    fixture.componentInstance.suspend();
    fixture.detectChanges();

    expect(service.suspensions).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('posterior a la fecha de inicio');
  });

  it('reconstructs a suspended enrollment from the backend after loading', () => {
    service.current = of({ ...active, status: 'SUSPENDED', suspendedFrom: '2026-11-02', suspendedUntil: '2026-11-09' });
    create();
    expect(fixture.nativeElement.textContent).toContain('Inscripción suspendida');
    expect(fixture.nativeElement.textContent).toContain('Reactivar inscripción');
    expect(fixture.nativeElement.textContent).not.toContain('Suspender temporalmente');
  });

  it('reactivates a suspended enrollment and updates the displayed state', () => {
    service.current = of({ ...active, status: 'SUSPENDED', suspendedFrom: '2026-11-02', suspendedUntil: '2026-11-09' });
    create();
    fixture.componentInstance.reactivate();
    fixture.detectChanges();
    expect(fixture.componentInstance.current()?.status).toBe('ACTIVE');
    expect(fixture.nativeElement.textContent).toContain('reactivada correctamente');
  });

  it('shows a real backend suspension rule error without changing local status', () => {
    service.statusResult = () => throwError(() => new HttpErrorResponse({ status: 400, error: { message: 'Existe un viaje activo o programado.' } }));
    create();
    fixture.componentInstance.openSuspension();
    fixture.componentInstance.suspensionForm.controls.endDate.setValue('2099-12-31');
    fixture.componentInstance.suspend();
    fixture.detectChanges();
    expect(fixture.componentInstance.current()?.status).toBe('ACTIVE');
    expect(fixture.nativeElement.textContent).toContain('Existe un viaje activo o programado');
  });
});
