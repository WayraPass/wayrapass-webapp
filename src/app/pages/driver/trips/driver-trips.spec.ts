import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { routes } from '../../../app.routes';
import { DriverTrip, DriverTripFilters } from '../../../core/models/driver.models';
import { TripStatus } from '../../../core/models/trip.models';
import { DriverService } from '../../../core/services/driver.service';
import { DriverTrips } from './driver-trips';

const trip: DriverTrip = {
  id: 18,
  tripId: 18,
  routeId: 7,
  driverId: 4,
  vehicleId: 2,
  scheduledStartAt: '2026-11-04T12:00:00Z',
  scheduledEndAt: '2026-11-04T13:30:00Z',
  estimatedArrivalAt: '2026-11-04T13:20:00Z',
  status: 'SCHEDULED',
  wasReassigned: false,
  routeCode: 'UPC-NOR-01',
  routeName: 'Ruta Norte a Monterrico',
  origin: 'Los Olivos',
  destination: 'UPC Monterrico',
  routeScheduleId: 25,
  actualStartAt: null,
  actualEndAt: null,
  assignmentChanged: false,
  assignmentChangeMessage: null,
  vehicle: { vehicleId: 2, plate: 'WP-D02', brand: 'Toyota', model: 'Coaster', capacity: 28 },
  stops: [
    { stopId: 12, stopOrder: 2, name: 'Plaza Norte', address: 'Av. Túpac Amaru', district: 'Independencia', estimatedMinutesFromStart: 15, active: true },
    { stopId: 11, stopOrder: 1, name: 'Municipalidad de Los Olivos', address: 'Av. Carlos Izaguirre', district: 'Los Olivos', estimatedMinutesFromStart: 0, active: true },
  ],
};

class DriverServiceStub {
  result: Observable<DriverTrip[]> = of([trip]);
  readonly requests: DriverTripFilters[] = [];

  getTrips(filters: DriverTripFilters = {}): Observable<DriverTrip[]> {
    this.requests.push(filters);
    return this.result;
  }
}

