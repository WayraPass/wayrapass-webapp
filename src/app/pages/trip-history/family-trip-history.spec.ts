import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { FamilyTripHistoryDetail, LinkedStudent } from '../../core/models/family.models';
import { TripHistoryItem } from '../../core/models/trip.models';
import { FamilyService } from '../../core/services/family.service';
import { TripService } from '../../core/services/trip.service';
import { TripHistory } from './trip-history';

const trip: TripHistoryItem = { tripId: 31, routeId: 5, routeCode: 'UPC-SMI-01', routeName: 'San Miguel - UPC', routeOrigin: 'San Miguel', routeDestination: 'UPC Monterrico', institutionName: 'UPC', campusName: 'Monterrico', scheduledStartAt: '2026-10-20T12:00:00Z', scheduledEndAt: '2026-10-20T13:00:00Z', actualStartAt: '2026-10-20T12:05:00Z', actualEndAt: '2026-10-20T13:00:00Z', tripStatus: 'COMPLETED', boardingStatus: 'CONFIRMED', boardedAt: '2026-10-20T12:10:00Z', stopId: 10, stopName: 'Plaza San Miguel', delayed: false };
const detail: FamilyTripHistoryDetail = { trip, incidents: [] };

class FamilyServiceStub {
  students: Observable<LinkedStudent[]> = of([{ studentId: 2, fullName: 'Rafael Estudiante', email: 'rafael@edu.pe', institutionName: 'UPC', campusName: 'Monterrico', relationship: 'Familiar' }]);
  history: Observable<TripHistoryItem[]> = of([trip]);
  detail: Observable<FamilyTripHistoryDetail> = of(detail);
  getLinkedStudents() { return this.students; }
  getHistory() { return this.history; }
  getHistoryDetail() { return this.detail; }
}

class TripServiceStub {}

describe('TripHistory US09 FAMILY mode', () => {
  let fixture: ComponentFixture<TripHistory>;
  let family: FamilyServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TripHistory],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { data: { familyMode: true } } } },
        { provide: FamilyService, useClass: FamilyServiceStub },
        { provide: TripService, useClass: TripServiceStub },
      ],
    }).compileComponents();
    family = TestBed.inject(FamilyService) as unknown as FamilyServiceStub;
  });

  it('loads authorized FAMILY history and detail', () => {
    fixture = TestBed.createComponent(TripHistory); fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Historial del estudiante');
    expect(text).toContain('UPC-SMI-01');
    expect(text).toContain('Este viaje no registra incidencias');
    expect(text).not.toContain('Vehículo');
  });

  it('shows the family empty-history state', () => {
    family.history = of([]);
    fixture = TestBed.createComponent(TripHistory); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Este estudiante todavía no tiene viajes registrados');
  });

  it('shows a 403 ownership error', () => {
    family.history = throwError(() => new HttpErrorResponse({ status: 403 }));
    fixture = TestBed.createComponent(TripHistory); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No tienes autorización');
  });

  it('rejects an inverted date range before querying again', () => {
    fixture = TestBed.createComponent(TripHistory); fixture.detectChanges();
    fixture.componentInstance.filters.setValue({ from: '2026-11-02', to: '2026-01-01' });
    fixture.componentInstance.loadHistory(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('La fecha inicial no puede ser posterior');
  });
});
