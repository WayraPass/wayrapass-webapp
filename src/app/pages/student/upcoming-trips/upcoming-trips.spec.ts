import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { routes } from '../../../app.routes';
import { UpcomingTrip } from '../../../core/models/trip.models';
import { TripService } from '../../../core/services/trip.service';
import { UpcomingTrips } from './upcoming-trips';

const trip: UpcomingTrip = {
  tripId: 41,
  routeId: 5,
  routeCode: 'R-12',
  routeName: 'Ruta Centro',
  routeOrigin: 'Próceres',
  routeDestination: 'Campus Centro',
  institutionName: 'Universidad Wayra',
  campusName: 'Campus Centro',
  stopId: 8,
  stopName: 'Paradero Próceres',
  scheduledStartAt: '2026-11-04T12:00:00Z',
  scheduledEndAt: '2026-11-04T13:30:00Z',
  status: 'SCHEDULED',
  resourcesReassigned: false,
  studentRouteOrStopModified: false,
  modificationMessage: null,
};

class TripServiceStub {
  result: Observable<UpcomingTrip[]> = of([trip]);
  getUpcomingTrips() { return this.result; }
}

describe('UpcomingTrips US15', () => {
  let fixture: ComponentFixture<UpcomingTrips>;
  let tripService: TripServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpcomingTrips],
      providers: [provideRouter([]), { provide: TripService, useClass: TripServiceStub }],
    }).compileComponents();
    tripService = TestBed.inject(TripService) as unknown as TripServiceStub;
  });

  function create(): void {
    fixture = TestBed.createComponent(UpcomingTrips);
    fixture.detectChanges();
  }

  it('presents upcoming trips with human labels and only DTO-backed data', () => {
    create();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Ruta Centro');
    expect(text).toContain('Paradero Próceres');
    expect(text).toContain('Universidad Wayra');
    expect(text).toContain('Programado');
  });

  it('sorts trips chronologically even if the response order changes', () => {
    tripService.result = of([{ ...trip, tripId: 42, scheduledStartAt: '2026-11-05T12:00:00Z' }, trip]);
    create();
    expect(fixture.componentInstance.trips().map((item) => item.tripId)).toEqual([41, 42]);
  });

  it('shows the human empty state for a successful empty response', () => {
    tripService.result = of([]);
    create();
    expect(fixture.nativeElement.textContent).toContain('No tienes próximos viajes programados');
    expect(fixture.nativeElement.textContent).not.toContain('Recurso no encontrado');
  });

  it('shows a retryable backend error', () => {
    tripService.result = throwError(() => new HttpErrorResponse({ status: 503, error: { message: 'Servicio temporalmente no disponible.' } }));
    create();
    expect(fixture.nativeElement.textContent).toContain('Servicio temporalmente no disponible');
    expect(fixture.nativeElement.textContent).toContain('Reintentar');
  });

  it('explains when the backend does not expose the upcoming-trips endpoint', () => {
    tripService.result = throwError(() => new HttpErrorResponse({ status: 404, error: { message: 'Recurso no encontrado.' } }));
    create();
    expect(fixture.nativeElement.textContent).toContain('no está disponible en el backend actual');
    expect(fixture.nativeElement.textContent).not.toContain('Recurso no encontrado');
  });

  it('is reachable through the student navigation route', () => {
    const student = routes.find((route) => route.path === 'student');
    expect(student?.children?.some((route) => route.path === 'upcoming-trips')).toBe(true);
  });
});
