import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LucideEye, LucideEyeOff, LucideLock, LucideMail } from '@lucide/angular';
import { mensagemDeErro } from '../../core/errors/mensagens';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideMail, LucideLock, LucideEye, LucideEyeOff],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly rota = inject(ActivatedRoute);

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

    this.auth.entrar({ email: this.email(), password: this.password() }).subscribe({
      next: () => {
        const destino = this.rota.snapshot.queryParamMap.get('redirect') ?? '/';
        void this.router.navigateByUrl(destino);
      },
      error: (falha) => {
        this.enviando.set(false);
        this.erro.set(
          mensagemDeErro(falha, {
            401: 'E-mail ou senha incorretos. Confira e tente de novo.',
          }),
        );
      },
    });
  }
}
