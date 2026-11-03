import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { CoordinatorTrip, DriverAdmin, ReassignmentOptions, RouteAdmin, TripAssignmentRequest, TripReassignmentRequest, VehicleAdmin } from '../../../core/models/coordinator.models';
import { CoordinatorService } from '../../../core/services/coordinator.service';
import { ResourceAssignment, assignmentErrorMessage, reassignmentErrorMessage } from './resource-assignment';

const route: RouteAdmin = { id: 7, institutionId: 1, code: 'UPC-01', name: 'San Miguel a Monterrico', origin: 'San Miguel', destination: 'UPC Monterrico', description: null, capacity: 30, status: 'ACTIVE' };
const unassigned: CoordinatorTrip = { id: 30, routeId: 7, driverId: null, vehicleId: null, scheduledStartAt: '2026-11-04T23:15:00Z', scheduledEndAt: '2026-11-05T00:15:00Z', estimatedArrivalAt: null, status: 'SCHEDULED', wasReassigned: false };
const assigned: CoordinatorTrip = { ...unassigned, id: 31, driverId: 4, vehicleId: 2 };
const driver: DriverAdmin = { id: 4, userId: 8, fullName: 'Ana Ruiz', email: 'ana@wayrapass.test', phone: null, licenseNumber: 'Q123', licenseCategory: 'AIIIc', licenseExpiration: '2027-01-01', credentialImageUrl: null, authorizationStatus: 'AUTHORIZED', operationalStatus: 'AVAILABLE', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
const vehicle: VehicleAdmin = { id: 2, plate: 'ABC-123', brand: 'Toyota', model: 'Coaster', capacity: 28, qrToken: 'secret', authorizationStatus: 'AUTHORIZED', operationalStatus: 'AVAILABLE' };
const options: ReassignmentOptions = { tripId: 31, message: null, drivers: [{ driverId: 9, fullName: 'Luis Pérez', licenseNumber: 'L-9', licenseCategory: 'AIIIc', licenseExpiration: '2028-01-01', authorizationStatus: 'AUTHORIZED', operationalStatus: 'AVAILABLE' }], vehicles: [{ vehicleId: 8, plate: 'NEW-008', brand: 'Mercedes', model: 'Sprinter', capacity: 24, authorizationStatus: 'AUTHORIZED', operationalStatus: 'AVAILABLE' }] };

class CoordinatorServiceStub {
  tripResult: Observable<CoordinatorTrip[]> = of([unassigned, assigned]);
  driverResult: Observable<DriverAdmin[]> = of([driver]);
  vehicleResult: Observable<VehicleAdmin[]> = of([vehicle]);
  assignmentResult: Observable<CoordinatorTrip> = of(assigned);
  optionsResult: Observable<ReassignmentOptions> = of(options);
  reassignmentResult: Observable<CoordinatorTrip> = of({ ...assigned, driverId: 9, wasReassigned: true });
  assignments: Array<{ id: number; body: TripAssignmentRequest }> = [];
  reassignments: Array<{ id: number; body: TripReassignmentRequest }> = [];
  trips() { return this.tripResult; }
  routes() { return of([route]); }
  drivers() { return this.driverResult; }
  vehicles() { return this.vehicleResult; }
  assignTripResources(id: number, body: TripAssignmentRequest) { this.assignments.push({ id, body }); return this.assignmentResult; }
  reassignmentOptions(_id: number) { return this.optionsResult; }
  reassignTripResources(id: number, body: TripReassignmentRequest) { this.reassignments.push({ id, body }); return this.reassignmentResult; }
}

describe('ResourceAssignment D1 / US20', () => {
  let fixture: ComponentFixture<ResourceAssignment>;
  let component: ResourceAssignment;
  let service: CoordinatorServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ResourceAssignment], providers: [{ provide: CoordinatorService, useClass: CoordinatorServiceStub }] }).compileComponents();
    service = TestBed.inject(CoordinatorService) as unknown as CoordinatorServiceStub;
  });

  function create(): void { fixture = TestBed.createComponent(ResourceAssignment); component = fixture.componentInstance; fixture.detectChanges(); }
  function selectResources(): void { component.openAssignment(unassigned); component.form.setValue({ driverId: 4, vehicleId: 2 }); }

  it('shows loading until all real catalogs arrive', () => {
    service.tripResult = new Subject<CoordinatorTrip[]>(); create();
    expect(fixture.nativeElement.querySelector('mat-spinner')).toBeTruthy();
  });

  it('renders scheduled trips and distinguishes unassigned from assigned', () => {
    create(); const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('UPC-01'); expect(text).toContain('Sin asignación'); expect(text).toContain('Asignado');
    expect(text).toContain('Ana Ruiz'); expect(text).toContain('ABC-123'); expect(text).not.toContain('secret');
  });

  it('does not offer initial assignment again for an assigned trip', () => {
    create(); component.openAssignment(assigned);
    expect(component.selectedTrip()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('La asignación inicial ya fue realizada');
  });

  it('filters ineligible resources and reports empty candidate catalogs', () => {
    service.driverResult = of([{ ...driver, operationalStatus: 'UNAVAILABLE' }]);
    service.vehicleResult = of([{ ...vehicle, authorizationStatus: 'PENDING' }]);
    create(); component.openAssignment(unassigned); fixture.detectChanges();
    expect(component.eligibleDrivers()).toHaveLength(0); expect(component.eligibleVehicles()).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain('No hay conductores autorizados');
    expect(fixture.nativeElement.textContent).toContain('No hay vehículos autorizados');
  });

  it('keeps review disabled until both resources are selected', () => {
    create(); component.openAssignment(unassigned); fixture.detectChanges();
    const button = [...fixture.nativeElement.querySelectorAll('button')].find((item: HTMLButtonElement) => item.textContent.includes('Revisar')) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    component.form.controls.driverId.setValue(4); fixture.detectChanges(); expect(button.disabled).toBe(true);
    component.form.controls.vehicleId.setValue(2); fixture.detectChanges(); expect(button.disabled).toBe(false);
  });

  it('opens a human confirmation and submits the exact assignment DTO', () => {
    create(); selectResources(); component.reviewAssignment(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Confirmar asignación');
    expect(fixture.nativeElement.textContent).toContain('San Miguel');
    component.confirmAssignment();
    expect(service.assignments).toEqual([{ id: 30, body: { driverId: 4, vehicleId: 2 } }]);
    expect(component.notice()).toBe('Recursos asignados correctamente.');
  });

  it('prevents a duplicate submit while the request is pending', () => {
    service.assignmentResult = new Subject<CoordinatorTrip>(); create(); selectResources(); component.reviewAssignment();
    component.confirmAssignment(); component.confirmAssignment();
    expect(service.assignments).toHaveLength(1); expect(component.saving()).toBe(true);
  });

  it('reconstructs the persisted assignment from backend data after a new component load', () => {
    service.tripResult = of([assigned]); create();
    expect(component.hasCompleteAssignment(component.scheduledTrips()[0])).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Ana Ruiz');
  });

  it('shows a recoverable loading error', () => {
    service.tripResult = throwError(() => new HttpErrorResponse({ status: 503 })); create();
    expect(fixture.nativeElement.textContent).toContain('Reintentar');
  });

  it('shows the empty state when there are no manageable trips', () => {
    service.tripResult = of([{ ...assigned, status: 'COMPLETED' }]); create();
    expect(fixture.nativeElement.textContent).toContain('No hay viajes operativos para gestionar');
  });

  it('keeps the assignment form and refreshes data after a conflict', () => {
    service.assignmentResult = throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'El recurso seleccionado no se encuentra disponible' } }));
    create(); selectResources(); component.reviewAssignment(); component.confirmAssignment();
    expect(component.selectedTrip()?.id).toBe(30);
    expect(component.assignmentError()).toContain('ya no está disponible');
  });

  it.each([
    [400, 'Solo se pueden asignar recursos a un viaje programado.', 'Solo se pueden asignar recursos'],
    [401, '', 'sesión venció'], [403, '', 'permiso'], [404, '', 'ya no existe'],
    [409, 'El viaje ya tiene recursos asignados; utilice la reasignación.', 'ya cuenta con recursos'],
  ])('maps HTTP %i without exposing raw errors', (status, message, expected) => {
    expect(assignmentErrorMessage(new HttpErrorResponse({ status, error: { message } }))).toContain(expected);
  });
});

