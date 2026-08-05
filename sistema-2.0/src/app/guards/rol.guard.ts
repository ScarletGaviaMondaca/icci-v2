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
  const ROLES_SUPLIBLES = ['jefe_carrera', 'director_departamento'];
  const rolPedido = ROLES_SUPLIBLES.find(r => roles.includes(r));
  const esSubrogante = !!rolPedido && auth.esProfesor() && auth.esSubroganteDe(rolPedido);
  if (roles.length && !roles.includes(auth.getRol()!) && !esSubrogante) {
    router.navigate(['/sin-permiso']);
    return false;
  }
  return true;
};