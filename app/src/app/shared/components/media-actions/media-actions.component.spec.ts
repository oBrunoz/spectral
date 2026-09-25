import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, throwError } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { AvaliacaoService } from '../../../core/services/avaliacao.service';
import { AvaliacaoUsuario, ItemWatchlist } from '../../../core/models/catalogo.models';
import { WatchlistService } from '../../../core/services/watchlist.service';
import { MediaActionsComponent } from './media-actions.component';

describe('MediaActionsComponent', () => {
  let fixture: ComponentFixture<MediaActionsComponent>;
  let componente: MediaActionsComponent;

  let contem$: Subject<{ present: boolean }>;
  let cargasDeAvaliacao: Subject<AvaliacaoUsuario | null>[];
  let adicionar$: Subject<ItemWatchlist>;

  let watchlist: jasmine.SpyObj<WatchlistService>;
  let avaliacoes: jasmine.SpyObj<AvaliacaoService>;

  beforeEach(async () => {
    contem$ = new Subject();
    cargasDeAvaliacao = [];
    adicionar$ = new Subject();

    watchlist = jasmine.createSpyObj<WatchlistService>('WatchlistService', [
      'contem',
      'adicionar',
      'remover',
    ]);
    watchlist.contem.and.returnValue(contem$);
    watchlist.adicionar.and.returnValue(adicionar$);

    avaliacoes = jasmine.createSpyObj<AvaliacaoService>('AvaliacaoService', [
      'minhaNoTitulo',
      'salvar',
      'remover',
    ]);
    // uma carga por título, para poder responder a antiga depois da troca
    avaliacoes.minhaNoTitulo.and.callFake(() => {
      const carga = new Subject<AvaliacaoUsuario | null>();
      cargasDeAvaliacao.push(carga);
      return carga;
    });

    await TestBed.configureTestingModule({
      imports: [MediaActionsComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: WatchlistService, useValue: watchlist },
        { provide: AvaliacaoService, useValue: avaliacoes },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MediaActionsComponent);
    componente = fixture.componentInstance;
    TestBed.inject(AuthService).usuario.set({
      id: 'u1',
      name: 'Teste',
      avatarUrl: null,
      bio: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    });
  });

  function abrirTitulo(tmdbId: number): void {
    fixture.componentRef.setInput('tmdbId', tmdbId);
    fixture.componentRef.setInput('mediaType', 'movie');
    fixture.detectChanges();
  }

  it('não deixa o botão preso quando o item já não está na watchlist', () => {
    abrirTitulo(1);
    contem$.next({ present: true });
    expect(componente.naWatchlist()).toBeTrue();

    watchlist.remover.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );
    componente.alternarWatchlist();

    // 404 no remover quer dizer que já saiu: o estado visual é que estava errado
    expect(componente.naWatchlist()).toBeFalse();
    expect(componente.erro()).toBe('');
    expect(componente.salvandoWatchlist()).toBeFalse();
  });

  it('descarta a resposta da watchlist quando o título já mudou', () => {
    abrirTitulo(1);
    contem$.next({ present: false });

    componente.alternarWatchlist();
    abrirTitulo(2);

    // resposta do título 1 chegando depois da troca
    adicionar$.next({} as ItemWatchlist);

    expect(componente.naWatchlist()).toBeFalse();
  });

  it('descarta a avaliação do título anterior', () => {
    abrirTitulo(1);
    abrirTitulo(2);

    cargasDeAvaliacao[0].next({
      id: 'r1',
      rating: 9,
      content: 'do título antigo',
      watchedAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    expect(componente.avaliacaoId()).toBeNull();
    expect(componente.texto()).toBe('');
  });

  it('exige confirmação antes de excluir a avaliação', () => {
    abrirTitulo(1);
    componente.avaliacaoId.set('r1');

    componente.apagarAvaliacao();
    expect(avaliacoes.remover).not.toHaveBeenCalled();
    expect(componente.confirmandoExclusao()).toBeTrue();

    avaliacoes.remover.and.returnValue(new Subject<void>());
    componente.apagarAvaliacao();
    expect(avaliacoes.remover).toHaveBeenCalledWith('r1');
  });
});
