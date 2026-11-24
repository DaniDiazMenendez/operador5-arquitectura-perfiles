# Planta Conectada · Operación y arquitectura

Alex recorre una planta industrial 3D con su tablet, gestiona tareas por sector y consulta a Nexo, su asistente de demostración. Incluye diez capas de arquitectura de referencia Microsoft Cloud y seis perfiles funcionales: operación, enfermería, seguridad, contratista, coordinación y portería.

## Alcance

La vista inicial combina al operador con una consola interactiva de tareas y chat. Los puntos de Cinta 3, Ensacado, Despacho y Oficina actualizan el contexto y hacen caminar a Alex por las sendas de la planta, con la cámara acompañándolo y la tablet en la mano. «Planta» permite ver el conjunto. Con movimiento reducido, el cambio de sector es inmediato; la pausa detiene también el recorrido.

Las tareas pueden iniciarse, verificarse mediante un checklist y completarse con una observación. Solo hay una tarea en curso a la vez. La observación de equipo requiere coordinación y no puede autorizarla el operador ni el chat. Los avances y avisos se guardan en `localStorage` de este navegador; no se sincronizan entre dispositivos. Los fallos de almacenamiento se notifican y permiten seguir en memoria. «Reiniciar turno» pide confirmación antes de borrar ese avance local.

Nexo acepta texto libre y consultas sugeridas sobre tareas, guías ilustrativas, inventario ficticio y el resumen del turno. Usa reglas locales y fuentes de demostración inspeccionables, **no un modelo de IA ni RAG conectado**. Las consultas fuera del alcance se señalan, sin inventar respuestas. Preparar un aviso no lo crea: el visitante revisa el borrador y confirma «Crear aviso local». El borrador conserva su sector y tarea aunque después cambie el contexto. Ninguna conversación autoriza trabajos, cierra tareas ni envía registros a sistemas externos. Los mensajes se mantienen solo durante la visita y se reinician al recargar.

«Arquitectura 3D» muestra las diez capas como satélites conectados sobre la misma planta. Sus posiciones organizan el diagrama, no sitúan servicios físicamente. Las líneas y partículas ilustran flujos propuestos, no tráfico de red real. Cada capa abre su documentación; «Capas técnicas» mantiene el mapa completo.

Los perfiles muestran canal, identidad, alcance, permisos y componentes utilizados. Sus componentes abren la capa correspondiente de arquitectura y «Ver en la planta» localiza al personaje. La escena permite rotar, acercar, volver a la vista general y pausar la animación. Las tareas, Nexo, la arquitectura y los perfiles siguen funcionando si WebGL no está disponible.

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

Accesos directos: `?vista=arquitectura3d`, `?vista=planta`, `?arquitectura` o `?arquitectura=ia`; `?perfiles` o `?perfiles=operador`. Los identificadores de capa o perfil inválidos muestran una advertencia y la vista completa.

## Créditos

La geometría de planta y personas se reutiliza de la presentación original autorizada por su propietario. Las sendas se amplían para conectar los cuatro sectores de la demostración. El renderizado usa Three.js (licencia MIT), incluido en `public/THIRD_PARTY_NOTICES.txt`. No se reutilizan imágenes de pantallas ni documentos del proyecto original.
