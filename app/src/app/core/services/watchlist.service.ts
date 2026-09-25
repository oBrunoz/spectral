import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ItemWatchlist, TipoMidia } from '../models/catalogo.models';

@Injectable({ providedIn: 'root' })
export class WatchlistService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/watchlist`;

  listar(limite = 50): Observable<ItemWatchlist[]> {
    return this.http.get<ItemWatchlist[]>(`${this.base}?limit=${limite}`);
  }

  contem(tmdbId: number, tipo: TipoMidia): Observable<{ present: boolean }> {
    return this.http.get<{ present: boolean }>(`${this.base}/${tipo}/${tmdbId}`);
  }

  adicionar(tmdbId: number, mediaType: TipoMidia): Observable<ItemWatchlist> {
    return this.http.post<ItemWatchlist>(this.base, { tmdbId, mediaType });
  }

  remover(tmdbId: number, tipo: TipoMidia): Observable<void> {
    return this.http.delete<void>(`${this.base}/${tipo}/${tmdbId}`);
  }
}
