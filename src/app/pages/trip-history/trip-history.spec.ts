import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { StudentTripHistoryDetail, TripHistoryItem } from '../../core/models/trip.models';
import { TripService } from '../../core/services/trip.service';
import { TripHistory } from './trip-history';

const historyItem: TripHistoryItem = {
  tripId: 31,
  routeId: 5,
  routeCode: 'UPC-SMI-01',
  routeName: 'San Miguel - UPC Monterrico',
  routeOrigin: 'San Miguel',
  routeDestination: 'UPC Monterrico',
  institutionName: 'Universidad Peruana de Ciencias Aplicadas',
  campusName: 'UPC - Monterrico',
  scheduledStartAt: '2026-10-20T12:00:00Z',
  scheduledEndAt: '2026-10-20T13:00:00Z',
  actualStartAt: '2026-10-20T12:05:00Z',
  actualEndAt: '2026-10-20T13:10:00Z',
  tripStatus: 'COMPLETED',
  boardingStatus: 'CONFIRMED',
  boardedAt: '2026-10-20T12:15:00Z',
  stopId: 118,
  stopName: 'Plaza San Miguel',
  delayed: true,
};

const historyDetail: StudentTripHistoryDetail = {
  trip: historyItem,
  driverId: 8,
  driverName: 'Carlos Mendoza',
  vehicleId: 1,
  vehiclePlate: 'WP-D01',
  vehicleBrand: 'Mercedes-Benz',
  vehicleModel: 'Sprinter',
  incidents: [],
};

class TripServiceStub {
  historyResult: Observable<TripHistoryItem[]> = of([historyItem]);
  detailResult: Observable<StudentTripHistoryDetail> = of(historyDetail);
  detailCalls = 0;

  getHistory() {
    return this.historyResult;
  }

  getHistoryDetail() {
    this.detailCalls += 1;
    return this.detailResult;
  }
}

describe('TripHistory US08', () => {
  let fixture: ComponentFixture<TripHistory>;
  let service: TripServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TripHistory],
      providers: [{ provide: TripService, useClass: TripServiceStub }],
    }).compileComponents();
    service = TestBed.inject(TripService) as unknown as TripServiceStub;
  });

  afterEach(() => fixture?.destroy());

  it('loads the real history list and its selected detail', () => {
    fixture = TestBed.createComponent(TripHistory);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('UPC-SMI-01');
    expect(text).toContain('Plaza San Miguel');
    expect(text).toContain('WP-D01');
    expect(service.detailCalls).toBe(1);
  });

  it('shows an empty state when there are no registered trips', () => {
    service.historyResult = of([]);
    fixture = TestBed.createComponent(TripHistory);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Todavía no tienes viajes registrados');
    expect(service.detailCalls).toBe(0);
  });

  it('shows a readable HTTP error', () => {
    service.historyResult = throwError(() => new HttpErrorResponse({ status: 403 }));
    fixture = TestBed.createComponent(TripHistory);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No tienes permiso para consultar este viaje.');
  });
});
