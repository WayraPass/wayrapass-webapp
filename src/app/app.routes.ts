import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';
import { ForgotPassword } from './pages/auth/forgot-password/forgot-password';
import { Login } from './pages/auth/login/login';
import { Register } from './pages/auth/register/register';
import { ResetPassword } from './pages/auth/reset-password/reset-password';
import { CoordinatorDashboard } from './pages/coordinator/dashboard/dashboard';
import { DriverDashboard } from './pages/driver/dashboard/dashboard';
import { FamilyDashboard } from './pages/family/dashboard/dashboard';
import { StudentDashboard } from './pages/student/dashboard/dashboard';
import { TripHistory } from './pages/trip-history/trip-history';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'forgot-password', component: ForgotPassword },
  { path: 'reset-password', component: ResetPassword },
  { path: 'student/dashboard', component: StudentDashboard, canActivate: [authGuard] },
  { path: 'family/dashboard', component: FamilyDashboard, canActivate: [authGuard] },
  { path: 'driver/dashboard', component: DriverDashboard, canActivate: [authGuard] },
  { path: 'coordinator/dashboard', component: CoordinatorDashboard, canActivate: [authGuard] },
  {
    path: 'coordinator',
    loadComponent: () => import('./pages/coordinator/layout/coordinator-layout').then((m) => m.CoordinatorLayout),
    canActivate: [authGuard],
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
