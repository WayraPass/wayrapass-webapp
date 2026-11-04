import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FamilyDriverCredential } from '../../../core/models/family.models';
import { DriverCredentialCard } from './driver-credential';

const credential: FamilyDriverCredential = {
  assigned: true, message: 'Credencial disponible.', driverId: 80, fullName: 'Carlos Chofer', credentialImageUrl: null,
  credentialImageAvailable: false, licenseNumber: 'LIC-123', licenseCategory: 'AIII-C', licenseExpiration: '2030-01-01',
  licenseExpired: false, authorizationStatus: 'AUTHORIZED', operationalStatus: 'AVAILABLE', authorized: true,
};

describe('DriverCredentialCard US07', () => {
  let fixture: ComponentFixture<DriverCredentialCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DriverCredentialCard] }).compileComponents();
    fixture = TestBed.createComponent(DriverCredentialCard);
  });

  it('shows only the public fields of a valid credential', () => {
    fixture.componentRef.setInput('credential', credential);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Carlos Chofer');
    expect(text).toContain('LIC-123');
    expect(text).toContain('Autorizado');
  });

  it('shows an unassigned state instead of incomplete data', () => {
    fixture.componentRef.setInput('credential', { ...credential, assigned: false, fullName: null, message: 'No hay un viaje activo.' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No hay un viaje activo.');
  });

  it('warns when the driver is not authorized', () => {
    fixture.componentRef.setInput('credential', { ...credential, authorizationStatus: 'REJECTED', authorized: false });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('no figura como autorizado');
  });
});
