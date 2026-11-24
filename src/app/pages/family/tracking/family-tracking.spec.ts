import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { FamilyDriverCredential, FamilyUpcomingTrip, LinkedStudent, NotificationPreferences } from '../../../core/models/family.models';
import { FamilyService } from '../../../core/services/family.service';
import { FamilyTracking } from './family-tracking';

const preferences: NotificationPreferences = { linkId: 7, studentId: 2, notifyBoarding: true, notifyArrival: true, notifyDelay: false, notifyVehicleChange: true, notifyIncident: true };
const driver: FamilyDriverCredential = { assigned: true, message: 'Disponible', driverId: 80, fullName: 'Carlos Chofer', credentialImageUrl: null, credentialImageAvailable: false, licenseNumber: 'LIC-123', licenseCategory: 'AIII-C', licenseExpiration: '2030-01-01', licenseExpired: false, authorizationStatus: 'AUTHORIZED', operationalStatus: 'AVAILABLE', authorized: true };
const trip: FamilyUpcomingTrip = { tripId: 40, routeId: 5, routeCode: 'UPC-SMI-01', routeName: 'San Miguel - UPC', routeOrigin: 'San Miguel', routeDestination: 'UPC Monterrico', institutionName: 'UPC', campusName: 'Monterrico', stopId: 10, stopName: 'Plaza San Miguel', scheduledStartAt: '2026-11-03T12:00:00Z', scheduledEndAt: '2026-11-03T13:00:00Z', status: 'SCHEDULED', resourcesReassigned: false, studentRouteOrStopModified: false, modificationMessage: null };

class FamilyServiceStub {
  students: Observable<LinkedStudent[]> = of([{ studentId: 2, fullName: 'Rafael Estudiante', email: 'rafael@edu.pe', institutionName: 'UPC', campusName: 'Monterrico', relationship: 'Familiar' }]);
  trips: Observable<FamilyUpcomingTrip[]> = of([trip]);
  driver: Observable<FamilyDriverCredential> = of(driver);
  preferences: Observable<NotificationPreferences> = of(preferences);
  saved = false;
  tripCalls: number[] = [];
  driverCalls: number[] = [];
  preferenceCalls: number[] = [];
  getLinkedStudents() { return this.students; }
  getUpcomingTrips(studentId: number) { this.tripCalls.push(studentId); return this.trips; }
  getCurrentDriverCredential(studentId: number) { this.driverCalls.push(studentId); return this.driver; }
  getNotificationPreferences(studentId: number) { this.preferenceCalls.push(studentId); return this.preferences; }
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
    expect(text).toContain('Rafael Estudiante');
    expect(text).toContain('UPC-SMI-01');
    expect(text).toContain('Carlos Chofer');
    expect(fixture.componentInstance.preferencesForm.controls.notifyBoarding.value).toBe(true);
  });

  it('shows a non-error empty state without linked students', () => {
    service.students = of([]);
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
    service.students = throwError(() => new HttpErrorResponse({ status: 403 }));
    fixture = TestBed.createComponent(FamilyTracking); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No tienes autorización');
  });

  it('keeps the selected student rendered while loading only that student data', () => {
    const rafaelTrips = new Subject<FamilyUpcomingTrip[]>();
    const rafaelDriver = new Subject<FamilyDriverCredential>();
    const rafaelPreferences = new Subject<NotificationPreferences>();
    service.students = of([
      { studentId: 2, fullName: 'Gustavo Oliver Junior', email: 'gustavo@edu.pe', institutionName: 'UPC', campusName: 'Monterrico', relationship: 'Familiar' },
      { studentId: 8, fullName: 'Rafael Francisco Obregon Roca', email: 'rafael@edu.pe', institutionName: 'UPC', campusName: 'Monterrico', relationship: 'Familiar' },
    ]);
    const defaultTrips = service.trips;
    const defaultDriver = service.driver;
    const defaultPreferences = service.preferences;
    service.getUpcomingTrips = (studentId: number) => { service.tripCalls.push(studentId); return studentId === 8 ? rafaelTrips : defaultTrips; };
    service.getCurrentDriverCredential = (studentId: number) => { service.driverCalls.push(studentId); return studentId === 8 ? rafaelDriver : defaultDriver; };
    service.getNotificationPreferences = (studentId: number) => { service.preferenceCalls.push(studentId); return studentId === 8 ? rafaelPreferences : defaultPreferences; };
    fixture = TestBed.createComponent(FamilyTracking); fixture.detectChanges();

    fixture.componentInstance.selectStudent(8); fixture.detectChanges();
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    expect(fixture.componentInstance.selectedStudentId()).toBe(8);
    expect(select).toBeTruthy(); expect(select.value).toBe('8');
    expect(fixture.nativeElement.textContent).not.toContain('UPC-SMI-01');
    expect(service.tripCalls.at(-1)).toBe(8); expect(service.driverCalls.at(-1)).toBe(8); expect(service.preferenceCalls.at(-1)).toBe(8);

    rafaelTrips.next([]); rafaelTrips.complete();
    rafaelDriver.next(driver); rafaelDriver.complete();
    rafaelPreferences.next({ ...preferences, studentId: 8, notifyBoarding: false, notifyArrival: false }); rafaelPreferences.complete();
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('select') as HTMLSelectElement).value).toBe('8');
    expect(fixture.nativeElement.textContent).toContain('no tiene próximos viajes');
    expect(fixture.componentInstance.preferencesForm.controls.notifyBoarding.value).toBe(false);
  });

  it('keeps trips and preferences available when the selected student has no current driver', () => {
    service.students = of([
      { studentId: 2, fullName: 'Gustavo Oliver Junior', email: 'gustavo@edu.pe', institutionName: 'UPC', campusName: 'Monterrico', relationship: 'Familiar' },
      { studentId: 8, fullName: 'Rafael Francisco Obregon Roca', email: 'rafael@edu.pe', institutionName: 'UPC', campusName: 'Monterrico', relationship: 'Familiar' },
    ]);
    service.trips = of([]);
    service.driver = throwError(() => new HttpErrorResponse({ status: 404 }));
    service.preferences = of({ ...preferences, studentId: 8, notifyArrival: false });
    fixture = TestBed.createComponent(FamilyTracking); fixture.detectChanges();
    fixture.componentInstance.selectStudent(8); fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    expect(select.value).toBe('8');
    expect(fixture.nativeElement.textContent).toContain('Conductor no disponible');
    expect(fixture.nativeElement.textContent).toContain('no tiene próximos viajes');
    expect(fixture.componentInstance.preferencesForm.controls.notifyArrival.value).toBe(false);
  });

  it('supports repeated student changes without restoring the first student', () => {
    service.students = of([
      { studentId: 2, fullName: 'Gustavo Oliver Junior', email: 'gustavo@edu.pe', institutionName: 'UPC', campusName: 'Monterrico', relationship: 'Familiar' },
      { studentId: 8, fullName: 'Rafael Francisco Obregon Roca', email: 'rafael@edu.pe', institutionName: 'UPC', campusName: 'Monterrico', relationship: 'Familiar' },
    ]);
    fixture = TestBed.createComponent(FamilyTracking); fixture.detectChanges();
    fixture.componentInstance.selectStudent(8); fixture.componentInstance.selectStudent(2); fixture.componentInstance.selectStudent(8); fixture.detectChanges();
    expect(fixture.componentInstance.selectedStudentId()).toBe(8);
    expect((fixture.nativeElement.querySelector('select') as HTMLSelectElement).value).toBe('8');
    expect(service.tripCalls.slice(-3)).toEqual([8, 2, 8]);
  });
});
