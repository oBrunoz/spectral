import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideMail } from '@lucide/angular';

interface FooterLink {
  label: string;
  route: string;
}

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideMail],
  templateUrl: './footer.component.html',
})
export class FooterComponent {
  currentYear = new Date().getFullYear();

  navegar: FooterLink[] = [
    { label: 'Home', route: '/' },
    { label: 'Filmes', route: '/movies' },
    { label: 'Séries', route: '/series' },
  ];

  conta: FooterLink[] = [
    { label: 'Entrar', route: '/login' },
    { label: 'Criar conta', route: '/register' },
    { label: 'Sobre o Boxd', route: '/' },
  ];
}
