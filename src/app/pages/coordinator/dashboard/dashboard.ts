import { Component } from '@angular/core';
import { DashboardShell } from '../../shared/dashboard-shell/dashboard-shell';

@Component({ selector: 'app-coordinator-dashboard', standalone: true, imports: [DashboardShell], template: '<app-dashboard-shell roleName="Coordinador de transporte" eyebrow="Acceso de coordinación" description="Tu cuenta administrativa está lista para gestionar el servicio cuando se implementen las User Stories operativas." icon="manage_accounts"></app-dashboard-shell>' })
export class CoordinatorDashboard {}
