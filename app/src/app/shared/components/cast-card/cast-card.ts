import { ChangeDetectionStrategy, Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CastMember } from '../../../core/models/tmdb.models';
import { MediaFallbackComponent } from '../media-fallback/media-fallback.component';

export interface MappedCastMember extends CastMember {
  profileUrl: string;
}

@Component({
  selector: 'app-cast-card',
  standalone: true,
  imports: [CommonModule, MediaFallbackComponent],
  templateUrl: './cast-card.html',
  styleUrl: './cast-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CastCard {
  @Input({ required: true }) actor!: MappedCastMember;

  @Output() selected = new EventEmitter<number>();
}
