import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { CreateIncidentRequest } from '../models/incident.models';
import { IncidentService } from './incident.service';

describe('IncidentService US17', () => {
  let service: IncidentService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [IncidentService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(IncidentService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('posts the exact incident DTO without a driver id', () => {
    const body: CreateIncidentRequest = {
      tripId: 30,
      type: 'TRAFFIC_DELAY',
      description: 'Congestión intensa',
      delayMinutes: 12,
      priority: 'HIGH',
    };
    service.create(body).subscribe((response) => expect(response.tripId).toBe(30));

    const request = http.expectOne(`${environment.apiUrl}/incidents`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    expect(request.request.body.driverId).toBeUndefined();
    request.flush({ ...body, id: 90, routeId: 7, driverId: 4, status: 'OPEN', createdAt: '2026-11-02T20:00:00Z' });
  });
});
