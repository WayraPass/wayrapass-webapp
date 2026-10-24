import { Component } from '@angular/core';
import { DashboardShell } from '../../shared/dashboard-shell/dashboard-shell';

@Component({ selector: 'app-driver-dashboard', standalone: true, imports: [DashboardShell], template: '<app-dashboard-shell roleName="Chofer" eyebrow="Acceso de operación" description="Tu cuenta administrativa está lista para mostrar rutas y horarios cuando se desarrollen las User Stories correspondientes." icon="directions_bus"></app-dashboard-shell>' })
export class DriverDashboard {}
