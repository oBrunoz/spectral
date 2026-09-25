import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AvaliacaoUsuario, EnvioAvaliacao, TipoMidia } from '../models/catalogo.models';

@Injectable({ providedIn: 'root' })
export class AvaliacaoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/reviews`;

  porTitulo(tmdbId: number, tipo: TipoMidia, limite = 20): Observable<AvaliacaoUsuario[]> {
    return this.http.get<AvaliacaoUsuario[]>(`${this.base}/media/${tipo}/${tmdbId}?limit=${limite}`);
  }

  porUsuario(userId: string, limite = 50): Observable<AvaliacaoUsuario[]> {
    return this.http.get<AvaliacaoUsuario[]>(`${this.base}/user/${userId}?limit=${limite}`);
  }

  salvar(envio: EnvioAvaliacao): Observable<AvaliacaoUsuario> {
    return this.http.post<AvaliacaoUsuario>(this.base, envio);
  }

  remover(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
