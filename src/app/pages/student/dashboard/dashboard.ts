import { Component } from '@angular/core';
import { DashboardShell } from '../../shared/dashboard-shell/dashboard-shell';

@Component({ selector: 'app-student-dashboard', standalone: true, imports: [DashboardShell], template: '<app-dashboard-shell roleName="Estudiante" eyebrow="Acceso de estudiante" description="Busca las rutas disponibles para tu institución y guarda tus opciones favoritas." icon="school" actionLabel="Buscar rutas" actionLink="/student/routes" actionIcon="route"></app-dashboard-shell>' })
export class StudentDashboard {}
