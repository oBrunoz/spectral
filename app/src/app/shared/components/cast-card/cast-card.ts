import { ChangeDetectionStrategy, Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CastMember } from '../../../core/models/tmdb.models';

export interface MappedCastMember extends CastMember {
  profileUrl: string;
}

@Component({
  selector: 'app-cast-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cast-card.html',
  styleUrl: './cast-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CastCard {
  @Input({ required: true }) actor!: MappedCastMember;

  @Output() selected = new EventEmitter<number>();
}
