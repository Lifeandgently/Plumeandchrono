# Mapa de Contención · Plume & Chrono (Iteraciones 1 y 2)

Un solo archivo (`index.html`), pero con responsabilidades separadas dentro del script. Cuando se divida en archivos (Iteración 4), cada bloque pasa a su archivo sin cambiar de lógica.

## Dónde vive cada responsabilidad

| Responsabilidad | Dueño en el código | Qué previene |
|---|---|---|
| Relojes e intervalos | `Timers` (único que crea `setInterval`/`setTimeout`) | Relojes fantasma: al cambiar de pestaña `showMod()` llama `unmount()` del módulo y `Timers.clearAll()`; al terminar una prueba se llama `Timers.stop()` |
| Estado del Typing Sprint | `Modules[1]` (función `TypingSprint`, variables privadas) | Un bug aquí no toca a otros módulos: el shell solo llama `mount()`, `unmount()` y `onLang()` dentro de `safe()` |
| Audio | `Sound` (todo dentro de `quiet()`) | `AudioContext` bloqueado, `resume()` rechazado, oscilador que falla o dispositivo en silencio: nunca lanza excepción ni frena el cronómetro |
| Desbloqueo de audio | `Sound.unlock()` en `pointerdown`, `touchend`, `click`, `keydown` | Contexto suspendido en Android hasta el primer gesto real |
| Barra de acentos | `TypingSprint.insertChar()` | Inserta en `selectionStart`/`selectionEnd`, dispara `input`, mantiene el foco (los botones cancelan `pointerdown`/`touchstart`), respeta `maxLength`, tiene plan B si `setRangeText` falla |
| Anti-pegado | `paste`, `drop`, `cut`, `beforeinput` (`insertFromPaste`, etc.) | Pegar, soltar o cortar texto en el campo |
| Teclado táctil | atributos del `<textarea>` | `autocorrect="off"`, `autocapitalize="off"`, `spellcheck="false"`, `writingsuggestions="false"`, sin Grammarly |
| Puntaje | `TypingSprint.compute()` | División por cero (tiempo mínimo de 1 s en el cálculo y WPM = 0 si pasaron menos de 2 s), texto vacío (precisión 100 %), `NaN`/`Infinity` convertidos a 0, precisión acotada a 0–100 |
| Módulo II (60s Improv) | `Modules[2]` (función `Improv`, variables privadas) | Sus fases, su reloj, su mimo y sus conectores no se comparten; al cambiar de pestaña se reinicia |
| Módulo III (Speed Reading) | `Modules[3]` (función `Reading`, variables privadas) | Sus respuestas y su reloj de 3 min son propios; se auto-envía en 0:00 |
| Barra de acentos | `Accents()` (servicio compartido) | Una sola implementación del cursor para el Sprint y el Improv |
| Mimo junto al reloj (módulos II y III) | `Coach()` (servicio compartido), un mimo por módulo | Cada módulo reacciona solo a su propio reloj |
| Mimo del encabezado | `#mimeHeader`, se dibuja una vez en calma | Nadie le cambia el estado |
| Mimo junto al reloj | `#mimeCoach`, `setMime()` dentro de `TypingSprint` | Es el único que reacciona (calma, escribiendo, últimos 20 s, victoria) |
| Almacenamiento | `store` (con `try/catch`) y `Board` | `localStorage` bloqueado o corrupto: la app sigue sin guardar |
| Idioma | `applyLang()` (shell) + `onLang()` por módulo | Cada módulo traduce lo suyo |

## Contrato para módulos nuevos (Iteración 2)
Cada módulo se registra como `Modules[n] = { mount(), unmount(), onLang() }`, usa sus propios ids de DOM y sus propias variables, crea relojes solo con `Timers` y suena solo con `Sound`. No lee ni escribe el estado de otro módulo.

## Pruebas hechas (Chromium, perfil de tablet táctil)
Cursor en medio del texto, foco tras tocar una tecla, pegado bloqueado, cambio de pestaña en plena prueba (reloj en 2:00 y sin fin fantasma), fin de tiempo con bloqueo, audio bloqueado desde el inicio, `resume()` rechazado con oscilador roto, prueba de 1 carácter y reinicio, sin `NaN` ni `Infinity` en pantalla y sin errores de página.

## Límite conocido
Algunos teclados de Android ignoran `autocorrect="off"`. Si un teclado inserta una sugerencia de palabra, el texto cuenta como lo que quedó escrito; no se puede bloquear al 100 % desde la web.
