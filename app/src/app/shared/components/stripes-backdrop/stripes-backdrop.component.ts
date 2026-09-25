import { Component } from '@angular/core';

/**
 * Camada decorativa de fundo: uma fita de listras anos 70 que atravessa
 * a página inteira, ancorada à altura do documento.
 *
 * É puramente declarativa — sem listener de scroll, sem animação, sem estado.
 * Fica atrás de todo o conteúdo (z-index -1) e não recebe interação.
 */
@Component({
  selector: 'app-stripes-backdrop',
  standalone: true,
  templateUrl: './stripes-backdrop.component.html',
  styleUrls: ['./stripes-backdrop.component.css'],
})
export class StripesBackdropComponent {}
