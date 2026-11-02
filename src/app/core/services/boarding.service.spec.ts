import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { BoardingService } from './boarding.service';

describe('BoardingService US05', () => {
  let service: BoardingService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BoardingService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(BoardingService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('posts the real trip, stop and QR-token contract', () => {
    const body = { tripId: 4, stopId: 118, vehicleQrToken: 'QR-WP-D01' };
    service.confirm(body).subscribe((response) => expect(response.tripId).toBe(4));

    const request = http.expectOne(`${environment.apiUrl}/boardings`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({ id: 1, tripId: 4, studentId: 1, stopId: 118, boardedAt: '2026-11-02T12:00:00Z' });
  });
});
