import { Component } from '@angular/core';

@Component({
  selector: 'app-operaciones',
  template: `
    <div class="operaciones-404">
      <img src="/assets/illustrations/404-error-with-a-cute-animal.svg" alt="404" />
      <div class="mensaje text-center mt-3">Sección de Operaciones</div>
    </div>
  `,
  styles: [`
    .operaciones-404 { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:2rem; }
    .operaciones-404 img { max-width:480px; width:100%; height:auto; object-fit:contain; }
    .mensaje{ font-size:1.05rem; color:#666; }
  `]
})
export class OperacionesComponent { }
