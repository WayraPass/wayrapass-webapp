import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { routes } from '../../../app.routes';
import { DriverTrip } from '../../../core/models/driver.models';
import { CreateIncidentRequest, IncidentResponse } from '../../../core/models/incident.models';
import { DriverService } from '../../../core/services/driver.service';
import { IncidentService } from '../../../core/services/incident.service';
import { DriverIncidents } from './driver-incidents';

const boardingTrip: DriverTrip = {
  id: 30,
  tripId: 30,
  routeId: 7,
  driverId: 4,
  vehicleId: 2,
  scheduledStartAt: '2026-11-02T20:00:00Z',
  scheduledEndAt: '2026-11-02T21:30:00Z',
  estimatedArrivalAt: '2026-11-02T21:30:00Z',
  status: 'BOARDING',
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
  stops: [],
};

const incidentResponse: IncidentResponse = {
  id: 90,
  tripId: 30,
  routeId: 7,
  driverId: 4,
  type: 'TRAFFIC_DELAY',
  description: 'Congestión intensa',
  delayMinutes: 12,
  priority: 'HIGH',
  status: 'OPEN',
  createdAt: '2026-11-02T20:15:00Z',
};

class DriverServiceStub {
  result: Observable<DriverTrip[]> = of([boardingTrip]);
  calls = 0;
  getTrips(): Observable<DriverTrip[]> { this.calls++; return this.result; }
}

class IncidentServiceStub {
  result: Observable<IncidentResponse> = of(incidentResponse);
  readonly requests: CreateIncidentRequest[] = [];
  create(request: CreateIncidentRequest): Observable<IncidentResponse> {
    this.requests.push(request);
    return this.result;
  }
}