describe('ResourceAssignment D2 / US21', () => {
  let fixture: ComponentFixture<ResourceAssignment>;
  let component: ResourceAssignment;
  let service: CoordinatorServiceStub;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ResourceAssignment], providers: [{ provide: CoordinatorService, useClass: CoordinatorServiceStub }] }).compileComponents();
    service = TestBed.inject(CoordinatorService) as unknown as CoordinatorServiceStub;
    fixture = TestBed.createComponent(ResourceAssignment); component = fixture.componentInstance; fixture.detectChanges();
  });
  it('loads only backend-approved alternatives and never displays QR data', () => {
    component.openReassignment(assigned); fixture.detectChanges(); const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Luis Pérez'); expect(text).toContain('NEW-008'); expect(text).not.toContain('secret');
    expect(component.reassignmentOptions()?.tripId).toBe(31);
  });
  it('rejects a no-op before calling the backend', () => {
    component.openReassignment(assigned); component.reviewReassignment();
    expect(service.reassignments).toHaveLength(0); expect(component.reassignmentError()).toContain('Selecciona al menos');
  });
  it.each([
    [{ driverId: 9, vehicleId: null }, 'driver'],
    [{ driverId: null, vehicleId: 8 }, 'vehicle'],
    [{ driverId: 9, vehicleId: 8 }, 'both'],
  ] as const)('submits a valid replacement', (body, _kind) => {
    component.openReassignment(assigned); component.reassignmentForm.setValue(body); component.reviewReassignment(); component.confirmReassignment();
    expect(service.reassignments[0]).toEqual({ id: 31, body }); expect(component.notice()).toContain('reasignados correctamente');
  });
  it('blocks duplicate reassignment submissions', () => {
    service.reassignmentResult = new Subject<CoordinatorTrip>(); component.openReassignment(assigned); component.reassignmentForm.patchValue({ driverId: 9 }); component.reviewReassignment();
    component.confirmReassignment(); component.confirmReassignment();
    expect(service.reassignments).toHaveLength(1); expect(component.saving()).toBe(true);
  });
  it('reflects a persisted reassignment marker from backend data', () => {
    service.tripResult = of([{ ...assigned, driverId: 9, wasReassigned: true }]); fixture.destroy(); fixture = TestBed.createComponent(ResourceAssignment); component = fixture.componentInstance; fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Reasignado');
  });
  it.each([
    [400, 'La reasignación no modifica los recursos del viaje.', 'no modifica'],
    [401, '', 'sesión venció'], [403, '', 'permiso'], [404, '', 'ya no existe'], [409, '', 'ya no está disponible'],
  ])('maps reassignment HTTP %i to a human message', (status, message, expected) => {
    expect(reassignmentErrorMessage(new HttpErrorResponse({ status, error: { message } }))).toContain(expected);
  });
});
