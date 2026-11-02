import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { FamilyDriverCredential, FamilyUpcomingTrip, NotificationPreferences } from '../../../core/models/family.models';
import { FamilyService } from '../../../core/services/family.service';
import { FamilyTracking } from './family-tracking';

const preferences: NotificationPreferences = { linkId: 7, studentId: 2, notifyBoarding: true, notifyArrival: true, notifyDelay: false, notifyVehicleChange: true, notifyIncident: true };
const driver: FamilyDriverCredential = { assigned: true, message: 'Disponible', driverId: 80, fullName: 'Carlos Chofer', credentialImageUrl: null, credentialImageAvailable: false, licenseNumber: 'LIC-123', licenseCategory: 'AIII-C', licenseExpiration: '2030-01-01', licenseExpired: false, authorizationStatus: 'AUTHORIZED', operationalStatus: 'AVAILABLE', authorized: true };
const trip: FamilyUpcomingTrip = { tripId: 40, routeId: 5, routeCode: 'UPC-SMI-01', routeName: 'San Miguel - UPC', routeOrigin: 'San Miguel', routeDestination: 'UPC Monterrico', institutionName: 'UPC', campusName: 'Monterrico', stopId: 10, stopName: 'Plaza San Miguel', scheduledStartAt: '2026-11-03T12:00:00Z', scheduledEndAt: '2026-11-03T13:00:00Z', status: 'SCHEDULED', resourcesReassigned: false, studentRouteOrStopModified: false, modificationMessage: null };

class FamilyServiceStub {
  ids: Observable<number[]> = of([2]);
  trips: Observable<FamilyUpcomingTrip[]> = of([trip]);
  driver: Observable<FamilyDriverCredential> = of(driver);
  preferences: Observable<NotificationPreferences> = of(preferences);
  saved = false;
  getLinkedStudentIds() { return this.ids; }
  getUpcomingTrips() { return this.trips; }
  getCurrentDriverCredential() { return this.driver; }
  getNotificationPreferences() { return this.preferences; }
  updateNotificationPreferences() { this.saved = true; return this.preferences; }
}

describe('FamilyTracking US06', () => {
  let fixture: ComponentFixture<FamilyTracking>;
  let service: FamilyServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FamilyTracking], providers: [{ provide: FamilyService, useClass: FamilyServiceStub }] }).compileComponents();
    service = TestBed.inject(FamilyService) as unknown as FamilyServiceStub;
  });

  it('loads linked students, upcoming tracking, credential and preferences', () => {
    fixture = TestBed.createComponent(FamilyTracking); fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Estudiante vinculado 1');
    expect(text).toContain('UPC-SMI-01');
    expect(text).toContain('Carlos Chofer');
    expect(fixture.componentInstance.preferencesForm.controls.notifyBoarding.value).toBe(true);
  });

  it('shows a non-error empty state without linked students', () => {
    service.ids = of([]);
    fixture = TestBed.createComponent(FamilyTracking); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No tienes estudiantes vinculados');
  });

  it('shows an empty upcoming-trip state', () => {
    service.trips = of([]);
    fixture = TestBed.createComponent(FamilyTracking); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('no tiene próximos viajes');
  });

  it('saves the five real notification preferences', () => {
    fixture = TestBed.createComponent(FamilyTracking); fixture.detectChanges();
    fixture.componentInstance.savePreferences(); fixture.detectChanges();
    expect(service.saved).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Preferencias guardadas correctamente');
  });

  it('shows a readable authorization error', () => {
    service.ids = throwError(() => new HttpErrorResponse({ status: 403 }));
    fixture = TestBed.createComponent(FamilyTracking); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No tienes autorización');
  });
});
