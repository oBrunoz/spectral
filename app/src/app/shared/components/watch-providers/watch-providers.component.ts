import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideExternalLink } from '@lucide/angular';
import { WatchProvider, WatchProviderCountry } from '../../../core/models/tmdb.models';
import { environment } from '../../../../environments/environment';
import { MediaFallbackComponent } from '../media-fallback/media-fallback.component';

interface ProviderGroup {
  label: string;
  items: WatchProvider[];
}

@Component({
  selector: 'app-watch-providers',
  standalone: true,
  imports: [CommonModule, LucideExternalLink, MediaFallbackComponent],
  templateUrl: './watch-providers.component.html',
})
export class WatchProvidersComponent {
  @Input() providers: WatchProviderCountry | null = null;

  get groups(): ProviderGroup[] {
    const p = this.providers;
    if (!p) return [];

    return [
      { label: 'Assinatura', items: p.flatrate ?? [] },
      { label: 'Grátis', items: p.free ?? [] },
      { label: 'Com anúncios', items: p.ads ?? [] },
      { label: 'Alugar', items: p.rent ?? [] },
      { label: 'Comprar', items: p.buy ?? [] },
    ].filter((g) => g.items.length > 0);
  }

  get hasProviders(): boolean {
    return this.groups.length > 0;
  }

  get link(): string {
    return this.providers?.link ?? '';
  }

  logoUrl(provider: WatchProvider): string {
    return provider.logo_path
      ? `${environment.tmdbImageUrl}/w154${provider.logo_path}`
      : '';
  }
}
