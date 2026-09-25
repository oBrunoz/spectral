import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LucideBookmark, LucideCheck, LucideStar, LucideTrash2 } from '@lucide/angular';
import { Observable, Subject, takeUntil } from 'rxjs';
import { mensagemDeErro } from '../../../core/errors/mensagens';
import { TipoMidia } from '../../../core/models/catalogo.models';
import { AuthService } from '../../../core/services/auth.service';
import { AvaliacaoService } from '../../../core/services/avaliacao.service';
import { WatchlistService } from '../../../core/services/watchlist.service';

const NOTAS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

@Component({
  selector: 'app-media-actions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LucideBookmark,
    LucideCheck,
    LucideStar,
    LucideTrash2,
  ],
  templateUrl: './media-actions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaActionsComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) tmdbId!: number;
  @Input({ required: true }) mediaType!: TipoMidia;

  readonly auth = inject(AuthService);
  private readonly watchlist = inject(WatchlistService);
  private readonly avaliacoes = inject(AvaliacaoService);

  readonly notas = NOTAS;

  naWatchlist = signal(false);
  nota = signal<number | null>(null);
  notaVisualizada = signal<number | null>(null);
  texto = signal('');
  avaliacaoId = signal<string | null>(null);

  ocupado = signal(false);
  erro = signal('');
  confirmacao = signal('');

  private destroy$ = new Subject<void>();

  ngOnChanges(): void {
    this.limparEstado();
    if (this.auth.autenticado() && this.tmdbId) this.carregar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  estrelaAtiva(valor: number): boolean {
    return valor <= (this.notaVisualizada() ?? this.nota() ?? 0);
  }

  definirNota(valor: number): void {
    this.nota.set(this.nota() === valor ? null : valor);
  }

  alternarWatchlist(): void {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.erro.set('');

    const acao: Observable<unknown> = this.naWatchlist()
      ? this.watchlist.remover(this.tmdbId, this.mediaType)
      : this.watchlist.adicionar(this.tmdbId, this.mediaType);

    acao.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.naWatchlist.update((v) => !v);
        this.ocupado.set(false);
      },
      error: (falha) => {
        this.erro.set(mensagemDeErro(falha));
        this.ocupado.set(false);
      },
    });
  }

  salvarAvaliacao(): void {
    if (this.ocupado()) return;

    const conteudo = this.texto().trim();
    if (this.nota() === null && conteudo === '') {
      this.erro.set('Dê uma nota ou escreva algo antes de salvar.');
      return;
    }

    this.ocupado.set(true);
    this.erro.set('');
    this.confirmacao.set('');

    this.avaliacoes
      .salvar({
        tmdbId: this.tmdbId,
        mediaType: this.mediaType,
        ...(this.nota() !== null && { rating: this.nota()! }),
        ...(conteudo !== '' && { content: conteudo }),
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (salva) => {
          this.avaliacaoId.set(salva.id);
          this.confirmacao.set('Avaliação salva.');
          this.ocupado.set(false);
        },
        error: (falha) => {
          this.erro.set(mensagemDeErro(falha));
          this.ocupado.set(false);
        },
      });
  }

  apagarAvaliacao(): void {
    const id = this.avaliacaoId();
    if (!id || this.ocupado()) return;

    this.ocupado.set(true);
    this.avaliacoes
      .remover(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.avaliacaoId.set(null);
          this.nota.set(null);
          this.texto.set('');
          this.confirmacao.set('Avaliação removida.');
          this.ocupado.set(false);
        },
        error: (falha) => {
          this.erro.set(mensagemDeErro(falha));
          this.ocupado.set(false);
        },
      });
  }

  private carregar(): void {
    this.watchlist
      .contem(this.tmdbId, this.mediaType)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ present }) => this.naWatchlist.set(present),
        error: () => this.naWatchlist.set(false),
      });

    const meuId = this.auth.usuario()?.id;
    if (!meuId) return;

    this.avaliacoes
      .porTitulo(this.tmdbId, this.mediaType)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (lista) => {
          const minha = lista.find((item) => item.user?.id === meuId);
          this.avaliacaoId.set(minha?.id ?? null);
          this.nota.set(minha?.rating ?? null);
          this.texto.set(minha?.content ?? '');
        },
        error: () => undefined,
      });
  }

  private limparEstado(): void {
    this.naWatchlist.set(false);
    this.nota.set(null);
    this.texto.set('');
    this.avaliacaoId.set(null);
    this.erro.set('');
    this.confirmacao.set('');
  }
}
