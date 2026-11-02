import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { TripService } from './trip.service';

describe('TripService US03/US04', () => {
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
});
