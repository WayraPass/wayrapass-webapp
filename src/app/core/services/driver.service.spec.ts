import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { DriverService } from './driver.service';

describe('DriverService US16', () => {
  let service: DriverService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DriverService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DriverService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests the authenticated driver profile', () => {
    service.getProfile().subscribe();

    const request = http.expectOne(`${environment.apiUrl}/drivers/me`);
    expect(request.request.method).toBe('GET');
    request.flush({});
  });

  it('requests assigned trips without filters or a driver id', () => {
    service.getTrips().subscribe((trips) => expect(trips).toEqual([]));

    const request = http.expectOne(`${environment.apiUrl}/trips/me`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    expect(request.request.urlWithParams).not.toContain('driverId');
    request.flush([]);
  });

  it('sends only the supported from and to filters', () => {
    service.getTrips({ from: '2026-11-02', to: '2026-11-09' }).subscribe();

    const request = http.expectOne((candidate) => candidate.url === `${environment.apiUrl}/trips/me`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys().sort()).toEqual(['from', 'to']);
    expect(request.request.params.get('from')).toBe('2026-11-02');
    expect(request.request.params.get('to')).toBe('2026-11-09');
    expect(request.request.params.has('driverId')).toBe(false);
    request.flush([]);
  });
});
