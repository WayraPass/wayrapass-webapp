import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { CoordinatorTrip, RouteAdmin, RouteScheduleAdmin, TripCreateRequest, WeeklyOperation } from '../../../core/models/coordinator.models';
import { CoordinatorService } from '../../../core/services/coordinator.service';
import { OperationsCalendar, tripCreationErrorMessage } from './operations-calendar';

const operation: WeeklyOperation = {
  tripId: 7, operationDate: '2026-11-03', scheduledStartAt: '2026-11-03T23:00:00Z', scheduledEndAt: '2026-11-04T00:00:00Z', status: 'BOARDING', routeId: 4, routeCode: 'UNI-EST-01', routeName: 'Lima Este a UNI', origin: 'Santa Anita', destination: 'UNI Rímac',
  driver: { driverId: 20, fullName: 'Conductor 2 Prueba', licenseNumber: 'LIC-C3-002', licenseCategory: 'AIIIc', licenseExpiration: '2028-12-31', authorizationStatus: 'AUTHORIZED', operationalStatus: 'AVAILABLE' },
  vehicle: { vehicleId: 26, plate: 'P2-TMP', brand: 'Toyota', model: 'Coaster', capacity: 25, authorizationStatus: 'AUTHORIZED', operationalStatus: 'AVAILABLE' },
  modified: true, modificationMessage: 'La operación fue modificada o reasignada.',
};

class CalendarServiceStub {
  result: Observable<WeeklyOperation[]> = of([operation]);
  routesResult: Observable<RouteAdmin[]> = of([
    { id: 4, institutionId: 1, code: 'UNI-EST-01', name: 'Lima Este a UNI', origin: 'Santa Anita', destination: 'UNI Rímac', description: null, capacity: 30, status: 'ACTIVE' },
    { id: 8, institutionId: 1, code: 'OFF', name: 'Inactiva', origin: 'A', destination: 'B', description: null, capacity: 20, status: 'INACTIVE' },
  ]);
  schedulesResult: Observable<RouteScheduleAdmin[]> = of([
    { id: 12, routeId: 4, dayOfWeek: 'MONDAY', departureTime: '08:00:00', estimatedArrivalTime: '09:00:00', active: true },
    { id: 13, routeId: 8, dayOfWeek: 'TUESDAY', departureTime: '10:00:00', estimatedArrivalTime: null, active: true },
    { id: 14, routeId: 4, dayOfWeek: 'WEDNESDAY', departureTime: '12:00:00', estimatedArrivalTime: null, active: false },
  ]);
  createResult: Observable<CoordinatorTrip> = of({ id: 40, routeId: 4, driverId: null, vehicleId: null, scheduledStartAt: '2099-11-10T13:00:00Z', scheduledEndAt: '2099-11-10T14:00:00Z', estimatedArrivalAt: null, status: 'SCHEDULED', wasReassigned: false });
  calls: Array<{ from: string; to: string }> = [];
  createCalls: TripCreateRequest[] = [];
  weeklyCalendar(from: string, to: string) { this.calls.push({ from, to }); return this.result; }
  routes() { return this.routesResult; }
  schedules() { return this.schedulesResult; }
  createTrip(request: TripCreateRequest) { this.createCalls.push(request); return this.createResult; }
}

