import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { DriverAdmin, DriverRequest, RouteAdmin, RouteRequest, RouteStopAdmin, RouteStopRequest, StopRequest, VehicleAdmin, VehicleRequest } from '../../core/models/coordinator.models';
import { CoordinatorService } from '../../core/services/coordinator.service';
import { DriverManagement } from './drivers/driver-management';
import { RouteManagement } from './route-management/route-management';
import { VehicleManagement } from './vehicles/vehicle-management';

const route: RouteAdmin = { id: 7, institutionId: 1, code: 'R-12', name: 'Ruta Centro', origin: 'Norte', destination: 'Campus', description: null, capacity: 30, status: 'ACTIVE' };
const secondRoute: RouteAdmin = { ...route, id: 8, code: 'R-13', name: 'Ruta Sur', origin: 'Sur' };
const driver: DriverAdmin = { id: 4, userId: 8, fullName: 'Ana Ruiz', email: 'ana@wayrapass.test', phone: null, licenseNumber: 'Q123', licenseCategory: 'AIIIc', licenseExpiration: '2027-01-01', credentialImageUrl: null, authorizationStatus: 'AUTHORIZED', operationalStatus: 'AVAILABLE', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
const vehicle: VehicleAdmin = { id: 2, plate: 'ABC-123', brand: 'Toyota', model: 'Coaster', capacity: 28, qrToken: 'hidden', authorizationStatus: 'AUTHORIZED', operationalStatus: 'AVAILABLE' };

class CoordinatorServiceStub {
  routeResult: Observable<RouteAdmin[]> = of([route, secondRoute]); driverResult: Observable<DriverAdmin[]> = of([driver]); vehicleResult: Observable<VehicleAdmin[]> = of([vehicle]);
  routeStopResult: Observable<RouteStopAdmin[]> = of([{ id: 2, routeId: 7, stopId: 2, stopOrder: 2, estimatedMinutesFromStart: 10, active: true }, { id: 1, routeId: 7, stopId: 1, stopOrder: 1, estimatedMinutesFromStart: 0, active: true }]);
  createdRoutes: RouteRequest[] = []; createdDrivers: DriverRequest[] = []; createdVehicles: VehicleRequest[] = [];
  routes() { return this.routeResult; } institutions() { return of([{ id: 1, name: 'UPC', campusName: 'Monterrico', address: null, district: 'Surco', active: true, createdAt: '' }]); }
  stops() { return of([{ id: 1, name: 'Inicio', address: 'Av. A', district: 'Lima', latitude: null, longitude: null, active: true }, { id: 2, name: 'Campus', address: 'Av. B', district: 'Surco', latitude: null, longitude: null, active: true }]); }
  schedules() { return of([]); } routeStops() { return this.routeStopResult; }
  createRoute(request: RouteRequest) { this.createdRoutes.push(request); return of({ id: 9, ...request }); } updateRoute(_id: number, request: RouteRequest) { return of({ id: 7, ...request }); }
  createRouteStop(request: RouteStopRequest) { return of({ ...request, id: 3 }); } updateRouteStop(id: number, request: RouteStopRequest) { return of({ ...request, id }); }
  createStop(_request: StopRequest) { return of({ id: 3, ..._request }); } updateStop(id: number, request: StopRequest) { return of({ id, ...request }); }
  drivers() { return this.driverResult; } createDriver(request: DriverRequest) { this.createdDrivers.push(request); return of({ ...driver, id: 5, userId: 9, ...request, password: undefined }); } updateDriver(_id: number, request: DriverRequest) { return of({ ...driver, ...request }); }
  vehicles() { return this.vehicleResult; } createVehicle(request: VehicleRequest) { this.createdVehicles.push(request); return of({ id: 3, ...request, qrToken: 'generated' }); } updateVehicle(_id: number, request: VehicleRequest) { return of({ ...vehicle, ...request, qrToken: vehicle.qrToken }); }
}

describe('RouteManagement C3', () => {
  let fixture: ComponentFixture<RouteManagement>; let service: CoordinatorServiceStub;
  beforeEach(async () => { await TestBed.configureTestingModule({ imports: [RouteManagement], providers: [provideRouter([]), { provide: CoordinatorService, useClass: CoordinatorServiceStub }] }).compileComponents(); service = TestBed.inject(CoordinatorService) as unknown as CoordinatorServiceStub; });
  function create() { fixture = TestBed.createComponent(RouteManagement); fixture.detectChanges(); }
  it('renders backend routes and supports the empty state', () => { create(); expect(fixture.nativeElement.textContent).toContain('R-12'); service.routeResult = of([]); fixture.destroy(); create(); expect(fixture.nativeElement.textContent).toContain('No hay rutas registradas'); });
  it('shows loading and recoverable errors', () => { service.routeResult = new Subject<RouteAdmin[]>(); create(); expect(fixture.nativeElement.querySelector('mat-spinner')).toBeTruthy(); fixture.destroy(); service.routeResult = throwError(() => new HttpErrorResponse({ status: 503 })); create(); expect(fixture.nativeElement.textContent).toContain('Reintentar'); });
  it('validates and creates a persistent route DTO', () => { create(); fixture.componentInstance.openRouteForm(); fixture.componentInstance.saveRoute(); expect(service.createdRoutes).toHaveLength(0); fixture.componentInstance.routeForm.setValue({ institutionId: 1, code: ' r-20 ', name: 'Ruta nueva', origin: 'A', destination: 'B', description: '', capacity: 20, status: 'ACTIVE' }); fixture.componentInstance.saveRoute(); expect(service.createdRoutes[0]).toEqual({ institutionId: 1, code: 'R-20', name: 'Ruta nueva', origin: 'A', destination: 'B', description: null, capacity: 20, status: 'ACTIVE' }); expect(fixture.componentInstance.routes().some((item) => item.id === 9)).toBe(true); });
  it('starts collapsed and expands the selected route inline with ordered stops', () => {
    create();
    expect(fixture.componentInstance.selectedRoute()).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.route-detail-row')).toHaveLength(0);

    fixture.componentInstance.selectRoute(route); fixture.detectChanges();

    const detail = fixture.nativeElement.querySelector('.route-detail-row');
    expect(detail).toBeTruthy();
    expect(detail.previousElementSibling.textContent).toContain('R-12');
    expect(detail.textContent).toContain('Paraderos de R-12');
    expect(detail.textContent).toContain('Asociar paradero');
    expect(fixture.componentInstance.orderedSelectedStops().map((item) => item.stopOrder)).toEqual([1, 2]);
  });
  it('closes the current detail when the same route is selected again', () => {
    create(); fixture.componentInstance.selectRoute(route); fixture.detectChanges();
    fixture.componentInstance.selectRoute(route); fixture.detectChanges();
    expect(fixture.componentInstance.selectedRoute()).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.route-detail-row')).toHaveLength(0);
  });
  it('keeps only the most recently selected route expanded', () => {
    create(); fixture.componentInstance.selectRoute(route); fixture.detectChanges();
    fixture.componentInstance.selectRoute(secondRoute); fixture.detectChanges();
    const details = fixture.nativeElement.querySelectorAll('.route-detail-row');
    expect(details).toHaveLength(1);
    expect(details[0].previousElementSibling.textContent).toContain('R-13');
    expect(details[0].textContent).toContain('Paraderos de R-13');
  });
  it('keeps association and reordering operations connected to the expanded route', () => {
    create(); fixture.componentInstance.selectRoute(route);
    fixture.componentInstance.openAssociation();
    expect(fixture.componentInstance.associationOpen()).toBe(true);
    const first = fixture.componentInstance.orderedSelectedStops()[0];
    fixture.componentInstance.move(first, 1);
    expect(fixture.componentInstance.orderedSelectedStops().map((item) => item.stopOrder)).toEqual([1, 2]);
  });
});

describe('DriverManagement C3', () => {
  let fixture: ComponentFixture<DriverManagement>; let service: CoordinatorServiceStub;
  beforeEach(async () => { await TestBed.configureTestingModule({ imports: [DriverManagement], providers: [{ provide: CoordinatorService, useClass: CoordinatorServiceStub }] }).compileComponents(); service = TestBed.inject(CoordinatorService) as unknown as CoordinatorServiceStub; fixture = TestBed.createComponent(DriverManagement); fixture.detectChanges(); });
  it('lists drivers with translated states and license data', () => { const text = fixture.nativeElement.textContent as string; expect(text).toContain('Ana Ruiz'); expect(text).toContain('Q123'); expect(text).toContain('Autorizado'); expect(text).toContain('Disponible'); });
  it('creates the user and driver in one request', () => { fixture.componentInstance.open(); fixture.componentInstance.form.setValue({ fullName: 'Luis Pérez', email: 'luis@test.com', password: 'Temporal123!', phone: '', licenseNumber: 'L-9', licenseCategory: 'AIIb', licenseExpiration: '2027-01-01', credentialImageUrl: '', authorizationStatus: 'AUTHORIZED', operationalStatus: 'AVAILABLE' }); fixture.componentInstance.save(); expect(service.createdDrivers[0].email).toBe('luis@test.com'); expect(service.createdDrivers[0].password).toBe('Temporal123!'); expect(fixture.nativeElement.textContent).not.toContain('userId'); });
  it('validates password, license state and backend conflicts', () => { fixture.componentInstance.open(); fixture.componentInstance.form.patchValue({ password: 'short' }); fixture.componentInstance.save(); expect(service.createdDrivers).toHaveLength(0); service.driverResult = throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'El correo ya existe.' } })); fixture.componentInstance.load(); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('El correo ya existe'); });
});

