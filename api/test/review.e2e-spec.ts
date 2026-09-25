import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';

const SENHA = 'senhaforte123';

// Clube da Luta: id estável na TMDB, usado só para resolver a mídia
const TMDB_ID = 550;
const BASE = `/reviews/media/movie/${TMDB_ID}`;

interface Stats {
  total: number;
  notaMedia: number | null;
  curtidas: number;
  distribuicao: number[];
}

describe('Reviews (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // o rate limit e por IP e derrubaria a suite inteira
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    const registro = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Reviews E2E', email: `reviews-${Date.now()}@teste.com`, password: SENHA })
      .expect(201);

    token = registro.body.accessToken;
  });

  afterAll(async () => {
    // nao deixa a ficha deste usuario poluindo as estatisticas do titulo
    await autenticado().post('/reviews').send({ tmdbId: TMDB_ID, mediaType: 'movie' });
    await app.close();
  });

  const server = () => request(app.getHttpServer());
  const autenticado = () => ({
    post: (rota: string) => server().post(rota).set('Authorization', `Bearer ${token}`),
    get: (rota: string) => server().get(rota).set('Authorization', `Bearer ${token}`),
  });

  const stats = async (): Promise<Stats> => (await server().get(`${BASE}/stats`).expect(200)).body;

  it('guarda nota, curtida e texto numa unica ficha', async () => {
    const res = await autenticado()
      .post('/reviews')
      .send({
        tmdbId: TMDB_ID,
        mediaType: 'movie',
        rating: 8,
        content: 'primeira regra',
        liked: true,
        watched: true,
      })
      .expect(201);

    expect(res.body.rating).toBe(8);
    expect(res.body.liked).toBe(true);
    expect(res.body.content).toBe('primeira regra');
    expect(res.body.watchedAt).toBeTruthy();
  });

  it('devolve a ficha do usuario no titulo', async () => {
    const res = await autenticado().get(`/reviews/me/movie/${TMDB_ID}`).expect(200);

    expect(res.body.rating).toBe(8);
    expect(res.body.liked).toBe(true);
  });

  it('aceita marcar so como assistido, sem nota nem texto', async () => {
    const res = await autenticado()
      .post('/reviews')
      .send({ tmdbId: TMDB_ID, mediaType: 'movie', watched: true })
      .expect(201);

    expect(res.body.watchedAt).toBeTruthy();
    // o corpo carrega a ficha inteira: o que nao veio foi limpo
    expect(res.body.rating).toBeNull();
    expect(res.body.content).toBeNull();
    expect(res.body.liked).toBe(false);
  });

  it('nao reescreve a data original ao remarcar como assistido', async () => {
    const primeira = await autenticado()
      .post('/reviews')
      .send({ tmdbId: TMDB_ID, mediaType: 'movie', watched: true })
      .expect(201);

    const segunda = await autenticado()
      .post('/reviews')
      .send({ tmdbId: TMDB_ID, mediaType: 'movie', watched: true, rating: 4 })
      .expect(201);

    expect(segunda.body.watchedAt).toBe(primeira.body.watchedAt);
  });

  it('conta nota e curtida na agregacao do titulo', async () => {
    const antes = await stats();

    await autenticado()
      .post('/reviews')
      .send({ tmdbId: TMDB_ID, mediaType: 'movie', rating: 10, liked: true, watched: true })
      .expect(201);

    const depois = await stats();

    // a ficha ja existia: o total nao muda, a distribuicao migra para a nota 10
    expect(depois.distribuicao[9]).toBe(antes.distribuicao[9] + 1);
    expect(depois.curtidas).toBe(antes.curtidas + 1);
    expect(depois.notaMedia).not.toBeNull();
    expect(depois.distribuicao).toHaveLength(10);
  });

  it('apaga a ficha quando o corpo vem todo vazio', async () => {
    const antes = await stats();

    const res = await autenticado()
      .post('/reviews')
      .send({ tmdbId: TMDB_ID, mediaType: 'movie' })
      .expect(201);

    expect(res.body.id).toBeUndefined();

    const depois = await stats();
    expect(depois.total).toBe(antes.total - 1);

    const minha = await autenticado().get(`/reviews/me/movie/${TMDB_ID}`).expect(200);
    expect(minha.body.id).toBeUndefined();
  });

  it('devolve agregacao zerada para midia que ninguem tocou', async () => {
    const res = await server().get('/reviews/media/movie/2/stats').expect(200);

    expect(res.body.total).toBe(0);
    expect(res.body.notaMedia).toBeNull();
    expect(res.body.distribuicao).toEqual(Array<number>(10).fill(0));
  });

  it('exige sessao para gravar e recusa campo desconhecido', async () => {
    await server().post('/reviews').send({ tmdbId: TMDB_ID, mediaType: 'movie' }).expect(401);

    await autenticado()
      .post('/reviews')
      .send({ tmdbId: TMDB_ID, mediaType: 'movie', rating: 5, admin: true })
      .expect(400);
  });

  it('recusa nota fora da faixa de 1 a 10', async () => {
    await autenticado()
      .post('/reviews')
      .send({ tmdbId: TMDB_ID, mediaType: 'movie', rating: 11 })
      .expect(400);

    await autenticado()
      .post('/reviews')
      .send({ tmdbId: TMDB_ID, mediaType: 'movie', rating: 0 })
      .expect(400);
  });
});
