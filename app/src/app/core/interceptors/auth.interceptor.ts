import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

// renovar a partir destas geraria laço: elas é que emitem o token
const SEM_RENOVACAO = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

function comToken<T>(req: HttpRequest<T>, token: string): HttpRequest<T> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) return next(req);

  // o proxy da TMDB é público: anexar o header ali só criaria um preflight por prateleira
  if (req.url.startsWith(`${environment.apiUrl}/tmdb`)) return next(req);

  const auth = inject(AuthService);
  const token = auth.token();

  return next(token ? comToken(req, token) : req).pipe(
    catchError((erro: HttpErrorResponse) => {
      const renovavel =
        erro.status === 401 && !SEM_RENOVACAO.some((rota) => req.url.includes(rota));

      if (!renovavel) return throwError(() => erro);

      return auth.renovar().pipe(
        switchMap((novoToken) => next(comToken(req, novoToken))),
        catchError((falha) => {
          auth.limparSessao();
          return throwError(() => falha);
        }),
      );
    }),
  );
};
