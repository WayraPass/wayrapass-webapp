import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { RouteService } from './route.service';

describe('RouteService US02', () => {
  let service: RouteService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RouteService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RouteService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the public institution and authenticated pickup catalogs', () => {
    service.getPublicInstitutions().subscribe((institutions) => expect(institutions).toEqual([]));
    const institutions = http.expectOne(`${environment.apiUrl}/public/institutions`);
    expect(institutions.request.method).toBe('GET');
    institutions.flush([]);

    service.getDistricts().subscribe((districts) => expect(districts).toEqual(['San Miguel']));
    const districts = http.expectOne(`${environment.apiUrl}/routes/catalog/districts`);
    expect(districts.request.method).toBe('GET');
    districts.flush(['San Miguel']);

    service.getStopsByDistrict('San Miguel').subscribe((stops) => expect(stops).toEqual([]));
    const stops = http.expectOne((candidate) => candidate.url === `${environment.apiUrl}/routes/catalog/stops`);
    expect(stops.request.params.get('district')).toBe('San Miguel');
    stops.flush([]);
  });

  it('uses grouped search and omits empty filters', () => {
    service.searchGroupedRoutes({
      institutionId: 25,
      district: 'San Miguel',
      stopId: 118,
      time: '08:15',
    }).subscribe((results) => expect(results).toEqual([]));

    const request = http.expectOne((candidate) => candidate.url === `${environment.apiUrl}/routes/search/grouped`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('institutionId')).toBe('25');
    expect(request.request.params.get('district')).toBe('San Miguel');
    expect(request.request.params.get('stopId')).toBe('118');
    expect(request.request.params.get('time')).toBe('08:15');
    expect(request.request.params.has('routeId')).toBe(false);
    request.flush([]);
  });

  it('sends only populated route-search filters', () => {
    service.searchRoutes({
      institutionId: 1,
      district: 'San Borja',
      time: '07:00',
      latitude: -12.1,
      longitude: -77.03,
    }).subscribe((results) => expect(results).toEqual([]));

    const request = http.expectOne((candidate) => candidate.url === `${environment.apiUrl}/routes/search`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('institutionId')).toBe('1');
    expect(request.request.params.get('district')).toBe('San Borja');
    expect(request.request.params.get('time')).toBe('07:00');
    expect(request.request.params.get('latitude')).toBe('-12.1');
    expect(request.request.params.get('longitude')).toBe('-77.03');
    expect(request.request.params.has('routeId')).toBe(false);
    request.flush([]);
  });

  it('uses the authenticated-user favorite endpoints', () => {
    service.addFavorite(5).subscribe();
    const add = http.expectOne(`${environment.apiUrl}/favorites/me/5`);
    expect(add.request.method).toBe('POST');
    add.flush(null);

    service.removeFavorite(5).subscribe();
    const remove = http.expectOne(`${environment.apiUrl}/favorites/me/5`);
    expect(remove.request.method).toBe('DELETE');
    remove.flush(null);
  });
});