describe('VehicleManagement C3', () => {
  let fixture: ComponentFixture<VehicleManagement>; let service: CoordinatorServiceStub;
  beforeEach(async () => { await TestBed.configureTestingModule({ imports: [VehicleManagement], providers: [{ provide: CoordinatorService, useClass: CoordinatorServiceStub }] }).compileComponents(); service = TestBed.inject(CoordinatorService) as unknown as CoordinatorServiceStub; fixture = TestBed.createComponent(VehicleManagement); fixture.detectChanges(); });
  it('lists vehicles without exposing their QR token', () => { const text = fixture.nativeElement.textContent as string; expect(text).toContain('ABC-123'); expect(text).toContain('28 pasajeros'); expect(text).not.toContain('hidden'); });
  it('validates capacity and creates a normalized vehicle', () => { fixture.componentInstance.open(); fixture.componentInstance.form.setValue({ plate: ' abc-999 ', brand: 'Toyota', model: 'Hiace', capacity: 0, qrToken: '', authorizationStatus: 'AUTHORIZED', operationalStatus: 'AVAILABLE' }); fixture.componentInstance.save(); expect(service.createdVehicles).toHaveLength(0); fixture.componentInstance.form.controls.capacity.setValue(20); fixture.componentInstance.save(); expect(service.createdVehicles[0]).toEqual({ plate: 'ABC-999', brand: 'Toyota', model: 'Hiace', capacity: 20, qrToken: null, authorizationStatus: 'AUTHORIZED', operationalStatus: 'AVAILABLE' }); });
  it('shows backend errors and preserves real status labels', () => { expect(fixture.componentInstance.operationLabel('MAINTENANCE')).toBe('Mantenimiento'); service.vehicleResult = throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'La placa ya existe.' } })); fixture.componentInstance.load(); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('La placa ya existe'); });
});
