import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { TripService } from './trip.service';

describe('TripService US03/US04/US08', () => {
  let service: TripService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TripService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TripService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests the current trip of the authenticated student', () => {
    service.getCurrentTrip().subscribe((response) => expect(response.available).toBe(false));

    const request = http.expectOne(`${environment.apiUrl}/trips/me/current`);
    expect(request.request.method).toBe('GET');
    request.flush({ available: false, message: 'No hay un viaje actual.', trip: null });
  });

  it('requests the authenticated student history with the required date range', () => {
    service.getHistory('2026-10-01', '2026-11-02').subscribe((history) => expect(history).toEqual([]));

    const request = http.expectOne((candidate) => candidate.url === `${environment.apiUrl}/trips/me/history`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('from')).toBe('2026-10-01');
    expect(request.request.params.get('to')).toBe('2026-11-02');
    request.flush([]);
  });

  it('requests a history detail owned by the authenticated student', () => {
    service.getHistoryDetail(31).subscribe();

    const request = http.expectOne(`${environment.apiUrl}/trips/me/history/31`);
    expect(request.request.method).toBe('GET');
    request.flush({ trip: null, driverId: null, driverName: null, vehicleId: null, vehiclePlate: null, vehicleBrand: null, vehicleModel: null, incidents: [] });
  });
});
