import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of } from 'rxjs';
import { FamilyLinkCode } from '../../../core/models/family.models';
import { AuthService } from '../../../core/services/auth.service';
import { FamilyService } from '../../../core/services/family.service';
import { StudentDashboard } from './dashboard';

class AuthServiceStub {
  readonly user = signal({ id: 2, fullName: 'Rafael Estudiante', email: 'rafael@edu.pe', phone: null, role: 'STUDENT' as const });
}

class FamilyServiceStub {
  response: Observable<FamilyLinkCode> = of({ code: '123456', expiresAt: '2026-11-03T20:10:00Z' });
  generateLinkCode() { return this.response; }
}

describe('StudentDashboard E2 family linking', () => {
  let fixture: ComponentFixture<StudentDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentDashboard],
      providers: [provideRouter([]), { provide: AuthService, useClass: AuthServiceStub }, { provide: FamilyService, useClass: FamilyServiceStub }],
    }).compileComponents();
    fixture = TestBed.createComponent(StudentDashboard);
    fixture.detectChanges();
  });

  it('generates and displays a temporary code with expiration and copy action', () => {
    fixture.componentInstance.generateFamilyCode();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('123456');
    expect(text).toContain('Vence el');
    expect(text).toContain('Copiar');
    expect(text).toContain('Al generar otro, el anterior deja de ser válido');
  });

  it('does not reconstruct a plaintext code before the student generates one', () => {
    expect(fixture.nativeElement.textContent).toContain('Generar código de vinculación');
    expect(fixture.nativeElement.textContent).not.toContain('123456');
  });
});
