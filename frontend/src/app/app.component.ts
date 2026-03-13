import { Component, OnInit, ErrorHandler, Injectable } from '@angular/core';
import { Router, NavigationError } from '@angular/router';
import { AuthService } from './services/auth.service';

/**
 * Captura ChunkLoadError globalmente y recarga la página una sola vez.
 * Esto evita la pantalla en blanco cuando el usuario tiene cacheado un
 * runtime.js que apunta a chunks que ya no existen tras un nuevo deploy.
 */
@Injectable()
export class ChunkErrorHandler implements ErrorHandler {
  private reloaded = false;

  handleError(error: any): void {
    const isChunkError =
      error?.name === 'ChunkLoadError' ||
      /Loading chunk \d+ failed/i.test(error?.message || '') ||
      /loading chunk/i.test(error?.originalError?.message || '');

    if (isChunkError && !this.reloaded) {
      this.reloaded = true;
      console.warn('[AppComponent] ChunkLoadError detectado — recargando para obtener el build más reciente...');
      window.location.reload();
    } else {
      console.error(error);
    }
  }
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    // Captura NavigationError causados por ChunkLoadError en lazy routes
    this.router.events.subscribe(event => {
      if (event instanceof NavigationError) {
        const isChunkError =
          event.error?.name === 'ChunkLoadError' ||
          /Loading chunk \d+ failed/i.test(event.error?.message || '');
        if (isChunkError) {
          console.warn('[Router] ChunkLoadError en navegación — recargando...');
          window.location.assign(event.url);
        }
      }
    });
  }
}
