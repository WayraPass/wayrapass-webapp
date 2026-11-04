import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { UserRole } from '../models/auth.models';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.ensureSession().pipe(
    map((authenticated) => authenticated ? true : router.createUrlTree(['/login'])),
  );
};

export const roleGuard = (expectedRole: UserRole): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.ensureSession().pipe(map((authenticated) => {
    const user = auth.user();
    if (!authenticated || !user) return router.createUrlTree(['/login']);
    return user.role === expectedRole
      ? true
      : router.createUrlTree([auth.dashboardPath(user.role)]);
  }));
};
