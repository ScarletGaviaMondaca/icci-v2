import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../servicios/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError(err => {
      // Solo logout si el 401 viene del login/verificación, no de cambio de contraseña
      if (err.status === 401 && !req.url.includes('accion=cambiarMiPassword') &&
      !req.url.includes('accion=listar') && 
      !req.url.includes('registro-empleador')
      ) {
        auth.logout();
      }
      return throwError(() => err);
    })
  );
};