describe('OperationsCalendar D2 / US22', () => {
  let fixture: ComponentFixture<OperationsCalendar>;
  let component: OperationsCalendar;
  let service: CalendarServiceStub;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [OperationsCalendar], providers: [{ provide: CoordinatorService, useClass: CalendarServiceStub }] }).compileComponents();
    service = TestBed.inject(CoordinatorService) as unknown as CalendarServiceStub;
  });
  function create(): void { fixture = TestBed.createComponent(OperationsCalendar); component = fixture.componentInstance; fixture.detectChanges(); }
  it('requests the current week from Monday through Sunday', () => {
    create(); const call = service.calls[0]; expect(call.from).toBe('2026-11-02'); expect(call.to).toBe('2026-11-08');
  });
  it('navigates to exact previous and next weekly ranges', () => {
    create(); component.previousWeek(); expect(service.calls.at(-1)).toEqual({ from: '2026-10-26', to: '2026-11-01' });
    component.nextWeek(); component.nextWeek(); expect(service.calls.at(-1)).toEqual({ from: '2026-11-09', to: '2026-11-15' });
    component.currentWeek(); expect(service.calls.at(-1)).toEqual({ from: '2026-11-02', to: '2026-11-08' });
  });
  it('shows loading while the backend responds', () => {
    service.result = new Subject<WeeklyOperation[]>(); create(); expect(fixture.nativeElement.querySelector('mat-spinner')).toBeTruthy();
  });
  it('renders route, resources, translated state and reassignment marker', () => {
    create(); const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('UNI-EST-01'); expect(text).toContain('Conductor 2 Prueba'); expect(text).toContain('P2-TMP'); expect(text).toContain('En abordaje'); expect(text).toContain('modificada o reasignada');
  });
  it('renders missing resources without inventing values', () => {
    service.result = of([{ ...operation, driver: null, vehicle: null, modified: false }]); create(); const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Sin conductor asignado'); expect(text).toContain('Sin vehículo asignado');
  });
  it('shows a clear empty week', () => {
    service.result = of([]); create(); expect(fixture.nativeElement.textContent).toContain('No hay operaciones programadas esta semana'); expect(fixture.nativeElement.querySelectorAll('.day-card')).toHaveLength(7);
  });
  it('shows a recoverable backend error', () => {
    service.result = throwError(() => new HttpErrorResponse({ status: 503 })); create(); expect(fixture.nativeElement.textContent).toContain('Reintentar');
  });
  it('loads active routes and filters active schedules by selected route', () => {
    create(); component.openCreate(); component.createForm.controls.routeId.setValue(4); fixture.detectChanges(); const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('UNI-EST-01 — Santa Anita a UNI Rímac'); expect(text).not.toContain('OFF —'); expect(text).toContain('Lunes · 08:00 a 09:00'); expect(text).not.toContain('Martes · 10:00'); expect(text).not.toContain('Miércoles · 12:00');
  });
  it('clears a schedule when the route changes', () => {
    create(); component.createForm.patchValue({ routeId: 4, routeScheduleId: 12 }); component.routeChanged(); expect(component.createForm.controls.routeScheduleId.value).toBeNull();
  });
  it('validates required dates, future start and end after start before submitting', () => {
    create(); component.openCreate(); component.createForm.patchValue({ routeId: 4 }); component.createTrip(); expect(service.createCalls).toHaveLength(0); expect(component.createError()).toContain('Indica la fecha');
    component.createForm.patchValue({ scheduledStartAt: '2020-01-01T08:00', scheduledEndAt: '2020-01-01T09:00' }); component.createTrip(); expect(component.createError()).toContain('actual o futuro');
    component.createForm.patchValue({ scheduledStartAt: '2099-11-10T09:00', scheduledEndAt: '2099-11-10T08:00' }); component.createTrip(); expect(component.createError()).toContain('posterior al inicio'); expect(service.createCalls).toHaveLength(0);
  });
  it('submits the exact DTO with Lima instants and no resources', () => {
    create(); component.openCreate(); component.createForm.patchValue({ routeId: 4, routeScheduleId: 12, scheduledStartAt: '2099-11-10T08:00', scheduledEndAt: '2099-11-10T09:00' }); component.createTrip();
    expect(service.createCalls).toEqual([{ routeId: 4, routeScheduleId: 12, driverId: null, vehicleId: null, scheduledStartAt: '2099-11-10T13:00:00.000Z', scheduledEndAt: '2099-11-10T14:00:00.000Z' }]);
  });
  it('prevents double submit while creation is pending', () => {
    const pending = new Subject<CoordinatorTrip>(); service.createResult = pending; create(); component.openCreate(); component.createForm.patchValue({ routeId: 4, scheduledStartAt: '2099-11-10T08:00', scheduledEndAt: '2099-11-10T09:00' }); component.createTrip(); component.createTrip(); expect(service.createCalls).toHaveLength(1); expect(component.creating()).toBe(true);
  });
  it('reloads the created week and renders the new scheduled trip without resources', () => {
    create(); service.result = of([{ ...operation, tripId: 40, operationDate: '2099-11-10', scheduledStartAt: '2099-11-10T13:00:00Z', scheduledEndAt: '2099-11-10T14:00:00Z', status: 'SCHEDULED', driver: null, vehicle: null, modified: false }]);
    component.openCreate(); component.createForm.patchValue({ routeId: 4, scheduledStartAt: '2099-11-10T08:00', scheduledEndAt: '2099-11-10T09:00' }); component.createTrip(); fixture.detectChanges(); const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Viaje creado correctamente'); expect(text).toContain('Programado'); expect(text).toContain('Sin conductor asignado'); expect(text).toContain('Sin vehículo asignado'); expect(service.calls.at(-1)).toEqual({ from: '2099-11-09', to: '2099-11-15' });
  });
  it.each([
    [400, 'regla real', 'regla real'], [401, '', 'sesión venció'], [403, '', 'no tiene permiso'], [404, '', 'ruta o el horario'], [409, '', 'conflicto'],
  ])('maps creation HTTP %s errors humanly', (status, backendMessage, expected) => {
    const error = new HttpErrorResponse({ status, error: backendMessage ? { message: backendMessage } : null }); expect(tripCreationErrorMessage(error)).toContain(expected);
  });
  it.each([
    ['SCHEDULED', 'Programado'], ['BOARDING', 'En abordaje'], ['IN_PROGRESS', 'En curso'], ['COMPLETED', 'Completado'], ['CANCELLED', 'Cancelado'],
  ] as const)('translates %s', (status, label) => { create(); expect(component.statusLabel(status)).toBe(label); });
});
