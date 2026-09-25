import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  Output,
  EventEmitter,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
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

  // o pai lista as avaliacoes publicas e precisa refletir a do usuario na hora
  @Output() avaliacaoAlterada = new EventEmitter<void>();

  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly watchlist = inject(WatchlistService);
  private readonly avaliacoes = inject(AvaliacaoService);

  readonly notas = NOTAS;

  naWatchlist = signal(false);
  nota = signal<number | null>(null);
  notaVisualizada = signal<number | null>(null);
  texto = signal('');
  avaliacaoId = signal<string | null>(null);

  // referência estável: um getter devolveria objeto novo a cada ciclo de
  // detecção e o Angular acusaria mudança depois de verificado
  destinoAposLogin: Record<string, string> = {};

  carregando = signal(false);
  salvandoWatchlist = signal(false);
  salvandoAvaliacao = signal(false);
  erroCarga = signal('');
  erro = signal('');
  confirmacao = signal('');
  confirmandoExclusao = signal(false);

  // emite a cada troca de título para descartar respostas da carga anterior
  private cancelarCarga$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  ngOnChanges(): void {
    this.destinoAposLogin = { redirect: this.router.url };
    this.cancelarCarga$.next();
    this.limparEstado();
    if (this.auth.autenticado() && this.tmdbId) this.carregar();
  }

  ngOnDestroy(): void {
    this.cancelarCarga$.next();
    this.cancelarCarga$.complete();
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
    if (this.salvandoWatchlist()) return;
    this.salvandoWatchlist.set(true);
    this.erro.set('');

    const acao: Observable<unknown> = this.naWatchlist()
      ? this.watchlist.remover(this.tmdbId, this.mediaType)
      : this.watchlist.adicionar(this.tmdbId, this.mediaType);

    const queria = !this.naWatchlist();

    acao.pipe(takeUntil(this.cancelarCarga$), takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.naWatchlist.set(queria);
        this.salvandoWatchlist.set(false);
      },
      error: (falha) => {
        // 404 ao remover significa que ja nao estava la: o botao e que estava errado
        if (falha instanceof HttpErrorResponse && falha.status === 404 && !queria) {
          this.naWatchlist.set(false);
        } else {
          this.erro.set(mensagemDeErro(falha));
        }
        this.salvandoWatchlist.set(false);
      },
    });
  }

  salvarAvaliacao(): void {
    if (this.salvandoAvaliacao() || this.carregando()) return;

    const conteudo = this.texto().trim();
    if (this.nota() === null && conteudo === '') {
      this.erro.set('Dê uma nota ou escreva algo antes de salvar.');
      return;
    }

    this.salvandoAvaliacao.set(true);
    this.erro.set('');
    this.confirmacao.set('');
    this.confirmandoExclusao.set(false);

    this.avaliacoes
      .salvar({
        tmdbId: this.tmdbId,
        mediaType: this.mediaType,
        ...(this.nota() !== null && { rating: this.nota()! }),
        ...(conteudo !== '' && { content: conteudo }),
      })
      .pipe(takeUntil(this.cancelarCarga$), takeUntil(this.destroy$))
      .subscribe({
        next: (salva) => {
          this.avaliacaoId.set(salva.id);
          this.confirmacao.set('Avaliação salva.');
          this.salvandoAvaliacao.set(false);
          this.avaliacaoAlterada.emit();
        },
        error: (falha) => {
          this.erro.set(mensagemDeErro(falha));
          this.salvandoAvaliacao.set(false);
        },
      });
  }

  apagarAvaliacao(): void {
    const id = this.avaliacaoId();
    if (!id || this.salvandoAvaliacao()) return;

    if (!this.confirmandoExclusao()) {
      this.confirmandoExclusao.set(true);
      return;
    }

    this.confirmandoExclusao.set(false);
    this.salvandoAvaliacao.set(true);
    this.avaliacoes
      .remover(id)
      .pipe(takeUntil(this.cancelarCarga$), takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.avaliacaoId.set(null);
          this.nota.set(null);
          this.texto.set('');
          this.confirmacao.set('Avaliação removida.');
          this.salvandoAvaliacao.set(false);
          this.avaliacaoAlterada.emit();
        },
        error: (falha) => {
          this.erro.set(mensagemDeErro(falha));
          this.salvandoAvaliacao.set(false);
        },
      });
  }

  private carregar(): void {
    this.carregando.set(true);
    this.erroCarga.set('');

    this.watchlist
      .contem(this.tmdbId, this.mediaType)
      .pipe(takeUntil(this.cancelarCarga$), takeUntil(this.destroy$))
      .subscribe({
        next: ({ present }) => this.naWatchlist.set(present),
        error: (falha) => this.erroCarga.set(mensagemDeErro(falha)),
      });

    this.avaliacoes
      .minhaNoTitulo(this.tmdbId, this.mediaType)
      .pipe(takeUntil(this.cancelarCarga$), takeUntil(this.destroy$))
      .subscribe({
        next: (minha) => {
          this.avaliacaoId.set(minha?.id ?? null);
          this.nota.set(minha?.rating ?? null);
          this.texto.set(minha?.content ?? '');
          this.carregando.set(false);
        },
        error: (falha) => {
          this.erroCarga.set(mensagemDeErro(falha));
          this.carregando.set(false);
        },
      });
  }

  private limparEstado(): void {
    this.naWatchlist.set(false);
    this.nota.set(null);
    this.notaVisualizada.set(null);
    this.texto.set('');
    this.avaliacaoId.set(null);
    this.carregando.set(false);
    this.salvandoWatchlist.set(false);
    this.salvandoAvaliacao.set(false);
    this.erroCarga.set('');
    this.erro.set('');
    this.confirmacao.set('');
    this.confirmandoExclusao.set(false);
  }
}
