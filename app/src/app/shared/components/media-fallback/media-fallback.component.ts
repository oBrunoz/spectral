import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideClapperboard, LucideImage, LucideUser } from '@lucide/angular';

export type FallbackKind = 'poster' | 'person' | 'logo';

@Component({
  selector: 'app-media-fallback',
  standalone: true,
  imports: [CommonModule, LucideClapperboard, LucideUser, LucideImage],
  templateUrl: './media-fallback.component.html',
})
export class MediaFallbackComponent {
  // que ícone aparece: claquete para título, silhueta para gente
  @Input() kind: FallbackKind = 'poster';

  // nome do título ou da pessoa; some nas molduras pequenas
  @Input() label = '';

  // molduras miúdas (avatar de busca, logo de streaming) ficam só com o ícone
  @Input() compact = false;
}
