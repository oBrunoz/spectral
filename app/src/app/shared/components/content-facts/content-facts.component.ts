import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideExternalLink } from '@lucide/angular';
import { ContentDetails, Keyword } from '../../../core/models/tmdb.models';

interface Fato {
  label: string;
  value: string;
}

interface LinkExterno {
  label: string;
  url: string;
}

const STATUS_PT: Record<string, string> = {
  'Released': 'Lançado',
  'Rumored': 'Rumor',
  'Planned': 'Planejado',
  'In Production': 'Em produção',
  'Post Production': 'Pós-produção',
  'Canceled': 'Cancelado',
  'Returning Series': 'Em exibição',
  'Ended': 'Finalizada',
  'Pilot': 'Piloto',
};

@Component({
  selector: 'app-content-facts',
  standalone: true,
  imports: [CommonModule, LucideExternalLink],
  templateUrl: './content-facts.component.html',
})
export class ContentFactsComponent {
  @Input() details: ContentDetails | null = null;
  @Input() type: 'movie' | 'tv' = 'movie';
  @Input() certification = '';

  private formatCurrency(value?: number): string {
    if (!value) return '';
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });
  }

  private formatDate(value?: string): string {
    if (!value) return '';
    const date = new Date(`${value}T00:00:00`);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  private formatLanguage(code?: string): string {
    if (!code) return '';
    try {
      const name = new Intl.DisplayNames(['pt-BR'], { type: 'language' }).of(code);
      return name ? name.charAt(0).toUpperCase() + name.slice(1) : code.toUpperCase();
    } catch {
      return code.toUpperCase();
    }
  }

  get directors(): string {
    const crew = this.details?.credits?.crew ?? [];
    const nomes = crew.filter((c) => c.job === 'Director').map((c) => c.name);
    return [...new Set(nomes)].join(', ');
  }

  get writers(): string {
    const crew = this.details?.credits?.crew ?? [];
    const nomes = crew
      .filter((c) => ['Screenplay', 'Writer', 'Story'].includes(c.job))
      .map((c) => c.name);
    return [...new Set(nomes)].slice(0, 4).join(', ');
  }

  get creators(): string {
    return (this.details?.created_by ?? []).map((c) => c.name).join(', ');
  }

  get facts(): Fato[] {
    const d = this.details;
    if (!d) return [];

    const lista: Fato[] = [
      { label: 'Situação', value: d.status ? STATUS_PT[d.status] ?? d.status : '' },
      { label: 'Classificação', value: this.certification },
      { label: 'Idioma original', value: this.formatLanguage(d.original_language) },
    ];

    if (this.type === 'movie') {
      lista.push(
        { label: 'Lançamento', value: this.formatDate(d.release_date) },
        { label: 'Direção', value: this.directors },
        { label: 'Roteiro', value: this.writers },
        { label: 'Orçamento', value: this.formatCurrency(d.budget) },
        { label: 'Receita', value: this.formatCurrency(d.revenue) }
      );
    } else {
      lista.push(
        { label: 'Estreia', value: this.formatDate(d.first_air_date) },
        { label: 'Criação', value: this.creators },
        {
          label: 'Temporadas',
          value: d.number_of_seasons ? String(d.number_of_seasons) : '',
        },
        {
          label: 'Episódios',
          value: d.number_of_episodes ? String(d.number_of_episodes) : '',
        },
        {
          label: 'Emissora',
          value: (d.networks ?? []).map((n) => n.name).join(', '),
        }
      );
    }

    lista.push({
      label: this.type === 'movie' ? 'Produção' : 'Produtoras',
      value: (d.production_companies ?? [])
        .slice(0, 3)
        .map((c) => c.name)
        .join(', '),
    });

    return lista.filter((f) => !!f.value);
  }

  get keywords(): Keyword[] {
    const k = this.details?.keywords;
    return (k?.keywords ?? k?.results ?? []).slice(0, 12);
  }

  get externalLinks(): LinkExterno[] {
    const d = this.details;
    if (!d) return [];
    const ids = d.external_ids;

    return [
      { label: 'Site oficial', url: d.homepage ?? '' },
      { label: 'IMDb', url: ids?.imdb_id ? `https://www.imdb.com/title/${ids.imdb_id}` : '' },
      {
        label: 'Instagram',
        url: ids?.instagram_id ? `https://instagram.com/${ids.instagram_id}` : '',
      },
      { label: 'X', url: ids?.twitter_id ? `https://x.com/${ids.twitter_id}` : '' },
      {
        label: 'Facebook',
        url: ids?.facebook_id ? `https://facebook.com/${ids.facebook_id}` : '',
      },
    ].filter((l) => !!l.url);
  }

  get nextEpisodeLabel(): string {
    const next = this.details?.next_episode_to_air;
    if (!next?.air_date) return '';
    return `T${next.season_number}E${next.episode_number} · ${this.formatDate(next.air_date)}`;
  }
}
