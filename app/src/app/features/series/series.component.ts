import { Component } from '@angular/core';
import { MediaCatalogComponent } from '../../shared/components/media-catalog/media-catalog.component';

@Component({
  selector: 'app-series',
  standalone: true,
  imports: [MediaCatalogComponent],
  templateUrl: './series.component.html',
})
export class SeriesComponent {}
