import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';
import { ForgotPassword } from './pages/auth/forgot-password/forgot-password';
import { Login } from './pages/auth/login/login';
import { Register } from './pages/auth/register/register';
import { ResetPassword } from './pages/auth/reset-password/reset-password';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'forgot-password', component: ForgotPassword },
  { path: 'reset-password', component: ResetPassword },
  {
    path: 'student',
    loadComponent: () => import('./pages/student/layout/student-layout').then((m) => m.StudentLayout),
    canActivate: [authGuard, roleGuard('STUDENT')],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./pages/student/dashboard/dashboard').then((m) => m.StudentDashboard), title: 'Inicio · WayraPass' },
      { path: 'routes', loadComponent: () => import('./pages/student/route-search/route-search').then((m) => m.StudentRouteSearch), title: 'Buscar rutas · WayraPass' },
      { path: 'enrollment', loadComponent: () => import('./pages/student/enrollment/enrollment').then((m) => m.StudentEnrollment), title: 'Mi inscripción · WayraPass' },
      { path: 'upcoming-trips', loadComponent: () => import('./pages/student/upcoming-trips/upcoming-trips').then((m) => m.UpcomingTrips), title: 'Próximos viajes · WayraPass' },
      { path: 'current-trip', loadComponent: () => import('./pages/student/current-trip/current-trip').then((m) => m.CurrentTrip), title: 'Mi viaje actual · WayraPass' },
      { path: 'history', loadComponent: () => import('./pages/trip-history/trip-history').then((m) => m.TripHistory), title: 'Mi historial · WayraPass' },
    ],
  },
  {
    path: 'family',
    loadComponent: () => import('./pages/family/layout/family-layout').then((m) => m.FamilyLayout),
    canActivate: [authGuard, roleGuard('FAMILY')],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./pages/family/dashboard/dashboard').then((m) => m.FamilyDashboard), title: 'Inicio familiar · WayraPass' },
      { path: 'tracking', loadComponent: () => import('./pages/family/tracking/family-tracking').then((m) => m.FamilyTracking), title: 'Seguimiento familiar · WayraPass' },
      { path: 'history', loadComponent: () => import('./pages/trip-history/trip-history').then((m) => m.TripHistory), data: { familyMode: true }, title: 'Historial familiar · WayraPass' },
    ],
  },
  {
    path: 'driver',
    loadComponent: () => import('./pages/driver/layout/driver-layout').then((m) => m.DriverLayout),
    canActivate: [authGuard, roleGuard('DRIVER')],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./pages/driver/dashboard/dashboard').then((m) => m.DriverDashboard), title: 'Inicio del conductor · WayraPass' },
      { path: 'trips', loadComponent: () => import('./pages/driver/trips/driver-trips').then((m) => m.DriverTrips), title: 'Mis viajes · WayraPass' },
      { path: 'incidents', loadComponent: () => import('./pages/driver/incidents/driver-incidents').then((m) => m.DriverIncidents), title: 'Incidencias · WayraPass' },
    ],
  },
  {
    path: 'coordinator',
    loadComponent: () => import('./pages/coordinator/layout/coordinator-layout').then((m) => m.CoordinatorLayout),
    canActivate: [authGuard, roleGuard('COORDINATOR')],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./pages/coordinator/dashboard/dashboard').then((m) => m.CoordinatorDashboard), title: 'Coordinación · WayraPass' },
      { path: 'routes', loadComponent: () => import('./pages/coordinator/route-management/route-management').then((m) => m.RouteManagement), title: 'Rutas · WayraPass' },
      { path: 'routes/new', redirectTo: 'routes', pathMatch: 'full' },
      { path: 'routes/:id/edit', redirectTo: 'routes', pathMatch: 'full' },
      { path: 'stops', loadComponent: () => import('./pages/coordinator/stop-management/stop-management').then((m) => m.StopManagement), title: 'Paraderos · WayraPass' },
      { path: 'drivers', loadComponent: () => import('./pages/coordinator/drivers/driver-management').then((m) => m.DriverManagement), title: 'Conductores · WayraPass' },
      { path: 'vehicles', loadComponent: () => import('./pages/coordinator/vehicles/vehicle-management').then((m) => m.VehicleManagement), title: 'Vehículos · WayraPass' },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
