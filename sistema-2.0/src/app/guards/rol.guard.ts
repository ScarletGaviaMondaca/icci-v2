import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../servicios/auth.service';

export const rolGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  const roles: string[] = route.data['roles'] ?? [];

  if (!auth.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }
  if (roles.length && !roles.includes(auth.getRol()!)) {
    router.navigate(['/sin-permiso']);
    return false;
  }
  return true;
};