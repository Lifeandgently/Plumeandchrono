# Subir Plume & Chrono a Hostinger y probar en la tablet

## Archivos (los cinco, en la misma carpeta)
`index.html`, `style.css`, `exercises.js`, `audio.js`, `app.js`

## Subida
0. En `index.html`, cambia el valor de `?v=` en las 4 líneas (el mismo en todas) cada vez que subas archivos nuevos. Así la tablet no mezcla archivos viejos y nuevos.
1. hPanel > Administrador de archivos > `public_html` (o la subcarpeta elegida).
2. Subí los cinco archivos juntos, sin renombrar y sin carpetas intermedias. Las rutas son relativas.
3. Abrí `https://tudominio.com/` (o la subcarpeta) en la tablet.

## Antes de publicar
- `app.js`, bloque `SITE`: completar `kit.en` / `kit.es` (enlaces https del PDF Kit), `ads.client` / `ads.slot` (AdSense) y, si querés ranking en vivo, `supabase.url` / `supabase.anonKey`. Para el feedback por endpoint: `feedbackEndpoint`.
- Si usás AdSense, agregá su script en `index.html` (dentro de `<head>`) cuando tengas el id de cliente.

## Checklist de prueba en la tablet Android
- [ ] Carga sin pantalla en blanco; los 3 modos abren y el encabezado muestra el mimo en calma.
- [ ] Rutas: en Chrome (menú > Herramientas > consola) no hay 404 para `style.css`, `exercises.js`, `audio.js` ni `app.js`.
- [ ] Nivel: tocar Todos / A1 / A2 / B1 / B2 / Avanzado cambia el ejercicio; "Otro texto" / "Otro ejercicio" respeta el nivel; durante una prueba los botones de nivel se bloquean.
- [ ] Teclado virtual: al tocar el cuadro de escritura aparece el teclado, la barra de tildes inserta en el cursor sin cerrarlo, y pegar está bloqueado.
- [ ] Sonido real (volumen subido, no en silencio): ding al empezar, tic-tac en los últimos 20 s y alarma en 0:00; el botón de audio lo apaga.
- [ ] Resultados: aparece el chip de nivel, el kit y el espacio de AdSense; en el Sprint, el ranking muestra el nivel.
- [ ] Ranking: nickname, email opcional y mensaje de modo demo (si Supabase no está configurado).
- [ ] Feedback: el enlace del pie abre el formulario; "Enviar" abre tu app de correo y "Copiar reporte" funciona.
- [ ] Girar la tablet (vertical y horizontal) y probar en el celular: sin desplazamiento horizontal.
- [ ] Cambiar de pestaña a mitad de una prueba no deja relojes corriendo.

## Si algo falla
- Pantalla con aviso "Todavía no hay ejercicios": `exercises.js` no cargó (revisar nombre y carpeta).
- Sin sonido en toda la app pero todo lo demás funciona: `audio.js` no cargó o el dispositivo está en silencio.
- Estilos rotos: `style.css` no está junto a `index.html`.