describe('DriverIncidents US17', () => {
  let fixture: ComponentFixture<DriverIncidents>;
  let driverService: DriverServiceStub;
  let incidentService: IncidentServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DriverIncidents],
      providers: [
        provideRouter([]),
        { provide: DriverService, useClass: DriverServiceStub },
        { provide: IncidentService, useClass: IncidentServiceStub },
      ],
    }).compileComponents();
    driverService = TestBed.inject(DriverService) as unknown as DriverServiceStub;
    incidentService = TestBed.inject(IncidentService) as unknown as IncidentServiceStub;
  });

  function create(): void {
    fixture = TestBed.createComponent(DriverIncidents);
    fixture.detectChanges();
  }

  function fillValid(description = 'Congestión intensa'): void {
    fixture.componentInstance.form.setValue({
      tripId: 30,
      type: 'TRAFFIC_DELAY',
      description,
      delayMinutes: 12,
      priority: 'HIGH',
    });
  }

  it('renders the incident screen and loads authenticated-driver trips', () => {
    create();
    expect(fixture.nativeElement.textContent).toContain('Registrar incidencia');
    expect(driverService.calls).toBe(1);
  });

  it('shows only BOARDING and IN_PROGRESS trips in the selector', () => {
    driverService.result = of([
      boardingTrip,
      { ...boardingTrip, tripId: 31, status: 'IN_PROGRESS', routeName: 'Ruta en curso' },
      { ...boardingTrip, tripId: 32, status: 'SCHEDULED', routeName: 'Ruta futura' },
    ]);
    create();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Ruta Norte a Monterrico');
    expect(text).toContain('Ruta en curso');
    expect(text).not.toContain('Ruta futura');
    expect(fixture.nativeElement.querySelectorAll('select')[0].querySelectorAll('option')).toHaveLength(3);
  });

  it('uses the real categories and human trip-status translations', () => {
    create();
    expect(fixture.componentInstance.incidentTypes.map((item) => item.value)).toEqual([
      'TRAFFIC_DELAY', 'DETOUR', 'VEHICLE_FAILURE', 'STOP_UNAVAILABLE', 'OTHER',
    ]);
    expect(fixture.componentInstance.statusLabel('BOARDING')).toBe('En embarque');
    expect(fixture.componentInstance.statusLabel('IN_PROGRESS')).toBe('En curso');
    expect(fixture.nativeElement.textContent).toContain('Demora por tráfico');
    expect(fixture.nativeElement.textContent).toContain('Falla del vehículo');
  });

  it('validates the required description and its real maximum length', () => {
    create();
    fillValid('');
    fixture.componentInstance.submit();
    fixture.detectChanges();
    expect(incidentService.requests).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain('Describe lo ocurrido');

    fixture.componentInstance.form.controls.description.setValue('a'.repeat(1001));
    expect(fixture.componentInstance.form.controls.description.hasError('maxlength')).toBe(true);
  });

  it('rejects a description containing only spaces', () => {
    create();
    fillValid('   ');
    fixture.componentInstance.submit();
    expect(incidentService.requests).toHaveLength(0);
    expect(fixture.componentInstance.form.controls.description.hasError('required')).toBe(true);
  });

  it('trims the description and sends only the exact backend DTO', () => {
    create();
    fillValid('  Congestión intensa  ');
    fixture.componentInstance.submit();
    expect(incidentService.requests).toEqual([{
      tripId: 30,
      type: 'TRAFFIC_DELAY',
      description: 'Congestión intensa',
      delayMinutes: 12,
      priority: 'HIGH',
    }]);
    expect(Object.hasOwn(incidentService.requests[0], 'driverId')).toBe(false);
  });

  it('disables submit and shows progress while registering', () => {
    create();
    const pending = new Subject<IncidentResponse>();
    incidentService.result = pending;
    fillValid();
    fixture.componentInstance.submit();
    fixture.detectChanges();
    const submit = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(fixture.componentInstance.submitting()).toBe(true);
    expect(submit.disabled).toBe(true);
    expect(submit.textContent).toContain('Registrando');
    fixture.componentInstance.submit();
    expect(incidentService.requests).toHaveLength(1);
    pending.complete();
  });

  it('shows success, returned incident data and clears the form', () => {
    create();
    fillValid();
    fixture.componentInstance.submit();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Incidencia registrada correctamente');
    expect(text).toContain('Demora por tráfico');
    expect(text).toContain('Prioridad Alta');
    expect(text).toContain('Abierta');
    expect(fixture.componentInstance.form.getRawValue()).toEqual({
      tripId: null, type: '', description: '', delayMinutes: 0, priority: 'NORMAL',
    });
  });

  it.each([
    [400, 'Revisa los datos ingresados'],
    [401, 'Tu sesión venció'],
    [403, 'No tienes permiso'],
    [404, 'El viaje seleccionado ya no está disponible'],
    [409, 'conflicto'],
  ])('maps HTTP %i to a human recoverable error', (status, expected) => {
    create();
    incidentService.result = throwError(() => new HttpErrorResponse({ status }));
    fillValid();
    fixture.componentInstance.submit();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(expected);
    expect(fixture.nativeElement.textContent).not.toContain('HttpErrorResponse');
  });

  it('shows the no-eligible-trips state without a false error', () => {
    driverService.result = of([{ ...boardingTrip, status: 'SCHEDULED' }]);
    create();
    expect(fixture.nativeElement.textContent).toContain('No tienes viajes habilitados');
    expect(fixture.nativeElement.textContent).not.toContain('No pudimos cargar');
  });

  it('shows loading while trips are pending', () => {
    driverService.result = new Subject<DriverTrip[]>();
    create();
    expect(fixture.nativeElement.textContent).toContain('Cargando viajes disponibles');
  });

  it('is nested under the DRIVER-protected route', () => {
    const driver = routes.find((route) => route.path === 'driver');
    expect(driver?.canActivate).toHaveLength(2);
    expect(driver?.children?.some((route) => route.path === 'incidents')).toBe(true);
  });
});
