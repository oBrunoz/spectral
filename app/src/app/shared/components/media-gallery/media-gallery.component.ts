import { Component, HostListener, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { LucidePlay, LucideX } from '@lucide/angular';
import { ImageBackdrop, Video } from '../../../core/models/tmdb.models';
import { environment } from '../../../../environments/environment';

type Aba = 'videos' | 'backdrops' | 'posters';

const TIPOS_RELEVANTES = ['Trailer', 'Teaser', 'Clip', 'Featurette', 'Behind the Scenes'];

@Component({
  selector: 'app-media-gallery',
  standalone: true,
  imports: [CommonModule, LucidePlay, LucideX],
  templateUrl: './media-gallery.component.html',
  styleUrls: ['./media-gallery.component.css'],
})
export class MediaGalleryComponent {
  @Input() set videos(value: Video[]) {
    this.videosSignal.set(value ?? []);
  }
  @Input() set backdrops(value: ImageBackdrop[]) {
    this.backdropsSignal.set(value ?? []);
  }
  @Input() set posters(value: ImageBackdrop[]) {
    this.postersSignal.set(value ?? []);
  }

  private videosSignal = signal<Video[]>([]);
  private backdropsSignal = signal<ImageBackdrop[]>([]);
  private postersSignal = signal<ImageBackdrop[]>([]);

  activeTab = signal<Aba>('videos');

  openVideoKey = signal<string | null>(null);
  openImageUrl = signal<string | null>(null);

  playableVideos = computed(() =>
    this.videosSignal()
      .filter((v) => v.site === 'YouTube' && TIPOS_RELEVANTES.includes(v.type))
      .sort((a, b) => TIPOS_RELEVANTES.indexOf(a.type) - TIPOS_RELEVANTES.indexOf(b.type))
      .slice(0, 12)
  );

  visibleBackdrops = computed(() => this.backdropsSignal().slice(0, 12));
  visiblePosters = computed(() => this.postersSignal().slice(0, 12));

  tabs = computed(() => {
    const list: { id: Aba; label: string; count: number }[] = [
      { id: 'videos', label: 'Vídeos', count: this.playableVideos().length },
      { id: 'backdrops', label: 'Imagens', count: this.visibleBackdrops().length },
      { id: 'posters', label: 'Pôsteres', count: this.visiblePosters().length },
    ];
    return list.filter((t) => t.count > 0);
  });

  hasMedia = computed(() => this.tabs().length > 0);

  constructor(private sanitizer: DomSanitizer) {}

  selectTab(tab: Aba): void {
    this.activeTab.set(tab);
  }

  /** A primeira aba com conteúdo é a ativa enquanto o usuário não escolher outra. */
  resolvedTab = computed<Aba | null>(() => {
    const disponiveis = this.tabs().map((t) => t.id);
    if (!disponiveis.length) return null;
    return disponiveis.includes(this.activeTab()) ? this.activeTab() : disponiveis[0];
  });

  thumbUrl(video: Video): string {
    return `https://img.youtube.com/vi/${video.key}/hqdefault.jpg`;
  }

  imageUrl(image: ImageBackdrop, size: string): string {
    return `${environment.tmdbImageUrl}/${size}${image.file_path}`;
  }

  openVideo(video: Video): void {
    this.openVideoKey.set(video.key);
  }

  openImage(image: ImageBackdrop): void {
    this.openImageUrl.set(this.imageUrl(image, 'original'));
  }

  closeOverlay(): void {
    this.openVideoKey.set(null);
    this.openImageUrl.set(null);
  }

  get safeEmbedUrl(): SafeResourceUrl | null {
    const key = this.openVideoKey();
    if (!key) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube.com/embed/${key}?autoplay=1&rel=0&modestbranding=1`
    );
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeOverlay();
  }
}
