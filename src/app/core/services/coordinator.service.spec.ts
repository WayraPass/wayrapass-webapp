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
});
