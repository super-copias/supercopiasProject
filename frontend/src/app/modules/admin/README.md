Este módulo admin incluye un sidebar responsive inspirado en SB Admin Pro.

Comportamiento implementado:
- En escritorio (>768px): el botón hamburguesa alterna entre estado expandido (width 225px) y colapsado (width 72px). Cuando está colapsado, los textos del menú se ocultan y solo quedan los iconos.
- En móvil (<768px): el sidebar inicia oculto; al pulsar la hamburguesa se muestra como overlay (deslizando desde la izquierda) con backdrop oscuro. Al tocar fuera o seleccionar un item el sidebar se cierra.

Cómo funciona:
- `AdminComponent` expone `collapsed` y `mobileOpen`. El botón en la barra superior llama a `toggleSidebar()`.
- `SideNavComponent` recibe `@Input() collapsed` y `@Input() mobileOpen` y emite `requestClose` cuando debe cerrarse en móvil.

Notas:
- Variables CSS usadas: `--color-deep-blue`, `--color-dark-blue`. Asegúrate de tenerlas definidas en tus estilos globales.
- Revisa el comportamiento en distintos anchos y ajusta el breakpoint si lo deseas.

Pruebas recomendadas:
1) Abrir en escritorio y pulsar la hamburguesa: el sidebar debe contraerse y el contenido ajustarse.
2) Reducir a móvil, recargar (inicia cerrado), pulsar hamburguesa: aparece overlay y backdrop; pulsar backdrop o un item lo cierra.

Si quieres, puedo ajustar animaciones, ancho colapsado o mover el botón hamburguesa al extremo derecho en móvil para que coincida exactamente con la referencia visual.