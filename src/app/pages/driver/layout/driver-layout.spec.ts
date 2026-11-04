import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { DriverService } from '../../../core/services/driver.service';
import { DriverLayout } from './driver-layout';

class AuthServiceStub {
  readonly user = signal({ id: 4, email: 'driver@wayrapass.test', fullName: 'Conductor Demo', phone: null, role: 'DRIVER' as const });
  logout(): void {}
}

class DriverServiceStub {
  getProfile() { return of(null); }
}

describe('DriverLayout C2', () => {
  let fixture: ComponentFixture<DriverLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DriverLayout],
      providers: [
        provideRouter([]),
        { provide: AuthService, useClass: AuthServiceStub },
        { provide: DriverService, useClass: DriverServiceStub },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(DriverLayout);
    fixture.detectChanges();
  });

  it('exposes the Incidencias navigation only inside the DRIVER layout', () => {
    const link = Array.from(fixture.nativeElement.querySelectorAll('a'))
      .find((item) => (item as HTMLAnchorElement).textContent?.includes('Incidencias')) as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/driver/incidents');
  });
});