describe('DriverTrips US16', () => {
  let fixture: ComponentFixture<DriverTrips>;
  let service: DriverServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DriverTrips],
      providers: [provideRouter([]), { provide: DriverService, useClass: DriverServiceStub }],
    }).compileComponents();
    service = TestBed.inject(DriverService) as unknown as DriverServiceStub;
  });

  function create(): void {
    fixture = TestBed.createComponent(DriverTrips);
    fixture.detectChanges();
  }

  function listAll(): void {
    fixture.componentInstance.listAll();
    fixture.detectChanges();
  }

  function trips(amount: number): DriverTrip[] {
    return Array.from({ length: amount }, (_, index) => ({
      ...trip,
      id: index + 1,
      tripId: index + 1,
      routeName: `Ruta ${index + 1}`,
    }));
  }

  function button(label: string): HTMLButtonElement {
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    return buttons.find((item) => item.textContent?.includes(label))!;
  }

  it('starts without querying and presents the instructive state', () => {
    create();
    expect(service.requests).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Consulta tus viajes');
    expect(fixture.nativeElement.textContent).toContain('Selecciona un período o lista todos tus viajes asignados');
  });

  it('shows loading while assigned trips are pending', () => {
    create();
    service.result = new Subject<DriverTrip[]>();
    listAll();
    expect(fixture.nativeElement.textContent).toContain('Cargando viajes asignados');
  });

  it('renders route, translated status and assigned vehicle information', () => {
    create();
    listAll();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('UPC-NOR-01');
    expect(text).toContain('Ruta Norte a Monterrico');
    expect(text).toContain('Programado');
    expect(text).toContain('WP-D02');
    expect(text).toContain('Toyota Coaster');
    expect(text).toContain('28 pasajeros');
  });

  it('renders stops ordered by stopOrder without exposing technical ids', () => {
    create();
    listAll();
    const text = fixture.nativeElement.textContent as string;
    expect(text.indexOf('Municipalidad de Los Olivos')).toBeLessThan(text.indexOf('Plaza Norte'));
    expect(text).not.toContain('tripId');
    expect(text).not.toContain('driverId');
  });

  it('shows the backend assignment-change message', () => {
    create();
    service.result = of([{ ...trip, wasReassigned: true, assignmentChanged: true, assignmentChangeMessage: 'Se actualizó el vehículo asignado.' }]);
    listAll();
    expect(fixture.nativeElement.textContent).toContain('Se actualizó el vehículo asignado.');
  });

  it('does not query with empty dates, clears old results and explains the alternatives', () => {
    create();
    listAll();
    fixture.componentInstance.applyFilters();
    fixture.detectChanges();
    expect(service.requests).toHaveLength(1);
    expect(fixture.componentInstance.trips()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Selecciona al menos una fecha o utiliza "Listar todos"');
  });

  it('queries using only from', () => {
    create();
    fixture.componentInstance.filters.setValue({ from: '2026-11-02', to: '' });
    fixture.componentInstance.applyFilters();
    expect(service.requests).toEqual([{ from: '2026-11-02' }]);
  });

  it('queries using only to', () => {
    create();
    fixture.componentInstance.filters.setValue({ from: '', to: '2026-11-09' });
    fixture.componentInstance.applyFilters();
    expect(service.requests).toEqual([{ to: '2026-11-09' }]);
  });

  it('queries using from and to', () => {
    create();
    fixture.componentInstance.filters.setValue({ from: '2026-11-02', to: '2026-11-09' });
    fixture.componentInstance.applyFilters();
    expect(service.requests).toEqual([{ from: '2026-11-02', to: '2026-11-09' }]);
  });

  it('lists all without parameters, clears dates and starts on page one', () => {
    create();
    fixture.componentInstance.filters.setValue({ from: '2026-11-02', to: '2026-11-09' });
    fixture.componentInstance.currentPage.set(2);
    listAll();
    expect(service.requests).toEqual([{}]);
    expect(fixture.componentInstance.filters.getRawValue()).toEqual({ from: '', to: '' });
    expect(fixture.componentInstance.currentPage()).toBe(1);
    expect(fixture.componentInstance.listingAll()).toBe(true);
  });

  it('shows a recoverable HTTP error and retries the request', () => {
    create();
    service.result = throwError(() => new HttpErrorResponse({ status: 503, error: { message: 'Servicio temporalmente no disponible.' } }));
    listAll();
    expect(fixture.nativeElement.textContent).toContain('Servicio temporalmente no disponible');
    expect(fixture.nativeElement.textContent).toContain('Reintentar');

    service.result = of([trip]);
    fixture.componentInstance.retry();
    fixture.detectChanges();
    expect(service.requests).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain('Ruta Norte a Monterrico');
  });

  it('does not query when the date range is invalid', () => {
    create();
    fixture.componentInstance.filters.setValue({ from: '2026-11-10', to: '2026-11-02' });
    fixture.componentInstance.applyFilters();
    fixture.detectChanges();
    expect(service.requests).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain('La fecha inicial no puede ser posterior');
  });

  it('renders three trips without unnecessary pagination', () => {
    create();
    service.result = of(trips(3));
    listAll();
    expect(fixture.nativeElement.querySelectorAll('.trip-card')).toHaveLength(3);
    expect(fixture.nativeElement.textContent).not.toContain('Página 1 de');
  });

  it('renders ten trips on a single page', () => {
    create();
    service.result = of(trips(10));
    listAll();
    expect(fixture.nativeElement.querySelectorAll('.trip-card')).toHaveLength(10);
    expect(fixture.componentInstance.totalPages()).toBe(1);
    expect(fixture.nativeElement.textContent).not.toContain('Siguiente');
  });

  it('paginates eleven trips as ten on the first page and one on the second', () => {
    create();
    service.result = of(trips(11));
    listAll();
    expect(fixture.nativeElement.querySelectorAll('.trip-card')).toHaveLength(10);
    expect(fixture.nativeElement.textContent).toContain('Página 1 de 2');
    expect(button('Anterior').disabled).toBe(true);
    expect(button('Siguiente').disabled).toBe(false);

    button('Siguiente').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.trip-card')).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Página 2 de 2');
    expect(button('Siguiente').disabled).toBe(true);
    expect(button('Anterior').disabled).toBe(false);

    button('Anterior').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.trip-card')).toHaveLength(10);
    expect(fixture.componentInstance.currentPage()).toBe(1);
  });

  it('resets pagination to page one for a new filtered search', () => {
    create();
    service.result = of(trips(11));
    listAll();
    fixture.componentInstance.nextPage();
    expect(fixture.componentInstance.currentPage()).toBe(2);
    fixture.componentInstance.filters.setValue({ from: '2026-11-02', to: '' });
    fixture.componentInstance.applyFilters();
    expect(fixture.componentInstance.currentPage()).toBe(1);
  });

  it('clears dates, results, errors and pagination without making a request', () => {
    create();
    service.result = of(trips(11));
    listAll();
    fixture.componentInstance.nextPage();
    fixture.componentInstance.filters.setValue({ from: '2026-11-02', to: '' });
    fixture.componentInstance.errorMessage.set('Error anterior');
    fixture.componentInstance.clearFilters();
    fixture.detectChanges();
    expect(service.requests).toHaveLength(1);
    expect(fixture.componentInstance.filters.getRawValue()).toEqual({ from: '', to: '' });
    expect(fixture.componentInstance.trips()).toEqual([]);
    expect(fixture.componentInstance.errorMessage()).toBe('');
    expect(fixture.componentInstance.currentPage()).toBe(1);
    expect(fixture.componentInstance.hasSearched()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Consulta tus viajes');
  });

  it('shows a period empty state for a valid filtered response', () => {
    create();
    service.result = of([]);
    fixture.componentInstance.filters.setValue({ from: '2026-11-02', to: '' });
    fixture.componentInstance.applyFilters();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No tienes viajes asignados para este período');
    expect(fixture.nativeElement.textContent).not.toContain('No pudimos cargar');
  });

  it('shows the all-trips empty state after an explicit complete listing', () => {
    create();
    service.result = of([]);
    listAll();
    expect(fixture.nativeElement.textContent).toContain('No tienes viajes asignados');
    expect(fixture.nativeElement.textContent).not.toContain('para este período');
  });

  it('translates every backend trip status', () => {
    create();
    const statuses: Record<TripStatus, string> = {
      SCHEDULED: 'Programado',
      BOARDING: 'En embarque',
      IN_PROGRESS: 'En curso',
      COMPLETED: 'Finalizado',
      CANCELLED: 'Cancelado',
    };
    for (const [status, label] of Object.entries(statuses)) {
      expect(fixture.componentInstance.statusLabel(status as TripStatus)).toBe(label);
    }
  });

  it('is nested under the DRIVER-protected route', () => {
    const driver = routes.find((route) => route.path === 'driver');
    expect(driver?.canActivate).toHaveLength(2);
    expect(driver?.children?.some((route) => route.path === 'dashboard')).toBe(true);
    expect(driver?.children?.some((route) => route.path === 'trips')).toBe(true);
  });
});
