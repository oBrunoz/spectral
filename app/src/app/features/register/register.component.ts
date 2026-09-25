import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LucideEye, LucideEyeOff, LucideLock, LucideMail, LucideUser } from '@lucide/angular';
import { erroMenciona, mensagemDeErro } from '../../core/errors/mensagens';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    LucideUser,
    LucideMail,
    LucideLock,
    LucideEye,
    LucideEyeOff,
  ],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  name = signal('');
  email = signal('');
  password = signal('');
  showPassword = signal(false);
  enviando = signal(false);
  erro = signal('');

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  onSubmit(): void {
    if (this.enviando()) return;

    this.enviando.set(true);
    this.erro.set('');

    this.auth
      .cadastrar({ name: this.name(), email: this.email(), password: this.password() })
      .subscribe({
        next: () => void this.router.navigateByUrl('/'),
        error: (falha) => {
          this.enviando.set(false);
          this.erro.set(
            mensagemDeErro(falha, {
              409: 'Esse e-mail já tem uma conta. Entre nela ou use outro endereço.',
              400: this.dadoInvalido(falha),
            }),
          );
        },
      });
  }

  private dadoInvalido(falha: unknown): string {
    const problemas = [
      erroMenciona(falha, 'name') ? 'Informe seu nome, com pelo menos 2 letras.' : '',
      erroMenciona(falha, 'email') ? 'Informe um e-mail válido.' : '',
      erroMenciona(falha, 'password') ? 'A senha precisa ter pelo menos 8 caracteres.' : '',
    ].filter(Boolean);

    return problemas.length > 0 ? problemas.join(' ') : 'Revise os dados informados e tente de novo.';
  }
}
