import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { CoordinatorService } from './coordinator.service';

describe('CoordinatorService C3', () => {
  let service: CoordinatorService; let http: HttpTestingController;
  beforeEach(() => { TestBed.configureTestingModule({ providers: [CoordinatorService, provideHttpClient(), provideHttpClientTesting()] }); service = TestBed.inject(CoordinatorService); http = TestBed.inject(HttpTestingController); });
  afterEach(() => http.verify());
  it('uses real route and route-stop contracts', () => {
    service.routes().subscribe(); const routesRequest = http.expectOne(`${environment.apiUrl}/routes`); expect(routesRequest.request.method).toBe('GET'); routesRequest.flush([]);
    service.routeStops(7).subscribe(); const associations = http.expectOne(`${environment.apiUrl}/route-stops/route/7`); expect(associations.request.method).toBe('GET'); associations.flush([]);
    const body = { routeId: 7, stopId: 3, stopOrder: 1, estimatedMinutesFromStart: 0, active: true };
    service.createRouteStop(body).subscribe(); const create = http.expectOne(`${environment.apiUrl}/route-stops`); expect(create.request.method).toBe('POST'); expect(create.request.body).toEqual(body); create.flush({ id: 1, ...body });
  });
  it('creates and updates routes with the exact DTO', () => {
    const body = { institutionId: 1, code: 'R-1', name: 'Ruta', origin: 'A', destination: 'B', description: null, capacity: 20, status: 'ACTIVE' as const };
    service.createRoute(body).subscribe(); const create = http.expectOne(`${environment.apiUrl}/routes`); expect(create.request.method).toBe('POST'); expect(create.request.body).toEqual(body); create.flush({ id: 9, ...body });
    service.updateRoute(9, body).subscribe(); const update = http.expectOne(`${environment.apiUrl}/routes/9`); expect(update.request.method).toBe('PUT'); update.flush({ id: 9, ...body });
  });
  it('uses real stop contracts', () => {
    const body = { name: 'Paradero', address: null, district: 'Lima', latitude: null, longitude: null, active: true };
    service.stops().subscribe(); http.expectOne(`${environment.apiUrl}/stops`).flush([]);
    service.createStop(body).subscribe(); const request = http.expectOne(`${environment.apiUrl}/stops`); expect(request.request.method).toBe('POST'); expect(request.request.body).toEqual(body); request.flush({ id: 3, ...body });
  });
  it('creates an integral driver account without a user id', () => {
    const body = { fullName: 'Ana Ruiz', email: 'ana@wayrapass.test', password: 'Temporal123!', phone: null, licenseNumber: 'Q123', licenseCategory: 'AIIIc', licenseExpiration: '2027-01-01', credentialImageUrl: null, authorizationStatus: 'AUTHORIZED' as const, operationalStatus: 'AVAILABLE' as const };
    service.createDriver(body).subscribe(); const request = http.expectOne(`${environment.apiUrl}/drivers`); expect(request.request.method).toBe('POST'); expect(request.request.body).toEqual(body); expect(request.request.body.userId).toBeUndefined(); request.flush({ id: 4, userId: 8, ...body });
  });
  it('lists, creates and updates vehicles without exposing new endpoints', () => {
    service.vehicles().subscribe(); http.expectOne(`${environment.apiUrl}/vehicles`).flush([]);
    const body = { plate: 'ABC-123', brand: 'Toyota', model: 'Coaster', capacity: 28, qrToken: null, authorizationStatus: 'AUTHORIZED' as const, operationalStatus: 'AVAILABLE' as const };
    service.createVehicle(body).subscribe(); const create = http.expectOne(`${environment.apiUrl}/vehicles`); expect(create.request.method).toBe('POST'); create.flush({ id: 2, ...body, qrToken: 'generated' });
    service.updateVehicle(2, body).subscribe(); const update = http.expectOne(`${environment.apiUrl}/vehicles/2`); expect(update.request.method).toBe('PUT'); update.flush({ id: 2, ...body, qrToken: 'generated' });
  });
  it('uses the exact US20 trip and initial-assignment contracts', () => {
    service.trips().subscribe(); const list = http.expectOne(`${environment.apiUrl}/trips`); expect(list.request.method).toBe('GET'); list.flush([]);
    const body = { driverId: 4, vehicleId: 2 };
    service.assignTripResources(30, body).subscribe();
    const assignment = http.expectOne(`${environment.apiUrl}/trips/30/assignment`);
    expect(assignment.request.method).toBe('PUT');
    expect(assignment.request.body).toEqual(body);
    expect(assignment.request.body.coordinatorId).toBeUndefined();
    assignment.flush({ id: 30, routeId: 7, driverId: 4, vehicleId: 2, scheduledStartAt: '2026-11-04T13:00:00Z', scheduledEndAt: '2026-11-04T14:00:00Z', estimatedArrivalAt: null, status: 'SCHEDULED', wasReassigned: false });
  });
  it('creates an E1 trip without assigning driver or vehicle', () => {
    const body = { routeId: 4, routeScheduleId: 12, driverId: null, vehicleId: null, scheduledStartAt: '2099-11-10T13:00:00.000Z', scheduledEndAt: '2099-11-10T14:00:00.000Z' };
    service.createTrip(body).subscribe(); const request = http.expectOne(`${environment.apiUrl}/trips`);
    expect(request.request.method).toBe('POST'); expect(request.request.body).toEqual(body); expect(request.request.body.driverId).toBeNull(); expect(request.request.body.vehicleId).toBeNull();
    request.flush({ id: 40, routeId: 4, driverId: null, vehicleId: null, scheduledStartAt: body.scheduledStartAt, scheduledEndAt: body.scheduledEndAt, estimatedArrivalAt: null, status: 'SCHEDULED', wasReassigned: false }, { status: 201, statusText: 'Created' });
  });
  it('uses the exact US21 options and partial-reassignment contracts', () => {
    service.reassignmentOptions(30).subscribe(); const options = http.expectOne(`${environment.apiUrl}/trips/30/reassignment-options`); expect(options.request.method).toBe('GET'); options.flush({ tripId: 30, drivers: [], vehicles: [], message: null });
    const driverOnly = { driverId: 9, vehicleId: null };
    service.reassignTripResources(30, driverOnly).subscribe(); const first = http.expectOne(`${environment.apiUrl}/trips/30/reassignment`); expect(first.request.method).toBe('PUT'); expect(first.request.body).toEqual(driverOnly); first.flush({ id: 30 });
    const vehicleOnly = { driverId: null, vehicleId: 8 };
    service.reassignTripResources(30, vehicleOnly).subscribe(); const second = http.expectOne(`${environment.apiUrl}/trips/30/reassignment`); expect(second.request.body).toEqual(vehicleOnly); second.flush({ id: 30 });
    const both = { driverId: 9, vehicleId: 8 };
    service.reassignTripResources(30, both).subscribe(); const third = http.expectOne(`${environment.apiUrl}/trips/30/reassignment`); expect(third.request.body).toEqual(both); third.flush({ id: 30 });
  });
  it('uses the exact US22 Monday-to-Sunday calendar contract', () => {
    service.weeklyCalendar('2026-11-02', '2026-11-08').subscribe();
    const request = http.expectOne((candidate) => candidate.url === `${environment.apiUrl}/trips/calendar`);
    expect(request.request.method).toBe('GET'); expect(request.request.params.get('from')).toBe('2026-11-02'); expect(request.request.params.get('to')).toBe('2026-11-08'); request.flush([]);
  });
  it.each(['ALL', 'PUNCTUALITY', 'OCCUPANCY', 'INCIDENTS', 'STOP_DEMAND'] as const)('uses the exact US23 contract for %s', (indicator) => {
    service.operationalReport('2026-10-01', '2026-10-31', indicator).subscribe();
    const request = http.expectOne((candidate) => candidate.url === `${environment.apiUrl}/reports/operations`);
    expect(request.request.method).toBe('GET'); expect(request.request.params.get('from')).toBe('2026-10-01'); expect(request.request.params.get('to')).toBe('2026-10-31'); expect(request.request.params.get('indicator')).toBe(indicator);
    expect(request.request.params.keys()).toEqual(['from', 'to', 'indicator']);
    request.flush({ period: { from: '2026-10-01', to: '2026-10-31', zoneId: 'America/Lima' }, indicator, generatedAt: '2026-11-03T12:00:00Z', hasData: false, message: 'Sin datos', punctuality: null, occupancy: null, incidents: null, stopDemand: null });
  });
  it.each([['PDF', 'application/pdf'], ['XLSX', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']] as const)('uses the exact US24 %s blob contract', (format, contentType) => {
    service.exportOperationalReport('2026-10-01', '2026-10-31', 'ALL', format).subscribe((response) => expect(response.body?.type).toBe(contentType));
    const request = http.expectOne((candidate) => candidate.url === `${environment.apiUrl}/reports/operations/export`);
    expect(request.request.method).toBe('GET'); expect(request.request.responseType).toBe('blob'); expect(request.request.params.get('format')).toBe(format); expect(request.request.params.get('indicator')).toBe('ALL');
    request.flush(new Blob(['report'], { type: contentType }), { headers: { 'Content-Type': contentType, 'Content-Disposition': `attachment; filename="report.${format.toLowerCase()}"` } });
  });
});
