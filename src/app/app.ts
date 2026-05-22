import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SnackbarComponent } from './core/components/snackbar/snackbar.component';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SnackbarComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('hrms-pro');

  constructor() {
    inject(ThemeService); // eager init — applies saved theme before first render
  }
}
