import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { LinkedStudent } from '../../../core/models/family.models';
import { AuthService } from '../../../core/services/auth.service';
import { FamilyService } from '../../../core/services/family.service';
import { FamilyDashboard } from './dashboard';

const linked: LinkedStudent = { studentId: 2, fullName: 'Rafael Estudiante', email: 'rafael@edu.pe', institutionName: 'UPC', campusName: 'Monterrico', relationship: 'Familiar' };

class AuthServiceStub {
  readonly user = signal({ id: 4, fullName: 'Elena Familiar', email: 'elena@wayrapass.com', phone: null, role: 'FAMILY' as const });
}

class FamilyServiceStub {
  students: Observable<LinkedStudent[]> = of([]);
  linkResult: Observable<LinkedStudent> = of(linked);
  getLinkedStudents() { return this.students; }
  linkStudent() { return this.linkResult; }
}

describe('FamilyDashboard E2 family linking', () => {
  let fixture: ComponentFixture<FamilyDashboard>;
  let service: FamilyServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FamilyDashboard],
      providers: [provideRouter([]), { provide: AuthService, useClass: AuthServiceStub }, { provide: FamilyService, useClass: FamilyServiceStub }],
    }).compileComponents();
    service = TestBed.inject(FamilyService) as unknown as FamilyServiceStub;
  });

  function create(): void { fixture = TestBed.createComponent(FamilyDashboard); fixture.detectChanges(); }

  it('shows the human empty state when there are no links', () => {
    create();
    expect(fixture.nativeElement.textContent).toContain('No tienes estudiantes vinculados');
  });

  it('links using only the six-digit code and updates the list immediately', () => {
    create();
    fixture.componentInstance.linkForm.controls.code.setValue('123456');
    fixture.componentInstance.linkStudent();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Rafael Estudiante fue vinculado correctamente');
    expect(text).toContain('UPC');
    expect(text).toContain('Monterrico');
  });

  it('restores linked students returned by the backend after reload', () => {
    service.students = of([linked]);
    create();
    expect(fixture.nativeElement.textContent).toContain('Rafael Estudiante');
    expect(fixture.nativeElement.textContent).toContain('Ver seguimiento');
  });

  it('shows the backend message for an invalid or expired code', () => {
    service.linkResult = throwError(() => new HttpErrorResponse({ status: 400, error: { message: 'El código de vinculación no es válido. Solicita uno nuevo.' } }));
    create();
    fixture.componentInstance.linkForm.controls.code.setValue('999999');
    fixture.componentInstance.linkStudent();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('El código de vinculación no es válido');
  });
});
