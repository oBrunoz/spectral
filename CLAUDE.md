# Boxd

Catálogo de filmes e séries (dados da TMDB). Angular 20 standalone + Tailwind 3.
A aplicação vive em `app/` — todo comando npm roda a partir de lá.

```bash
cd app
npm start                              # ng serve
npx ng build --configuration development   # checagem rápida de template + tipos
```

## Estrutura

```
app/src/app/
  core/services/      movie.service (TMDB), loading.service, smooth-scroll.service
  core/interceptors/  loading.interceptor  (toda chamada HTTP acende a barra da navbar)
  core/models/        tmdb.models.ts
  features/           home, movies, series, details, login, register
  shared/components/  navbar, footer, hero-section, movie-card, cast-card,
                      carousel-row, stripes-backdrop
  shared/directives/  reveal.directive (appReveal)
```

Componentes são **standalone**, com `templateUrl`/`styleUrls` em arquivos separados
(nada de template inline). Estado com **signals**; HTTP com RxJS + `takeUntil(destroy$)`.
Controle de fluxo no template usa a sintaxe nova: `@if` / `@for` / `@else`.

## Vocabulário visual

Seguir o que já existe, não introduzir um sistema novo.

- **Fundos:** hex neutros — `#111111` (body), `#1a1a1a` (cards), `#0d0d0d` (footer,
  seções de respiro). **Não usar `gray-800`/`gray-900` do Tailwind**: têm pigmento
  azul e destoam do preto neutro do resto.
- **Texto:** `text-white` em títulos, `text-gray-400` em apoio, `text-gray-300` em
  parágrafos sobre imagem.
- **Botões:** `px-6 py-3 rounded-full transition duration-300 flex items-center`.
  Primário `bg-red-600 hover:bg-red-700`; secundário `bg-white/10 hover:bg-white/20`.
- **Pills de gênero:** sempre neutras (`bg-white/10 border border-white/15`).
  **Amarelo é exclusivo de nota** (`bg-yellow-500/20 text-yellow-400` + estrela).
- **Grid:** seções da home usam `px-20`. Manter o mesmo alinhamento em qualquer
  seção nova — hero e footer já foram alinhados a isso.
- **Ícones:** `@lucide/angular`. Ícones de marca (GitHub, Instagram, X) não existem
  na lib — usar SVG inline.
- **Links "ver todos":** `text-gray-400 hover:text-white`, com a seta acendendo em
  vermelho. Vermelho é reservado para ações.

Evitar: badges/kickers decorativos (`uppercase tracking-widest` do tipo "FAÇA PARTE"),
cards com borda `white/[0.06]` e gradientes genéricos. O usuário chama isso de
"cara de IA" e rejeita. Referência de estilo: Letterboxd/streaming — imagem grande,
tipografia sóbria, cor com parcimônia.

## Peças transversais

- **`carousel-row`** — toda fileira horizontal de cards usa ele (content projection).
  Faz detecção de borda, setas no hover e fade por `mask-image`. Não escrever
  carrossel na mão.
- **`stripes-backdrop`** — camada decorativa: SVG absoluto na altura do documento,
  `viewBox` percentual + `preserveAspectRatio="none"` + `vector-effect="non-scaling-stroke"`
  em **cada path** (a propriedade não é herdada). Começa em `top: 100vh` porque o
  hero é opaco. Sem JS.
- **Lenis** (smooth scroll) — o raf roda em `runOutsideAngular`. Containers com
  scroll próprio precisam de `data-lenis-prevent` (vertical) ou
  `data-lenis-prevent-horizontal`.
- **Barra de loading da navbar** — alimentada pelo interceptor e por eventos de rota;
  não chamar `LoadingService` manualmente nos componentes.

## Ao entregar

Rodar o build de desenvolvimento antes de dizer que terminou; ele valida template e
tipos. O projeto está sem warnings — manter assim.
