import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';
import { ForgotPassword } from './pages/auth/forgot-password/forgot-password';
import { Login } from './pages/auth/login/login';
import { Register } from './pages/auth/register/register';
import { ResetPassword } from './pages/auth/reset-password/reset-password';
import { CoordinatorDashboard } from './pages/coordinator/dashboard/dashboard';
import { DriverDashboard } from './pages/driver/dashboard/dashboard';

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
  { path: 'driver/dashboard', component: DriverDashboard, canActivate: [authGuard, roleGuard('DRIVER')] },
  { path: 'coordinator/dashboard', component: CoordinatorDashboard, canActivate: [authGuard, roleGuard('COORDINATOR')] },
  {
    path: 'coordinator',
    loadComponent: () => import('./pages/coordinator/layout/coordinator-layout').then((m) => m.CoordinatorLayout),
    canActivate: [authGuard, roleGuard('COORDINATOR')],
    children: [
      { path: '', redirectTo: 'routes', pathMatch: 'full' },
      { path: 'dashboard', redirectTo: 'routes', pathMatch: 'full' },
      { path: 'routes', loadComponent: () => import('./pages/coordinator/route-list/route-list').then((m) => m.RouteList), title: 'Rutas · WayraPass' },
      { path: 'routes/new', loadComponent: () => import('./pages/coordinator/route-form/route-form').then((m) => m.RouteForm), title: 'Nueva ruta · WayraPass' },
      { path: 'routes/:id/edit', loadComponent: () => import('./pages/coordinator/route-form/route-form').then((m) => m.RouteForm), title: 'Editar ruta · WayraPass' },
      { path: 'stops', loadComponent: () => import('./pages/coordinator/stop-list/stop-list').then((m) => m.StopList), title: 'Paraderos · WayraPass' },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
