import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  LucideBookmark,
  LucideCheck,
  LucideEye,
  LucideHeart,
  LucideLink,
  LucideStar,
  LucideTrash2,
} from '@lucide/angular';
import { Observable, Subject, concatMap, of, takeUntil } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { mensagemDeErro } from '../../../core/errors/mensagens';
import {
  AvaliacaoUsuario,
  EnvioAvaliacao,
  TipoMidia,
} from '../../../core/models/catalogo.models';
import { AuthService } from '../../../core/services/auth.service';
import { AvaliacaoService } from '../../../core/services/avaliacao.service';
import { WatchlistService } from '../../../core/services/watchlist.service';

const ESTRELAS = [1, 2, 3, 4, 5];

// ficha do usuário no título: o que o backend guarda numa review
interface Ficha {
  nota: number | null;
  curtido: boolean;
  assistido: boolean;
  texto: string;
}

const FICHA_VAZIA: Ficha = { nota: null, curtido: false, assistido: false, texto: '' };

@Component({
  selector: 'app-media-actions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LucideBookmark,
    LucideCheck,
    LucideEye,
    LucideHeart,
    LucideLink,
    LucideStar,
    LucideTrash2,
  ],
  templateUrl: './media-actions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaActionsComponent implements OnInit, OnChanges, OnDestroy {
  @Input({ required: true }) tmdbId!: number;
  @Input({ required: true }) mediaType!: TipoMidia;

  // o pai lista as avaliações públicas e precisa refletir a do usuário na hora
  @Output() avaliacaoAlterada = new EventEmitter<void>();

  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly watchlist = inject(WatchlistService);
  private readonly avaliacoes = inject(AvaliacaoService);

  readonly estrelas = ESTRELAS;

  naWatchlist = signal(false);
  assistido = signal(false);
  curtido = signal(false);
  nota = signal<number | null>(null);
  notaVisualizada = signal<number | null>(null);
  texto = signal('');
  avaliacaoId = signal<string | null>(null);

  // referência estável: um getter devolveria objeto novo a cada ciclo de
  // detecção e o Angular acusaria mudança depois de verificado
  destinoAposLogin: Record<string, string> = {};

  carregando = signal(false);
  salvandoWatchlist = signal(false);
  salvandoFicha = signal(false);
  erroCarga = signal('');
  erro = signal('');
  confirmacao = signal('');
  confirmandoExclusao = signal(false);
  linkCopiado = signal(false);

  // último estado que o servidor confirmou, para desfazer quando a gravação falha
  private confirmada: Ficha = { ...FICHA_VAZIA };
  private pendentes = 0;
  private confirmacaoPendente = '';

  // as gravações entram em fila: com switchMap o servidor poderia aplicar
  // uma requisição antiga por último e o estado final sairia errado
  private fila$ = new Subject<number>();

  // emite a cada troca de título para descartar respostas da carga anterior
  private cancelarCarga$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.fila$
      .pipe(
        concatMap((alvo) => this.gravar(alvo)),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

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
    this.fila$.complete();
  }

  // meia estrela vale 1, cinco cheias valem 10
  preenchimento(estrela: number): 'cheia' | 'meia' | 'vazia' {
    const valor = this.notaVisualizada() ?? this.nota() ?? 0;
    if (valor >= estrela * 2) return 'cheia';
    if (valor === estrela * 2 - 1) return 'meia';
    return 'vazia';
  }

  definirNota(valor: number): void {
    // clicar de novo na mesma nota limpa, como no Letterboxd
    this.nota.set(this.nota() === valor ? null : valor);
    if (this.nota() !== null) this.assistido.set(true);
    this.enfileirar();
  }

  alternarAssistido(): void {
    const novo = !this.assistido();
    this.assistido.set(novo);
    // guardar nota e curtida sem estar assistido não faz sentido
    if (!novo) {
      this.nota.set(null);
      this.curtido.set(false);
    }
    this.enfileirar();
  }

  alternarCurtido(): void {
    this.curtido.update((v) => !v);
    if (this.curtido()) this.assistido.set(true);
    this.enfileirar();
  }

  salvarTexto(): void {
    this.confirmacao.set('');
    if (this.texto().trim() !== '') this.assistido.set(true);
    this.enfileirar(true);
  }

  apagarFicha(): void {
    if (!this.avaliacaoId()) return;

    if (!this.confirmandoExclusao()) {
      this.confirmandoExclusao.set(true);
      return;
    }

    this.confirmandoExclusao.set(false);
    this.aplicarFicha(FICHA_VAZIA);
    // ficha vazia: o backend apaga a review e devolve null
    this.enfileirar(true, 'Avaliação removida.');
  }

  alternarWatchlist(): void {
    if (this.salvandoWatchlist()) return;
    this.salvandoWatchlist.set(true);
    this.erro.set('');

    const queria = !this.naWatchlist();
    const acao: Observable<unknown> = queria
      ? this.watchlist.adicionar(this.tmdbId, this.mediaType)
      : this.watchlist.remover(this.tmdbId, this.mediaType);

    acao.pipe(takeUntil(this.cancelarCarga$), takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.naWatchlist.set(queria);
        this.salvandoWatchlist.set(false);
      },
      error: (falha) => {
        // 404 ao remover significa que já não estava lá: o botão é que estava errado
        if (falha instanceof HttpErrorResponse && falha.status === 404 && !queria) {
          this.naWatchlist.set(false);
        } else {
          this.erro.set(mensagemDeErro(falha));
        }
        this.salvandoWatchlist.set(false);
      },
    });
  }

  copiarLink(): void {
    if (!navigator.clipboard) {
      this.erro.set('Seu navegador não deixa copiar daqui. O link está na barra de endereço.');
      return;
    }

    navigator.clipboard.writeText(window.location.href).then(
      () => {
        this.linkCopiado.set(true);
        setTimeout(() => this.linkCopiado.set(false), 2000);
      },
      () => this.erro.set('Não conseguimos copiar o link. Tente pela barra de endereço.'),
    );
  }

  private enfileirar(comConfirmacao = false, mensagem = 'Avaliação salva.'): void {
    this.erro.set('');
    this.confirmandoExclusao.set(false);
    if (comConfirmacao) this.confirmacaoPendente = mensagem;

    this.pendentes += 1;
    this.salvandoFicha.set(true);
    this.fila$.next(this.tmdbId);
  }

  private gravar(alvo: number): Observable<void> {
    const enviada = this.fichaAtual();

    return this.avaliacoes.salvar(this.envio(enviada)).pipe(
      map((salva) => this.aplicarGravacao(alvo, enviada, salva)),
      catchError((falha) => of(this.desfazerGravacao(alvo, falha))),
    );
  }

  private aplicarGravacao(alvo: number, enviada: Ficha, salva: AvaliacaoUsuario | null): void {
    this.encerrarPendente();
    if (alvo !== this.tmdbId) return;

    this.confirmada = enviada;
    this.avaliacaoId.set(salva?.id ?? null);

    if (this.confirmacaoPendente) {
      this.confirmacao.set(this.confirmacaoPendente);
      this.confirmacaoPendente = '';
    }

    this.avaliacaoAlterada.emit();
  }

  private desfazerGravacao(alvo: number, falha: unknown): void {
    this.encerrarPendente();
    this.confirmacaoPendente = '';
    if (alvo !== this.tmdbId) return;

    this.aplicarFicha(this.confirmada);
    this.erro.set(mensagemDeErro(falha));
  }

  private encerrarPendente(): void {
    this.pendentes = Math.max(0, this.pendentes - 1);
    if (this.pendentes === 0) this.salvandoFicha.set(false);
  }

  private fichaAtual(): Ficha {
    return {
      nota: this.nota(),
      curtido: this.curtido(),
      assistido: this.assistido(),
      texto: this.texto().trim(),
    };
  }

  private aplicarFicha(ficha: Ficha): void {
    this.nota.set(ficha.nota);
    this.curtido.set(ficha.curtido);
    this.assistido.set(ficha.assistido);
    this.texto.set(ficha.texto);
  }

  private envio(ficha: Ficha): EnvioAvaliacao {
    return {
      tmdbId: this.tmdbId,
      mediaType: this.mediaType,
      liked: ficha.curtido,
      watched: ficha.assistido,
      ...(ficha.nota !== null && { rating: ficha.nota }),
      ...(ficha.texto !== '' && { content: ficha.texto }),
    };
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
          this.confirmada = {
            nota: minha?.rating ?? null,
            curtido: minha?.liked ?? false,
            assistido: Boolean(minha?.watchedAt),
            texto: minha?.content ?? '',
          };
          this.aplicarFicha(this.confirmada);
          this.carregando.set(false);
        },
        error: (falha) => {
          this.erroCarga.set(mensagemDeErro(falha));
          this.carregando.set(false);
        },
      });
  }

  private limparEstado(): void {
    this.pendentes = 0;
    this.confirmacaoPendente = '';
    this.confirmada = { ...FICHA_VAZIA };
    this.aplicarFicha(FICHA_VAZIA);
    this.naWatchlist.set(false);
    this.notaVisualizada.set(null);
    this.avaliacaoId.set(null);
    this.carregando.set(false);
    this.salvandoWatchlist.set(false);
    this.salvandoFicha.set(false);
    this.erroCarga.set('');
    this.erro.set('');
    this.confirmacao.set('');
    this.confirmandoExclusao.set(false);
    this.linkCopiado.set(false);
  }
}
