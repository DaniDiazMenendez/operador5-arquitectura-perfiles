# Operador 5.0 · Arquitectura y perfiles

Copia independiente de la presentación de Operador 5.0. Conserva su planta 3D procedural, estética oscura y naranja, diez capas de arquitectura de referencia y seis perfiles funcionales: operación, enfermería, seguridad, contratista, coordinación y portería.

La aplicación original se conserva sin modificaciones. Esta copia tiene repositorio e historial propios: no publica el historial del proyecto de origen.

## Alcance

Se retiraron el mockup y sus imágenes, la introducción biométrica, el recorrido de un turno, sus pasos, las conversaciones simuladas y las variantes que incluían ese recorrido. Los perfiles no tienen miniaturas ni accesos a pantallas. Los nombres personales se generalizaron y no se presenta la situación de un contratista concreto.

La vista inicial muestra al operador en la planta sosteniendo una tablet 3D con pantalla neutra: el dispositivo no tiene capturas, texturas de la app ni contenido interactivo. «Planta» permite volver al conjunto.

«Arquitectura 3D» muestra las diez capas como satélites conectados sobre la misma planta. Sus posiciones organizan el diagrama, no sitúan servicios físicamente. Las líneas y partículas ilustran flujos propuestos, no tráfico de red real. Cada capa abre su documentación; «Capas técnicas» mantiene el mapa completo.

«Cómo funciona» documenta por separado la arquitectura **implementada**: GitHub Actions ejecuta las pruebas y Vite genera los archivos estáticos que publica GitHub Pages; el navegador ejecuta los módulos JavaScript, Three.js, WebGL, OrbitControls y CSS2DRenderer. Los perfiles y el grafo se alimentan de datos locales. No se confunde esta implementación con el diseño Microsoft propuesto.

Los perfiles muestran canal, identidad, alcance, permisos y componentes utilizados. Sus componentes abren la capa correspondiente de arquitectura y «Ver en la planta» localiza al personaje. La escena permite rotar, acercar, volver a la vista general y pausar la animación; respeta movimiento reducido. Arquitectura y perfiles siguen funcionando si WebGL no está disponible.

Es una presentación estática: los componentes, capacidades, permisos e integraciones son **de referencia**, no servicios desplegados ni una implementación de autenticación o seguridad industrial. No hay usuarios reales, datos médicos reales, llamadas a SAP, modelos de IA ni conexiones a Azure. Las capacidades operativas propuestas requieren validación y aprobación de los responsables de cada organización antes de implementarse.

## Uso

Requiere Node.js 24 o posterior.

```sh
npm ci
npm run dev
npm test
npm run preview
```

`npm test` comprueba la presentación, sus vínculos y el contenido publicado, y genera `dist` con Vite. La base relativa permite desplegar en GitHub Pages sin rutas de otras versiones. La publicación se realiza desde GitHub Actions.

Accesos directos: `?vista=arquitectura3d`, `?vista=planta`, `?tecnica`, `?arquitectura` o `?arquitectura=ia`; `?perfiles` o `?perfiles=operador`. Los identificadores de capa o perfil inválidos muestran una advertencia y la vista completa.

## Créditos

La geometría de planta, personas y caminos se reutiliza sin cambios de la presentación original autorizada por su propietario. El renderizado usa Three.js (licencia MIT), incluido en `public/THIRD_PARTY_NOTICES.txt`. No se reutilizan imágenes de pantallas ni documentos del proyecto original.
