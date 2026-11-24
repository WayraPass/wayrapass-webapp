import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { NOTIFICATION_POLL_MS, NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(NotificationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { service.stopPolling(); http.verify(); vi.useRealTimers(); });

  it('requests the authenticated user notifications from the existing endpoint', () => {
    service.getMyNotifications().subscribe();
    const request = http.expectOne(`${environment.apiUrl}/notifications/me`);
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('orders notifications, avoids an initial false alert, and detects a later new one', () => {
    service.startPolling(); vi.advanceTimersByTime(0);
    http.expectOne(`${environment.apiUrl}/notifications/me`).flush([
      { id: 1, type: 'GENERAL', title: 'Primero', message: 'Mensaje', createdAt: '2026-11-20T15:00:00Z', readAt: null },
      { id: 2, type: 'BOARDING', title: 'Más reciente', message: 'Mensaje', createdAt: '2026-11-20T16:00:00Z', readAt: null },
    ]);
    expect(service.notifications().map((notification) => notification.id)).toEqual([2, 1]);
    expect(service.latestNotification()).toBeNull();

    vi.advanceTimersByTime(NOTIFICATION_POLL_MS);
    http.expectOne(`${environment.apiUrl}/notifications/me`).flush([
      { id: 3, type: 'ARRIVAL', title: 'Llegada confirmada', message: 'Mensaje', createdAt: '2026-11-20T17:00:00Z', readAt: null },
      { id: 2, type: 'BOARDING', title: 'Más reciente', message: 'Mensaje', createdAt: '2026-11-20T16:00:00Z', readAt: null },
      { id: 1, type: 'GENERAL', title: 'Primero', message: 'Mensaje', createdAt: '2026-11-20T15:00:00Z', readAt: null },
    ]);
    expect(service.latestNotification()?.id).toBe(3);
  });

  it('does not start duplicate polling subscriptions and stops polling on request', () => {
    service.startPolling(); service.startPolling(); vi.advanceTimersByTime(0);
    http.expectOne(`${environment.apiUrl}/notifications/me`).flush([]);
    service.stopPolling(); vi.advanceTimersByTime(NOTIFICATION_POLL_MS);
    http.expectNone(`${environment.apiUrl}/notifications/me`);
  });
});
