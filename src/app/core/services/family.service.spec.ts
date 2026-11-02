import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { NotificationPreferencesRequest } from '../models/family.models';
import { FamilyService } from './family.service';

describe('FamilyService B1', () => {
  let service: FamilyService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(FamilyService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads linked student identifiers', () => {
    service.getLinkedStudentIds().subscribe((ids) => expect(ids).toEqual([2, 8]));
    const request = http.expectOne(`${environment.apiUrl}/family-links/me/students`);
    expect(request.request.method).toBe('GET');
    request.flush([2, 8]);
  });

  it('updates the complete notification preferences contract', () => {
    const body: NotificationPreferencesRequest = { notifyBoarding: true, notifyArrival: false, notifyDelay: true, notifyVehicleChange: false, notifyIncident: true };
    service.updateNotificationPreferences(2, body).subscribe();
    const request = http.expectOne(`${environment.apiUrl}/family-links/me/students/2/notification-preferences`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(body);
    request.flush({ linkId: 7, studentId: 2, ...body });
  });

  it('queries FAMILY history and detail', () => {
    service.getHistory(2, '2026-01-01', '2026-11-02').subscribe();
    const list = http.expectOne((request) => request.url.endsWith('/family-links/me/students/2/trip-history'));
    expect(list.request.params.get('from')).toBe('2026-01-01');
    expect(list.request.params.get('to')).toBe('2026-11-02');
    list.flush([]);

    service.getHistoryDetail(2, 31).subscribe();
    const detail = http.expectOne(`${environment.apiUrl}/family-links/me/students/2/trip-history/31`);
    expect(detail.request.method).toBe('GET');
    detail.flush({ trip: null, incidents: [] });
  });
});
