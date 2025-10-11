import { Component, OnInit } from '@angular/core';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  template: `<router-outlet></router-outlet>`
})
export class AppComponent implements OnInit {
  
  constructor(private authService: AuthService) {}
  
  ngOnInit() {
    // El servicio se inicializa automáticamente en el constructor
    // Esto asegura que la verificación de token se ejecute al cargar la app
  }
}
