import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { CurrentTripResponse } from '../../../core/models/trip.models';
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

describe('CurrentTrip US03/US04', () => {
  let fixture: ComponentFixture<CurrentTrip>;
  let service: TripServiceStub;

  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [CurrentTrip],
      providers: [{ provide: TripService, useClass: TripServiceStub }],
    }).compileComponents();
    service = TestBed.inject(TripService) as unknown as TripServiceStub;
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
});
