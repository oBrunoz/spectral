export interface PublicUser {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
}

export interface SessionResponse {
  user?: PublicUser;
  accessToken: string;
}

export interface Credenciais {
  email: string;
  password: string;
}

export interface DadosCadastro extends Credenciais {
  name: string;
}
