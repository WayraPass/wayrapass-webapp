import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { BoardingRequest, BoardingResponse, CurrentTripResponse } from '../../../core/models/trip.models';
import { BoardingService } from '../../../core/services/boarding.service';
import { TripService } from '../../../core/services/trip.service';
import { CURRENT_TRIP_POLL_MS, CurrentTrip } from './current-trip';

const availableTrip: CurrentTripResponse = {
  available: true,
  message: 'Viaje encontrado.',
  trip: {
    tripId: 4,
    routeId: 1,
    routeCode: 'UPC-SJM-01',
    routeName: 'San Juan de Miraflores - UPC Monterrico',
    tripStatus: 'BOARDING',
    scheduledStartAt: '2026-11-02T12:00:00Z',
    scheduledEndAt: '2026-11-02T13:00:00Z',
    actualStartAt: null,
    actualEndAt: null,
    vehicle: { vehicleId: 1, plate: 'WP-D01', brand: 'Mercedes-Benz', model: 'Sprinter' },
    assignedStop: { stopId: 1, name: 'Paradero Central', address: 'Av. Principal 100', district: 'San Juan de Miraflores' },
    boarding: { confirmed: false, boardedAt: null, stopName: null },
    location: { available: true, stale: false, freshness: 'RECENT', latitude: -12.12, longitude: -77.01, recordedAt: '2026-11-02T12:10:00Z', message: 'Ubicación reciente.' },
    stopArrival: { available: true, scheduledArrivalAt: '2026-11-02T12:20:00Z', estimatedArrivalAt: '2026-11-02T12:24:00Z', remainingMinutes: 14, updatedAt: '2026-11-02T12:10:00Z', message: 'ETA disponible.' },
    universityArrival: { available: true, scheduledArrivalAt: '2026-11-02T13:00:00Z', estimatedArrivalAt: '2026-11-02T13:05:00Z', remainingMinutes: 55, delayed: true, delayMinutes: 5, updatedAt: '2026-11-02T12:10:00Z', source: 'OPERATIONAL', message: 'ETA operativo.' },
    driver: { assigned: true, message: 'Conductor asignado.', driverId: 1, fullName: 'Carlos Mendoza', credentialImageUrl: null, credentialImageAvailable: false, licenseNumber: 'Q12345678', licenseCategory: 'AII-b', licenseExpiration: '2027-12-31', licenseExpired: false, authorizationStatus: 'AUTHORIZED', operationalStatus: 'AVAILABLE', authorized: true },
  },
};

class TripServiceStub {
  calls = 0;
  response: CurrentTripResponse = availableTrip;

  getCurrentTrip() {
    this.calls += 1;
    return of(this.response);
  }
}

class BoardingServiceStub {
  request: BoardingRequest | null = null;
  result: Observable<BoardingResponse> = of({ id: 9, tripId: 4, studentId: 1, stopId: 1, boardedAt: '2026-11-02T12:20:00Z' });

  confirm(request: BoardingRequest) {
    this.request = request;
    return this.result;
  }
}

