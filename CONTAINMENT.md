# Mapa de Contención · Plume & Chrono (Iteraciones 1 a 4)

Cinco archivos con orden de carga fijo: `exercises.js` (datos), `audio.js` (sonido), `app.js` (lógica). Si `exercises.js` o `audio.js` fallan al cargar, la app sigue funcionando (con aviso o en silencio).

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

## Iteración 3: resultados, ranking, monetización

| Responsabilidad | Dueño en el código | Qué previene |
|---|---|---|
| Pantalla de resultados | `Results` (servicio compartido, `#resultsView`) | Cada módulo le entrega un objeto de datos; si falla, `safe()` lo contiene. Oculta el área de trabajo, no el reloj ni el mimo |
| Anti-trampas | `LB.check()` (máx. 130 PPM, mín. 30 s y 60 caracteres, entrada "sospechosa" de más de 40 caracteres de golpe) | Puntajes inhumanos o pegados: no se clasifican ni se guardan |
| Semana del ranking | `LB.weekId()` (lunes 00:00 hora de Toronto vía `Intl`, plan B UTC-5) | Reinicio semanal automático; cuenta regresiva en pantalla |
| Persistencia | `LocalStore` (por defecto, con 14 filas de muestra marcadas) y `SupabaseStore` (solo si `SITE.supabase` está completo) | Cambiar de backend sin tocar la interfaz |
| Nickname y email | `Profanity`, `nickError`, `emailOk` | Insultos (EN/ES/FR, con variantes leet/tildes); el email va solo a `pc_leads`, nunca a la tabla pública |
| Kit PDF y AdSense | `SITE.kit`, `SITE.adsense`, bloque `#adSlot` | Enlaces por idioma y anuncio solo en resultados, nunca junto a la escritura |
| Ranking vs. escritura | `setBusy()` | Mientras corre una prueba, el botón de ranking se desactiva |

Solo el Typing Sprint entra al ranking; los módulos II y III muestran resultados.

## Límites de la Iteración 3
- Los candados del navegador no frenan a quien manipule el código: para premios reales hacen falta restricciones (CHECK) y RLS en Supabase (esquema en comentario de `SITE`).
- Los premios se activan cuando se conecte el ranking en vivo; hasta entonces es modo demo.
- Faltan los enlaces reales del kit y los ids de AdSense en `SITE`.

## Feedback (sugerencias, opiniones y errores)

| Responsabilidad | Dueño en el código | Qué previene |
|---|---|---|
| Formulario de feedback | `Feedback` (módulo aislado) + bloque `#fbBox` en el pie de página | Nace colapsado; no se abre solo, no es modal, no usa `Timers` ni toca relojes, `Accents()`, `Coach()` ni `Results` |
| Contexto | `detectCtx()` lee `currentMod` y `Results.visible()` | El usuario no adivina dónde estaba; puede cambiarlo |
| Envío | `SITE.feedbackEndpoint` (POST JSON, 8 s de límite) o, si está vacío, `mailto:` a `SITE.feedbackEmail`; siempre hay "Copiar reporte" | Endpoint caído, lento o sin configurar: mensaje claro y el texto no se pierde. Si el portapapeles falla, se muestra el texto para copiarlo a mano |
| Validación | mensaje de 5 a 600 caracteres, email opcional validado con `emailOk`, caracteres de control eliminados | Vacíos, textos enormes, emails mal escritos |
| Anti-spam | campo señuelo oculto y espera de 8 s entre envíos | Bots y doble toque |

El mensaje adjunta solo modo, idioma y tipo de dispositivo; el email, si se escribe, solo viaja en ese reporte.

## Iteración 4: niveles y división en archivos

| Responsabilidad | Dueño en el código | Qué previene |
|---|---|---|
| Bancos de ejercicios | `exercises.js` (`window.PC_BANK`, solo datos) leído por `Bank` en `app.js` | Ítems inválidos se descartan sin lanzar error; agregar `en`/`es` no toca el motor |
| Filtro de nivel | `Levels` (`pool`, `next`, `keep`, `connectors`) + `#levelBar` | Cada módulo implementa `onLevel()` y reelige su propio ejercicio; el selector se bloquea mientras corre una prueba |
| Nivel sin ejercicios | `Levels.pool().fallback` + `#lvlNote` | Si un nivel está vacío en un modo, se muestran todos los niveles con un aviso amable; si no hay banco, aviso y botón de inicio deshabilitado |
| Conectores por nivel | `Levels.connectors(nivel del escenario)` | Un escenario A1 no pide conectores de nivel avanzado |
| Nivel en resultados y ranking | `Results` (chip) y `LB` (campo `lvl`, columna `level` en Supabase) | Dato informativo; no cambia el puntaje ni las reglas anti-trampas |
| Sonido | `audio.js` (`window.PCAudio`) y `Sound` en `app.js` con respaldo mudo | Un `audio.js` ausente o roto no frena la app |
| Reloj | `Timers` sigue siendo el único creador de intervalos | `showMod()` limpia al cambiar de pestaña |

Límites: C1 se muestra como "Avanzado". El ranking mezcla niveles; el nivel es solo informativo.

## Sprint: alineación tolerante y franja compacta

| Responsabilidad | Dueño en el código | Qué previene |
|---|---|---|
| Comparación texto/tipeo | `align()` dentro de `Modules[1]` (distancia de edición en banda de ±40, final libre, caché por valor) | Una letra omitida o de más ya no pinta de rojo todo lo que sigue: es un error localizado y el resto se realinea |
| Conteo de errores | errores actuales de la alineación + corregidos (`fixed`, uno por tanda de borrado) | Escribir hacia adelante no cuenta dos veces el mismo error; un error borrado sigue contando una vez, como antes |
| Fin del texto | exacto, o al llegar al último carácter alineado | Un texto con una omisión ya no queda "trabado" hasta 0:00 |
| Franja compacta | `#liveStrip` (sticky arriba), `renderStrip()`, `#lsClock` | Con el teclado abierto se ve el tramo actual del modelo y el tiempo; `visualViewport` mantiene el campo a la vista |
| Plan B | `positional()` si la alineación no se puede usar | Nunca se rompe la pantalla ni aparece NaN |
