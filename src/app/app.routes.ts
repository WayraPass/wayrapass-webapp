import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';
import { ForgotPassword } from './pages/auth/forgot-password/forgot-password';
import { Login } from './pages/auth/login/login';
import { Register } from './pages/auth/register/register';

import { ForgotPassword } from './pages/auth/forgot-password/forgot-password';
import { TripHistory } from './pages/trip-history/trip-history';

import { ResetPassword } from './pages/auth/reset-password/reset-password';
import { CoordinatorDashboard } from './pages/coordinator/dashboard/dashboard';
import { DriverDashboard } from './pages/driver/dashboard/dashboard';
import { FamilyDashboard } from './pages/family/dashboard/dashboard';
import { StudentDashboard } from './pages/student/dashboard/dashboard';


export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'forgot-password', component: ForgotPassword },

  { path: 'historial-rutas', component: TripHistory },
  { path: '**', redirectTo: '/login' },

  { path: 'reset-password', component: ResetPassword },
  { path: 'student/dashboard', component: StudentDashboard, canActivate: [authGuard, roleGuard('STUDENT')] },
  { path: 'family/dashboard', component: FamilyDashboard, canActivate: [authGuard, roleGuard('FAMILY')] },
  { path: 'driver/dashboard', component: DriverDashboard, canActivate: [authGuard, roleGuard('DRIVER')] },
  { path: 'coordinator/dashboard', component: CoordinatorDashboard, canActivate: [authGuard, roleGuard('COORDINATOR')] },
  { path: '**', redirectTo: 'login' },

];
