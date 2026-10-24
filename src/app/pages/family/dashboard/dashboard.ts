import { Component } from '@angular/core';
import { DashboardShell } from '../../shared/dashboard-shell/dashboard-shell';

@Component({ selector: 'app-family-dashboard', standalone: true, imports: [DashboardShell], template: '<app-dashboard-shell roleName="Familiar autorizado" eyebrow="Acceso familiar" description="Tu cuenta está lista para consultar la información del estudiante vinculado en las próximas User Stories." icon="family_restroom"></app-dashboard-shell>' })
export class FamilyDashboard {}
