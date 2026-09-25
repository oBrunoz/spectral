import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LucideX } from '@lucide/angular';
import { Subject, takeUntil } from 'rxjs';
import { mensagemDeErro } from '../../core/errors/mensagens';
import { AvaliacaoUsuario, ItemWatchlist, Midia } from '../../core/models/catalogo.models';
import { AuthService } from '../../core/services/auth.service';
import { AvaliacaoService } from '../../core/services/avaliacao.service';
import { WatchlistService } from '../../core/services/watchlist.service';
import { MovieCardComponent } from '../../shared/components/movie-card/movie-card.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, MovieCardComponent, LucideX],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  private readonly watchlistService = inject(WatchlistService);
  private readonly avaliacaoService = inject(AvaliacaoService);

  watchlist = signal<ItemWatchlist[]>([]);
  avaliacoes = signal<AvaliacaoUsuario[]>([]);
  carregandoWatchlist = signal(true);
  carregandoAvaliacoes = signal(true);
  erroWatchlist = signal('');
  erroAvaliacoes = signal('');
  removendo = signal<string | null>(null);

  readonly notaMedia = computed(() => {
    const notas = this.avaliacoes()
      .map((a) => a.rating)
      .filter((n): n is number => n !== null);

    if (notas.length === 0) return null;
    return notas.reduce((soma, n) => soma + n, 0) / notas.length;
  });

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    const meuId = this.auth.usuario()?.id;
    if (!meuId) return;

    this.watchlistService
      .listar()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (itens) => {
          this.watchlist.set(itens);
          this.carregandoWatchlist.set(false);
        },
        error: (falha) => {
          this.erroWatchlist.set(mensagemDeErro(falha));
          this.carregandoWatchlist.set(false);
        },
      });

    this.avaliacaoService
      .porUsuario(meuId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (lista) => {
          this.avaliacoes.set(lista);
          this.carregandoAvaliacoes.set(false);
        },
        error: (falha) => {
          this.erroAvaliacoes.set(mensagemDeErro(falha));
          this.carregandoAvaliacoes.set(false);
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  removerDaWatchlist(item: ItemWatchlist): void {
    if (this.removendo()) return;
    this.removendo.set(item.id);
    this.erroWatchlist.set('');

    const tipo = item.media.type === 'MOVIE' ? 'movie' : 'tv';

    this.watchlistService
      .remover(item.media.tmdbId, tipo)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.watchlist.update((itens) => itens.filter((i) => i.id !== item.id));
          this.removendo.set(null);
        },
        error: (falha) => {
          this.erroWatchlist.set(mensagemDeErro(falha));
          this.removendo.set(null);
        },
      });
  }

  tipoDeCard(midia: Midia): 'movies' | 'series' {
    return midia.type === 'MOVIE' ? 'movies' : 'series';
  }

  ano(midia: Midia): string {
    return midia.releaseDate ? midia.releaseDate.slice(0, 4) : '';
  }
}
