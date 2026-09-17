import { Component } from '@angular/core';
import { MediaCatalogComponent } from '../../shared/components/media-catalog/media-catalog.component';

@Component({
  selector: 'app-movies',
  standalone: true,
  imports: [MediaCatalogComponent],
  templateUrl: './movies.component.html',
})
export class MoviesComponent {}
