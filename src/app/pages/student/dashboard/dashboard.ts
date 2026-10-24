import { Component } from '@angular/core';
import { DashboardShell } from '../../shared/dashboard-shell/dashboard-shell';

@Component({ selector: 'app-student-dashboard', standalone: true, imports: [DashboardShell], template: '<app-dashboard-shell roleName="Estudiante" eyebrow="Acceso de estudiante" description="Tu cuenta está lista para consultar la experiencia de transporte cuando se implementen las siguientes User Stories." icon="school"></app-dashboard-shell>' })
export class StudentDashboard {}