describe('CurrentTrip US03/US04', () => {
  let fixture: ComponentFixture<CurrentTrip>;
  let service: TripServiceStub;
  let boardings: BoardingServiceStub;

  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [CurrentTrip],
      providers: [
        { provide: TripService, useClass: TripServiceStub },
        { provide: BoardingService, useClass: BoardingServiceStub },
      ],
    }).compileComponents();
    service = TestBed.inject(TripService) as unknown as TripServiceStub;
    boardings = TestBed.inject(BoardingService) as unknown as BoardingServiceStub;
  });

  afterEach(() => {
    fixture?.destroy();
    vi.useRealTimers();
  });

  it('loads the current trip and displays backend ETA data', () => {
    fixture = TestBed.createComponent(CurrentTrip);
    fixture.detectChanges();
    vi.advanceTimersByTime(0);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(service.calls).toBe(1);
    expect(text).toContain('UPC-SJM-01');
    expect(text).toContain('Llegada estimada a tu paradero');
    expect(text).toContain('14 min restantes');
    expect(text).toContain('WP-D01');
    expect(text).not.toContain('US05');
    expect(text).not.toContain('Viaje #4');
  });

  it('simulates the demo QR reading and submits the real boarding contract', () => {
    fixture = TestBed.createComponent(CurrentTrip);
    fixture.detectChanges();
    vi.advanceTimersByTime(0);
    const component = fixture.componentInstance;

    component.openBoarding();
    component.simulateQrReading();
    expect(component.boardingCode()).toBe('WP-DEMO-QR-VEHICLE-001');
    component.confirmBoarding();
    fixture.detectChanges();

    expect(boardings.request).toEqual({ tripId: 4, stopId: 1, vehicleQrToken: 'WP-DEMO-QR-VEHICLE-001' });
    expect(component.boardingCode()).toBe('');
    expect(component.boardingPanelOpen()).toBe(false);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Abordaje confirmado correctamente.');
  });

  it('reconstructs a confirmed boarding from the current-trip response', () => {
    service.response = {
      ...availableTrip,
      trip: {
        ...availableTrip.trip!,
        boarding: { confirmed: true, boardedAt: '2026-11-02T12:20:00Z', stopName: 'Paradero Central' },
      },
    };
    fixture = TestBed.createComponent(CurrentTrip);
    fixture.detectChanges();
    vi.advanceTimersByTime(0);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const confirmation = element.querySelector('.boarding-copy small')?.textContent ?? '';
    expect(element.textContent).toContain('Abordaje confirmado correctamente.');
    expect(element.textContent).not.toContain('Validar vehículo');
    expect(confirmation).toContain('Registrado');
    expect(confirmation).toContain('Paradero Central');
  });

  it('reconstructs the same confirmed state in a new component after a successful post', () => {
    fixture = TestBed.createComponent(CurrentTrip);
    fixture.detectChanges();
    vi.advanceTimersByTime(0);
    fixture.componentInstance.openBoarding();
    fixture.componentInstance.simulateQrReading();
    fixture.componentInstance.confirmBoarding();
    fixture.destroy();

    service.response = {
      ...availableTrip,
      trip: {
        ...availableTrip.trip!,
        boarding: { confirmed: true, boardedAt: '2026-11-02T12:20:00Z', stopName: 'Paradero Central' },
      },
    };
    fixture = TestBed.createComponent(CurrentTrip);
    fixture.detectChanges();
    vi.advanceTimersByTime(0);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Abordaje confirmado correctamente.');
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Validar vehículo');
  });

  it('does not lose a successful boarding when polling refreshes the trip', () => {
    fixture = TestBed.createComponent(CurrentTrip);
    fixture.detectChanges();
    vi.advanceTimersByTime(0);
    fixture.componentInstance.openBoarding();
    fixture.componentInstance.simulateQrReading();
    fixture.componentInstance.confirmBoarding();

    vi.advanceTimersByTime(CURRENT_TRIP_POLL_MS);
    fixture.detectChanges();

    expect(service.calls).toBe(2);
    expect(fixture.componentInstance.boardingConfirmed()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Validar vehículo');
  });

  it('clears the temporary code when the validation panel is closed', () => {
    fixture = TestBed.createComponent(CurrentTrip);
    fixture.detectChanges();
    vi.advanceTimersByTime(0);
    const component = fixture.componentInstance;
    component.openBoarding();
    component.simulateQrReading();

    component.closeBoarding();

    expect(component.boardingCode()).toBe('');
    expect(component.boardingPanelOpen()).toBe(false);
  });

  it('shows the explicit empty state when the student has no current trip', () => {
    service.response = { available: false, message: 'No hay un viaje activo o programado para la inscripción actual.', trip: null };
    fixture = TestBed.createComponent(CurrentTrip);
    fixture.detectChanges();
    vi.advanceTimersByTime(0);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No tienes un viaje actual');
    expect(text).toContain('No hay un viaje activo o programado');
  });

  it('polls every eight seconds and stops polling when the component is destroyed', () => {
    fixture = TestBed.createComponent(CurrentTrip);
    fixture.detectChanges();
    vi.advanceTimersByTime(0);
    vi.advanceTimersByTime(CURRENT_TRIP_POLL_MS * 2);
    expect(service.calls).toBe(3);

    fixture.destroy();
    vi.advanceTimersByTime(CURRENT_TRIP_POLL_MS * 2);
    expect(service.calls).toBe(3);
  });

  it('handles a duplicate boarding response as an already registered boarding', () => {
    boardings.result = throwError(() => new HttpErrorResponse({
      status: 409,
      error: { message: 'El estudiante ya abordó este viaje.' },
    }));
    fixture = TestBed.createComponent(CurrentTrip);
    fixture.detectChanges();
    vi.advanceTimersByTime(0);
    const component = fixture.componentInstance;
    component.boardingCode.set('QR-WP-D01');
    component.confirmBoarding();
    fixture.detectChanges();

    expect(component.boardingRegistered()).toBe(true);
    expect(component.boardingCode()).toBe('');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Tu abordaje ya fue registrado.');
  });

  it('shows the backend validation when the QR code is invalid', () => {
    boardings.result = throwError(() => new HttpErrorResponse({
      status: 400,
      error: { message: 'El QR no corresponde al vehículo asignado.' },
    }));
    fixture = TestBed.createComponent(CurrentTrip);
    fixture.detectChanges();
    vi.advanceTimersByTime(0);
    const component = fixture.componentInstance;
    component.openBoarding();
    component.boardingCode.set('QR-INCORRECTO');
    component.confirmBoarding();
    fixture.detectChanges();

    expect(component.boardingRegistered()).toBe(false);
    expect(component.boardingCode()).toBe('QR-INCORRECTO');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('El código del vehículo no corresponde a este viaje.');
  });

  it('does not show the boarding action for a non-operational trip', () => {
    service.response = {
      ...availableTrip,
      trip: { ...availableTrip.trip!, tripStatus: 'SCHEDULED' },
    };
    fixture = TestBed.createComponent(CurrentTrip);
    fixture.detectChanges();
    vi.advanceTimersByTime(0);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Validar vehículo');
    expect(text).toContain('El abordaje todavía no está disponible');
  });
});
