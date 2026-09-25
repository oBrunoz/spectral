import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';

const SENHA = 'senhaforte123';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let email: string;

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

    email = `e2e-${Date.now()}@teste.com`;
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => request(app.getHttpServer());

  it('cadastra e devolve sessão sem vazar e-mail nem hash', async () => {
    const res = await server()
      .post('/auth/register')
      .send({ name: 'E2E', email, password: SENHA })
      .expect(201);

    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user.email).toBeUndefined();
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.headers['set-cookie'][0]).toContain('HttpOnly');
  });

  it('recusa e-mail repetido com 409', async () => {
    await server().post('/auth/register').send({ name: 'E2E', email, password: SENHA }).expect(409);
  });

  it('recusa campo desconhecido no corpo', async () => {
    await server()
      .post('/auth/register')
      .send({ name: 'X', email: `x-${Date.now()}@t.com`, password: SENHA, role: 'admin' })
      .expect(400);
  });

  it('responde a mesma mensagem para senha errada e e-mail inexistente', async () => {
    const senhaErrada = await server()
      .post('/auth/login')
      .send({ email, password: 'outrasenha123' })
      .expect(401);

    const semConta = await server()
      .post('/auth/login')
      .send({ email: `fantasma-${Date.now()}@t.com`, password: SENHA })
      .expect(401);

    expect(senhaErrada.body.message).toBe(semConta.body.message);
  });

  it('protege /auth/me e aceita o token emitido', async () => {
    await server().get('/auth/me').expect(401);
    await server().get('/auth/me').set('Authorization', 'Bearer lixo').expect(401);

    const login = await server().post('/auth/login').send({ email, password: SENHA }).expect(200);

    const me = await server()
      .get('/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    expect(me.body.id).toBe(login.body.user.id);
  });

  it('rotaciona o refresh e derruba a sessão se o antigo reaparecer', async () => {
    const login = await server().post('/auth/login').send({ email, password: SENHA }).expect(200);
    const cookieAntigo = login.headers['set-cookie'];

    const renovado = await server().post('/auth/refresh').set('Cookie', cookieAntigo).expect(200);
    expect(renovado.headers['set-cookie'][0]).not.toBe(cookieAntigo[0]);

    await server().post('/auth/refresh').set('Cookie', cookieAntigo).expect(401);
    await server()
      .post('/auth/refresh')
      .set('Cookie', renovado.headers['set-cookie'])
      .expect(401);
  });
});
