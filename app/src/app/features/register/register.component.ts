import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LucideEye, LucideEyeOff, LucideLock, LucideMail, LucideUser } from '@lucide/angular';
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
          this.erro.set(this.mensagem(falha));
        },
      });
  }

  private mensagem(falha: { status: number; error?: { message?: string | string[] } }): string {
    if (falha.status === 409) return 'Esse e-mail já está cadastrado.';
    if (falha.status === 429) return 'Muitas tentativas. Espere um minuto.';

    if (falha.status === 400) {
      const detalhe = falha.error?.message;
      if (Array.isArray(detalhe) && detalhe.some((m) => m.includes('password'))) {
        return 'A senha precisa de pelo menos 8 caracteres.';
      }
      return 'Confira os dados informados.';
    }

    return 'Não foi possível criar a conta. Tente de novo.';
  }
}
