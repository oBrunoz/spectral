import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Credenciais, DadosCadastro, PublicUser, SessionResponse } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/auth`;

  readonly usuario = signal<PublicUser | null>(null);
  readonly autenticado = computed(() => this.usuario() !== null);

  // fica só em memória: um XSS não consegue ler, e ele morre em 15 min
  private readonly accessToken = signal<string | null>(null);

  private renovacao$: Observable<string> | null = null;

  token(): string | null {
    return this.accessToken();
  }

  cadastrar(dados: DadosCadastro): Observable<PublicUser> {
    return this.http
      .post<SessionResponse>(`${this.base}/register`, dados, { withCredentials: true })
      .pipe(map((res) => this.aplicarSessao(res)));
  }

  entrar(credenciais: Credenciais): Observable<PublicUser> {
    return this.http
      .post<SessionResponse>(`${this.base}/login`, credenciais, { withCredentials: true })
      .pipe(map((res) => this.aplicarSessao(res)));
  }

  sair(): Observable<void> {
    return this.http
      .post<void>(`${this.base}/logout`, {}, { withCredentials: true })
      .pipe(
        catchError(() => of(void 0)),
        tap(() => this.limparSessao()),
      );
  }

  // uma renovação por vez: cinco requisições falhando juntas compartilham a mesma
  renovar(): Observable<string> {
    this.renovacao$ ??= this.http
      .post<SessionResponse>(`${this.base}/refresh`, {}, { withCredentials: true })
      .pipe(
        map((res) => {
          this.accessToken.set(res.accessToken);
          return res.accessToken;
        }),
        catchError((erro) => {
          this.limparSessao();
          return throwError(() => erro);
        }),
        finalize(() => {
          this.renovacao$ = null;
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    return this.renovacao$;
  }

  // o cookie de refresh é httpOnly, então só dá para saber se há sessão tentando usá-lo
  restaurarSessao(): Promise<void> {
    return new Promise((resolve) => {
      this.renovar()
        .pipe(
          switchMap(() => this.http.get<PublicUser>(`${this.base}/me`)),
          catchError(() => of(null)),
        )
        .subscribe((usuario) => {
          this.usuario.set(usuario);
          resolve();
        });
    });
  }

  limparSessao(): void {
    this.usuario.set(null);
    this.accessToken.set(null);
  }

  private aplicarSessao(res: SessionResponse): PublicUser {
    this.accessToken.set(res.accessToken);
    this.usuario.set(res.user ?? null);
    return res.user!;
  }
}
