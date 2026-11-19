
/* =========================================================
   Plume & Chrono · app.js · Iteration 4 (+ Sprint tolerant alignment)
   Load order (index.html): exercises.js -> audio.js -> app.js. This file reads window.PC_BANK and window.PCAudio.
   CONTAINMENT MAP (who owns what)
   - Banks ........ exercises.js (data only) read through Bank / Levels; an empty bank or level shows a notice, never a blank screen
   - Levels ....... Levels service (filter Todos/A1/A2/B1/B2/C1) + #levelBar; each module owns onLevel() and re-picks its own exercise
   - Clock ........ Timers (only creator of intervals/timeouts) + Modules[n] state (TypingSprint.tick)
   - Audio ........ audio.js (PCAudio); here only `Sound`, silent fallback if the file is missing
   - Accent keys .. Accents() shared key bar (selectionStart/End, input event, focus kept, paste blocked)
   - Score ........ TypingSprint.compute (every division guarded, NaN/Infinity -> 0)
   - Storage ...... store (try/catch) + Board (personal top 10) + LB (weekly Top 20, anti-cheat, LocalStore / SupabaseStore)
   - Characters ... one per PRACTICE language (fr mime, en statesman, es chronicler), charSVG(); header one static calm; coach ones next to each clock react (Coach())
   - Tabs ......... showMod(): unmount() the old module, Timers.clearAll(), mount() the new one
   - Module II ... Modules[2] (Improv): own phases, clock, coach mime, scenario + 2 connectors of the scenario's level
   - Module III .. Modules[3] (Reading): own text/answers, 3-minute clock, coach mime, correction
   - Results ...... Results service (payload from each module, level tag, kit card, #adSlot)
   - Feedback ..... Feedback module (footer #fbBox, mailto / SITE.feedbackEndpoint, no timers)
   ========================================================= */

(function () {
'use strict';

/* ---------- safe storage ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};

/* =================== I18N =================== */
const I18N = {
  en: {
    board: 'Weekly Leaderboard', tab1: 'Typing Sprint', tab2: 'Improvisation', tab3: 'Speed Reading', soon: 'Soon',
    audioOn: 'Exam Audio: ON', audioOff: 'Exam Audio: OFF', audioShortOn: 'Audio on', audioShortOff: 'Audio off',
    boardShort: 'Ranking', tab1s: 'Sprint', tab2s: 'Improvisation', tab3s: 'Reading', langLabel: 'Interface language', tabsLabel: 'Training modes',
    m1eyebrow: 'Module I · 2 minutes', m1title: 'Typing Sprint & Accents',
    m1intro: 'Copy the French text exactly as written: accents and capitals count; a missing space before ? ! : ; is only a typography notice. The clock starts with your first letter. Paste is disabled.',
    time: 'Time', wpm: 'WPM', acc: 'Accuracy', score: 'Score',
    eAccent: 'Accents', eSpace: 'Notice · space before ? ! : ;', eSpaceQc: 'Space before ? ! : ; optional', eOther: 'Other',
    m1formulaNote: 'Accuracy weighs more than speed.',
    qcLabel: 'Quebec typography', qcHint: 'Quebec typography: the space before ? ! : ; is optional. Tap to switch.', qcOffHint: 'France typography: a missing space before ? ! : ; is only a notice. Tap for Quebec typography.',
    keysLabel: 'French keys', keysHint: 'Inserts at the cursor', fieldLabel: 'Your copy', placeholder: 'Tap here and start typing…',
    start: 'Start', restart: 'Restart', next: 'New text', again: 'Try again', myBests: 'My best scores',
    resultsTitle: 'Sprint result', progress: 'Text done',
    backSprint: 'Back to the Typing Sprint', close: 'Close', copy: 'Copy', copied: 'Copied',
    contact: 'Contact:',
    lvlLabel: 'Level', lvlAll: 'All', lvlC1: 'Advanced', rvLevel: 'Level',
    plangLabel: 'Practice', plangAria: 'Practice language', plangBusy: 'Finish or restart the current run to change the practice language.',
    lvlFallback: (l) => `There are no ${l} exercises in this mode yet. Showing all levels for now.`,
    lvlNoBank: 'No exercises are loaded for this mode yet. Please try another mode or come back soon.',
    lvlBusy: 'Finish or restart the current run to change level.',
    fbOpen: 'Send feedback / suggestion / report a bug', fbIntro: 'Tell us what to improve. Nothing is sent until you press Send.',
    fbType: 'Type', fbTypeSug: 'Suggestion', fbTypeBug: 'Error / Bug', fbTypeOpi: 'Opinion',
    fbCtx: 'Where', fbCtxGen: 'General', fbCtxM1: 'Typing Sprint', fbCtxM2: 'Improvisation', fbCtxM3: 'Speed Reading', fbCtxRes: 'Results',
    fbMsg: 'Message', fbMsgPh: 'What happened, or what would you like to see?', fbAttach: 'Mode, language and device type are attached.',
    fbEmail: 'Email (optional)', fbEmailPh: 'Only if you want a reply', fbEmailNote: 'Used only to answer you. Never required.',
    fbSend: 'Send', fbCopy: 'Copy report', fbClose: 'Close',
    fbErrEmpty: 'Write a short message first (at least 5 characters).', fbErrEmail: 'That email does not look right. Fix it or leave it empty.',
    fbErrWait: 'Please wait a few seconds before sending again.', fbErrNet: 'We could not send it. Use Copy report and email it to us.',
    fbOkMail: 'Your email app should open with the report ready. If it did not, use Copy report.', fbOkCopy: 'Report copied. You can paste it in an email.',
    fbOkSent: 'Thank you! Your message was sent.', fbManual: 'Select the text below and copy it.',
    legal: 'Plume & Chrono is an independent training tool. It is not affiliated with or endorsed by CCIP (Paris Île-de-France Chamber of Commerce), France Éducation international or IRCC. Scores are indicative only and do not predict official exam results.',
    words: 'words',
    rvEyebrow: 'Results',
    rvReason: { time: 'Time is up.', complete: 'You finished the whole text.', manual: 'Submitted before the clock ended.' },
    rvFormula: (w, a, s) => `${w} WPM × (${a} / 100)² = ${s}`,
    rvAccNote: 'Accuracy = correct characters ÷ (correct characters + errors). Missing accents count as errors. A missing space before ? ! : ; is shown as a typography notice and does not lower accuracy.',
    rvAccNoteQc: 'Accuracy = correct characters ÷ (correct characters + errors). Missing accents count as errors. Quebec typography is on: the space before ? ! : ; is optional and never marked.',
    rvScoreExplain: 'How it works: your speed (WPM) is multiplied by your accuracy squared, so accuracy weighs more than speed. Slowing down a little and getting more right usually scores higher.',
    rvPracticeNote: 'This score is a practice indicator inside Plume & Chrono. It does not predict or equal the grade of an official exam.',
    rvNo_acc: (a) => `Accuracy ${a}%: the weekly ranking needs at least ${LB.MIN_ACC}% accuracy. This run is saved in your best scores, but not in the ranking.`,
    rvZero: 'Nothing was typed this time, so there is no score.',
    rvNew: 'New exercise', rvSwitch: 'Switch mode',
    rvDetail: 'correction', rvYours: 'Your answer', rvRight: 'Right answer', rvNoAns: 'No answer',
    rvNo_empty: 'Nothing typed, so this run is not ranked.',
    rvNo_speed: 'Over 130 WPM looks automated, so this run is discarded and not ranked.',
    rvNo_short: 'Runs under 30 seconds or 60 characters do not count for the ranking.',
    rvNo_suspect: 'This run included a very large single input, so it is not ranked.',
    lbEyebrow: 'Weekly Top 20', lbSample: 'example', lbLevelPick: 'Ranking level', lbEmptyLvl: 'No scores at this level yet this week.',
    lbNoPrize: 'Practice ranking: there are no prizes for now. Rows tagged “example” are samples, not real people.', lbLocal: 'For now your scores are saved only on this device.',
    lbRulesMin: (a) => `To enter the ranking: at least ${a}% accuracy, 30 seconds and 60 characters. Each level has its own ranking.`, lbYou: 'you', lbNick: 'Nickname',
    lbReset: (d, h) => `Resets Monday 00:00 Eastern Time · in ${d} d ${h} h`,
    lbPrize1: '#1 of the week receives the Plume Writing Kit for free.',
    lbPrize10: '#2 to #10 receive a 30% discount code.',
    lbDemo: 'Demo mode: sample entries are shown and prizes activate when the live ranking is connected. Your email stays on this device.',
    lbSeeAll: 'See the full Top 20',
    lbQualify10: (k) => `You are #${k} this week: Top 10!`, lbQualify20: (k) => `You are #${k} this week: you can publish your score.`,
    lbOut: 'Not in the weekly Top 20 yet. Keep practising.',
    lbNickLabel: 'Public nickname', lbNickHint: '3 to 16 characters: letters, numbers, spaces, . _ -',
    lbEmailLabel: 'Email (optional, private)', lbEmailHint: 'Only used to send the #1 prize or a 30% coupon for #2 to #10. It is never shown publicly.',
    lbSubmit: 'Publish my score', lbDone: (k) => `Published! You are #${k} this week.`,
    lbErr: { acc: 'This run cannot enter the ranking.', 'nick-len': 'The nickname needs 3 to 16 characters.', 'nick-chars': 'Use only letters, numbers, spaces and . _ -', 'nick-bad': 'Please choose another nickname.',
             email: 'That email does not look right.', speed: 'This run cannot be ranked.', short: 'This run cannot be ranked.', suspect: 'This run cannot be ranked.', empty: 'This run cannot be ranked.', other: 'Something went wrong. Try again.' },
    kitEyebrow: 'Writing kit · Life and Gently', kitTitle: 'Plume Writing Kit',
    kitText: 'A calm, step-by-step method to write better in French: put your ideas in order, link your sentences with meaning and develop a topic clearly. Useful at work and when preparing an exam. It does not promise any official score.',
    kitShort: 'Write more clearly in French: order your ideas, link your sentences and develop a topic.',
    kitLead: 'To keep building on what you just wrote:',
    kitPoints: ['Put your ideas in order before you write', 'Link sentences with connectors that make sense', 'Develop a topic in clear, well-built paragraphs'],
    kitCta: 'See the Plume Writing Kit', kitPrep: 'In preparation', kitPrepNote: 'The link will appear here when the kit is ready.', kitFine: 'PDF for tablet and print',
    adLabel: 'Advertisement', adReserved: 'Space reserved for Google AdSense',
    boardBusy: 'Finish or stop the exercise to open the ranking.',
    m2eyebrow: 'Module II · 60 s + 4 min', m2title: 'Improvisation',
    m2intro: 'Read the exam situation and jot down three key ideas in 60 seconds. Then your notes lock and you have 4 minutes to write the introduction and first argument, using both required connectors.',
    m2preNote: 'The situation and your two connectors appear when you start.',
    m2start: 'Start planning', m2skip: 'Go to writing now', m2finish: 'Finish',
    m2phasePlan: 'Planning · 60 s', m2phaseWrite: 'Writing · 4 min', m2phaseDone: 'Done',
    m2phasePlanShort: 'Planning', m2phaseWriteShort: 'Writing',
    m2scenarioLabel: 'Situation', m2connLabel: 'Required connectors (use both)',
    m2notesLabel: 'Quick notes: 3 key ideas', m2notesLocked: 'Your notes (locked)',
    m2notesPh: '1. …   2. …   3. …', m2editorLabel: 'Introduction and first argument', m2editorPh: 'Start writing here…',
    m2resWords: 'Words', m2resConn: 'Connectors', m2resReact: 'Reaction time', m2resTime: 'Writing time',
    m2used: 'used', m2missing: 'missing', m2noAccent: 'accent missing', m2next: 'New situation',
    m2goalMet: 'Word goal reached', m2goalShort: (n) => `${n} words short of the goal`,
    m2draftLabel: 'Your text', m2draftEmpty: 'You did not write anything this time.',
    m2copy: 'Copy text', m2copied: 'Copied', m2copyFail: 'Copying is blocked here: the text is now selected, copy it from your device menu.',
    m2legend: 'Highlighted: connectors you used. Dotted underline: worth a second look.',
    m2reviewLabel: 'Feedback', m2reviewNone: 'No remarks on accents, capitals or connectors. Well done!',
    m2obsConn: (pairs) => `Check the accent in the connector: ${pairs}.`,
    m2obsConnOk: (list) => `Good use of ${list} in your text.`,
    m2obsAccent: (pairs) => `Common words missing their accent: ${pairs}.`,
    m2obsCap: (pairs) => `A new sentence starts with a capital letter: ${pairs}.`,
    m2obsCtx: (list) => `${list} counts as a connector only at the start of a sentence, after a comma or right after “et”.`,
    m2exLabel: 'Example', m2exHint: 'Tap to see a one-line example',
    m2reactNote: (s) => `Time to first key: ${s} s. Just for reference: thinking first beats starting fast.`,
    say2: {
      ready: 'Pick your moment. The situation and your connectors appear when you start.',
      plan: 'Sketch three ideas. The notes lock at 0:00.',
      locked: 'Notes locked. Now write.',
      write: 'Writing time. Introduction first, then your first argument.',
      critical: 'Last 20 seconds! Wrap up your sentence.',
      found: 'Connector spotted. Nice.',
      paste: 'No copy and paste here. Type it.',
      timeup: 'Time! The page is locked.',
      win: 'Goal reached with both connectors. Excellent!',
      close: 'Good draft. Check the goal and the connectors below.',
      empty: 'Nothing written this time. Try again?'
    },
    m3eyebrow: 'Module III · 3 minutes', m3title: 'Speed Reading',
    m3intro: 'Read the French text and answer three multiple-choice questions before the clock runs out. Text and questions appear when you start.',
    m3preNote: '3 questions · strict 3-minute clock',
    m3start: 'Start reading', m3submit: 'Submit answers', m3answered: (n) => `${n}/3 answered`, m3again: 'Read another text', m3againSame: 'Try again (options reshuffled)',
    m3resScore: 'Correct answers', m3resTime: 'Time used', m3resBlank: 'Unanswered',
    say3: {
      ready: 'Take a breath. Text and questions appear when you start.',
      read: 'Read first, then tap your answers.',
      critical: 'Last 20 seconds! Tap your answers.',
      timeup: 'Time! Your answers were submitted.',
      win: 'Excellent reading. Well done!',
      low: 'Tough one. Read the corrections and try another text.'
    },
    say: {
      ready: 'Ready when you are. Tap the box and type: the clock starts on your first letter.',
      typing: 'Steady ink. Watch the accents.',
      critical: 'Last 20 seconds! Keep going.',
      paste: 'No copy and paste here. Type it, it is the whole point.',
      accent: 'An accent is missing there. Try the French keys below.',
      space: 'French needs a space before ? ! : and ;',
      timeup: 'Time! The page is locked.',
      done: 'Text finished before the bell. Bravo.',
      victory: 'Into your personal top 10. Excellent!',
      record: 'New personal record! Excellent!',
      flagged: 'Over 130 WPM looks automated, so this run is not saved.',
      plain: 'Good effort. Another round?',
      empty: 'Nothing typed this time. Shall we try again?'
    },
    noteTop: (rank) => `This run is #${rank} in your best scores on this device.`,
    noteOut: 'Not in your top 10 yet. Accents are what raise accuracy fastest.',
    flagMsg: 'Speed above 130 WPM. Scores this fast are discarded by the anti-cheat rule.',
    formula: (w, a) => `${w} WPM × (${a} / 100)²`,
    emptyBoard: 'No runs saved yet. Finish a sprint to see it here.',
    thRank: '#', thScore: 'Score', thWpm: 'WPM', thAcc: 'Acc.', thDate: 'Date',
    boardEyebrow: 'Weekly Top 20',
    boardSoon: 'The public weekly leaderboard arrives in Iteration 3. For now, these are your best scores saved on this device.',
    rulesTitle: 'Leaderboard rules',
    rules: [
      'Weekly Top 20 for each level (A1 to Advanced), reset every Monday at 00:00 Eastern Time. No sign-up needed. Only the Typing Sprint is ranked.',
      'To enter the ranking a run needs at least 90% accuracy, 30 seconds and 60 characters.',
      'For now this is a practice ranking with no prizes. Rows tagged “example” are samples, not real people.',
      'Paste is blocked in every exercise box. Runs above 130 WPM or with a very large single input are discarded.'
    ],
    soonEyebrow2: 'Module II · coming in Iteration 2', soonTitle2: 'Improvisation',
    soonText2: '60 seconds to plan three ideas, then 4 minutes to write an introduction using two French connectors drawn at random.',
    soonEyebrow3: 'Module III · coming in Iteration 2', soonTitle3: 'Speed Reading',
    soonText3: 'A French text beside three multiple-choice questions, against a strict 3-minute clock.'
  },
  es: {
    board: 'Ranking semanal', tab1: 'Sprint de tipeo', tab2: 'Improvisación', tab3: 'Lectura exprés', soon: 'Pronto',
    audioOn: 'Audio de examen: activado', audioOff: 'Audio de examen: desactivado', audioShortOn: 'Audio: sí', audioShortOff: 'Audio: no',
    boardShort: 'Ranking', tab1s: 'Sprint', tab2s: 'Improvisación', tab3s: 'Lectura', langLabel: 'Idioma de la interfaz', tabsLabel: 'Modos de práctica',
    m1eyebrow: 'Módulo I · 2 minutos', m1title: 'Sprint de tipeo y acentos',
    m1intro: 'Copia el texto en francés tal cual: cuentan las tildes y las mayúsculas; si falta el espacio antes de ? ! : ; solo se muestra un aviso tipográfico. El reloj empieza con tu primera letra. La función de pegar está desactivada.',
    time: 'Tiempo', wpm: 'PPM', acc: 'Precisión', score: 'Puntaje',
    eAccent: 'Tildes', eSpace: 'Aviso · espacio antes de ? ! : ;', eSpaceQc: 'Espacio antes de ? ! : ; opcional', eOther: 'Otros',
    m1formulaNote: 'La precisión pesa más que la velocidad.',
    qcLabel: 'Tipografía de Quebec', qcHint: 'Tipografía de Quebec: el espacio antes de ? ! : ; es opcional. Toca para cambiar.', qcOffHint: 'Tipografía de Francia: si falta el espacio antes de ? ! : ; solo se muestra un aviso. Toca para usar la tipografía de Quebec.',
    keysLabel: 'Teclas francesas', keysHint: 'Se insertan en el cursor', fieldLabel: 'Tu copia', placeholder: 'Toca aquí y empieza a escribir…',
    start: 'Empezar', restart: 'Reiniciar', next: 'Otro texto', again: 'Intentar de nuevo', myBests: 'Mis mejores puntajes',
    resultsTitle: 'Resultado del sprint', progress: 'Texto completado',
    backSprint: 'Volver al Sprint de tipeo', close: 'Cerrar', copy: 'Copiar', copied: 'Copiado',
    contact: 'Contacto:',
    lvlLabel: 'Nivel', lvlAll: 'Todos', lvlC1: 'Avanzado', rvLevel: 'Nivel',
    plangLabel: 'Practicar', plangAria: 'Idioma de práctica', plangBusy: 'Termina o reinicia la prueba actual para cambiar el idioma de práctica.',
    lvlFallback: (l) => `Todavía no hay ejercicios de nivel ${l} en este modo. Mientras tanto, te mostramos todos los niveles.`,
    lvlNoBank: 'Todavía no hay ejercicios cargados para este modo. Prueba otro modo o vuelve pronto.',
    lvlBusy: 'Termina o reinicia la prueba actual para cambiar de nivel.',
    fbOpen: 'Enviar comentarios o sugerencias, o reportar un error', fbIntro: 'Cuéntanos qué mejorar. No se envía nada hasta que toques Enviar.',
    fbType: 'Tipo', fbTypeSug: 'Sugerencia', fbTypeBug: 'Error técnico', fbTypeOpi: 'Opinión',
    fbCtx: 'Dónde', fbCtxGen: 'General', fbCtxM1: 'Sprint de tipeo', fbCtxM2: 'Improvisación', fbCtxM3: 'Lectura exprés', fbCtxRes: 'Resultados',
    fbMsg: 'Mensaje', fbMsgPh: '¿Qué pasó, o qué te gustaría ver?', fbAttach: 'Se adjuntan modo, idioma y tipo de dispositivo.',
    fbEmail: 'Email (opcional)', fbEmailPh: 'Solo si quieres respuesta', fbEmailNote: 'Se usa solo para responderte. Nunca es obligatorio.',
    fbSend: 'Enviar', fbCopy: 'Copiar reporte', fbClose: 'Cerrar',
    fbErrEmpty: 'Primero escribe un mensaje breve (mínimo 5 caracteres).', fbErrEmail: 'Ese email no parece correcto. Corrígelo o déjalo vacío.',
    fbErrWait: 'Espera unos segundos antes de enviar de nuevo.', fbErrNet: 'No pudimos enviarlo. Usa Copiar reporte y envíanoslo por email.',
    fbOkMail: 'Se debería abrir tu app de correo con el reporte listo. Si no se abrió, usa Copiar reporte.', fbOkCopy: 'Reporte copiado. Puedes pegarlo en un email.',
    fbOkSent: '¡Gracias! Tu mensaje fue enviado.', fbManual: 'Selecciona el texto de abajo y cópialo.',
    legal: 'Plume & Chrono es una herramienta de entrenamiento independiente. No está afiliada ni avalada por la CCIP (Cámara de Comercio de París Île-de-France), France Éducation international ni IRCC. Los puntajes son orientativos y no predicen resultados de exámenes oficiales.',
    words: 'palabras',
    rvEyebrow: 'Resultados',
    rvReason: { time: 'Se acabó el tiempo.', complete: 'Terminaste todo el texto.', manual: 'Enviado antes de que terminara el reloj.' },
    rvFormula: (w, a, s) => `${w} PPM × (${a} / 100)² = ${s}`,
    rvAccNote: 'Precisión = caracteres correctos ÷ (caracteres correctos + errores). Las tildes que faltan cuentan como error. Si falta el espacio antes de ? ! : ; se muestra un aviso tipográfico que no baja la precisión.',
    rvAccNoteQc: 'Precisión = caracteres correctos ÷ (caracteres correctos + errores). Las tildes que faltan cuentan como error. La tipografía de Quebec está activada: el espacio antes de ? ! : ; es opcional y no se marca.',
    rvScoreExplain: 'Cómo se calcula: la velocidad (PPM) se multiplica por la precisión al cuadrado, así que la precisión pesa más que la velocidad. Ir un poco más despacio y acertar más suele dar un puntaje mejor.',
    rvPracticeNote: 'Este puntaje es un indicador de práctica dentro de Plume & Chrono. No predice ni equivale a la calificación de un examen oficial.',
    rvNo_acc: (a) => `Precisión ${a} %: el ranking semanal pide al menos ${LB.MIN_ACC} % de precisión. Este intento queda en tus mejores puntajes, pero no entra al ranking.`,
    rvZero: 'No escribiste nada esta vez, así que no hay puntaje.',
    rvNew: 'Otro ejercicio', rvSwitch: 'Cambiar de modo',
    rvDetail: 'corrección', rvYours: 'Tu respuesta', rvRight: 'Respuesta correcta', rvNoAns: 'Sin respuesta',
    rvNo_empty: 'No escribiste nada, así que este intento no entra al ranking.',
    rvNo_speed: 'Más de 130 PPM parece automático: este intento se descarta y no entra al ranking.',
    rvNo_short: 'Los intentos de menos de 30 segundos o 60 caracteres no cuentan para el ranking.',
    rvNo_suspect: 'Este intento tuvo una entrada muy grande de una sola vez, así que no entra al ranking.',
    lbEyebrow: 'Top 20 semanal', lbSample: 'ejemplo', lbLevelPick: 'Nivel del ranking', lbEmptyLvl: 'Todavía no hay puntajes en este nivel esta semana.',
    lbNoPrize: 'Ranking de práctica: por ahora no hay premios. Las filas marcadas «ejemplo» son de muestra y no son personas reales.', lbLocal: 'Por ahora tus puntajes se guardan solo en este dispositivo.',
    lbRulesMin: (a) => `Para entrar al ranking: al menos ${a} % de precisión, 30 segundos y 60 caracteres. Cada nivel tiene su propio ranking.`, lbYou: 'tú', lbNick: 'Apodo',
    lbReset: (d, h) => `Se reinicia el lunes a las 00:00 hora del Este · en ${d} d ${h} h`,
    lbPrize1: 'El puesto #1 de la semana recibe gratis el Plume Writing Kit.',
    lbPrize10: 'Del #2 al #10 reciben un código de descuento del 30%.',
    lbDemo: 'Modo demo: se muestran entradas de muestra y los premios se activan cuando se conecte el ranking en vivo. Tu email queda en este dispositivo.',
    lbSeeAll: 'Ver el Top 20 completo',
    lbQualify10: (k) => `Estás en el puesto #${k} de la semana: ¡Top 10!`, lbQualify20: (k) => `Estás en el puesto #${k} de la semana: puedes publicar tu puntaje.`,
    lbOut: 'Todavía no entras al Top 20 semanal de este nivel. Sigue practicando.',
    lbNickLabel: 'Apodo público', lbNickHint: 'De 3 a 16 caracteres: letras, números, espacios, . _ -',
    lbEmailLabel: 'Email (opcional, privado)', lbEmailHint: 'Solo se usa para enviarte el premio del #1 o un cupón del 30% del #2 al #10. Nunca se muestra en público.',
    lbSubmit: 'Publicar mi puntaje', lbDone: (k) => `¡Publicado! Estás en el puesto #${k} de la semana.`,
    lbErr: { acc: 'Este intento no puede entrar al ranking.', 'nick-len': 'El apodo necesita entre 3 y 16 caracteres.', 'nick-chars': 'Usa solo letras, números, espacios y . _ -', 'nick-bad': 'Elige otro apodo, por favor.',
             email: 'Ese email no parece correcto.', speed: 'Este intento no puede entrar al ranking.', short: 'Este intento no puede entrar al ranking.', suspect: 'Este intento no puede entrar al ranking.', empty: 'Este intento no puede entrar al ranking.', other: 'Algo salió mal. Inténtalo de nuevo.' },
    kitEyebrow: 'Kit de escritura · Life and Gently', kitTitle: 'Plume Writing Kit',
    kitText: 'Un método sereno y paso a paso para escribir mejor en francés: ordenar tus ideas, conectar las frases con sentido y desarrollar un tema con claridad. Sirve para el trabajo y para preparar un examen. No promete ninguna calificación oficial.',
    kitShort: 'Escribe con más claridad en francés: ordena tus ideas, conecta tus frases y desarrolla un tema.',
    kitLead: 'Para seguir trabajando sobre lo que acabas de escribir:',
    kitPoints: ['Ordenar tus ideas antes de escribir', 'Conectar frases con conectores que tengan sentido', 'Desarrollar un tema en párrafos claros y bien armados'],
    kitCta: 'Ver el Plume Writing Kit', kitPrep: 'En preparación', kitPrepNote: 'El enlace aparecerá aquí cuando el kit esté listo.', kitFine: 'PDF para tablet e impresión',
    adLabel: 'Publicidad', adReserved: 'Espacio reservado para Google AdSense',
    boardBusy: 'Termina o detén el ejercicio para abrir el ranking.',
    m2eyebrow: 'Módulo II · 60 s + 4 min', m2title: 'Improvisación',
    m2intro: 'Lee la situación de examen y anota tres ideas clave en 60 segundos. Después las notas se bloquean y tienes 4 minutos para escribir la introducción y el primer argumento con los dos conectores obligatorios.',
    m2preNote: 'La situación y tus dos conectores aparecen cuando empiezas.',
    m2start: 'Empezar planificación', m2skip: 'Pasar a redactar ya', m2finish: 'Terminar',
    m2phasePlan: 'Planificación · 60 s', m2phaseWrite: 'Redacción · 4 min', m2phaseDone: 'Terminado',
    m2phasePlanShort: 'Planificación', m2phaseWriteShort: 'Redacción',
    m2scenarioLabel: 'Situación', m2connLabel: 'Conectores obligatorios (usa los dos)',
    m2notesLabel: 'Bloc rápido: 3 ideas clave', m2notesLocked: 'Tus notas (bloqueadas)',
    m2notesPh: '1. …   2. …   3. …', m2editorLabel: 'Introducción y primer argumento', m2editorPh: 'Empieza a escribir aquí…',
    m2resWords: 'Palabras', m2resConn: 'Conectores', m2resReact: 'Tiempo de reacción', m2resTime: 'Tiempo de redacción',
    m2used: 'usado', m2missing: 'falta', m2noAccent: 'falta la tilde', m2next: 'Otra situación',
    m2goalMet: 'Meta de palabras alcanzada', m2goalShort: (n) => `Faltaron ${n} palabras para la meta`,
    m2draftLabel: 'Tu texto', m2draftEmpty: 'Esta vez no escribiste nada.',
    m2copy: 'Copiar texto', m2copied: 'Copiado', m2copyFail: 'El portapapeles está bloqueado: el texto quedó seleccionado para que lo copies desde el menú del dispositivo.',
    m2legend: 'Resaltado: conectores usados. Subrayado punteado: para revisar.',
    m2reviewLabel: 'Devolución', m2reviewNone: 'Sin observaciones sobre tildes, mayúsculas ni conectores. ¡Bien hecho!',
    m2obsConn: (pairs) => `Revisa la tilde en el conector: ${pairs}.`,
    m2obsConnOk: (list) => `Buen uso de ${list} en tu texto.`,
    m2obsAccent: (pairs) => `Palabras frecuentes sin tilde: ${pairs}.`,
    m2obsCap: (pairs) => `Una oración nueva empieza con mayúscula: ${pairs}.`,
    m2obsCtx: (list) => `${list} cuenta como conector solo al inicio de una oración, después de una coma o justo después de «et».`,
    m2exLabel: 'Ejemplo', m2exHint: 'Toca para ver un ejemplo de una línea',
    m2reactNote: (s) => `Tiempo hasta la primera tecla: ${s} s. Es un dato orientativo: conviene pensar antes que empezar rápido.`,
    say2: {
      ready: 'Cuando quieras. La situación y tus conectores aparecen al empezar.',
      plan: 'Esboza tres ideas. Las notas se bloquean en 0:00.',
      locked: 'Notas bloqueadas. Ahora redacta.',
      write: 'A redactar. Primero la introducción, después tu primer argumento.',
      critical: '¡Últimos 20 segundos! Cierra la frase.',
      found: 'Conector detectado. Muy bien.',
      paste: 'Aquí no se puede pegar texto. Escríbelo.',
      timeup: '¡Tiempo! La hoja quedó bloqueada.',
      win: 'Meta alcanzada con los dos conectores. ¡Excelente!',
      close: 'Buen borrador. Revisa la meta y los conectores abajo.',
      empty: 'No escribiste nada esta vez. ¿Probamos de nuevo?'
    },
    m3eyebrow: 'Módulo III · 3 minutos', m3title: 'Lectura exprés',
    m3intro: 'Lee el texto en francés y responde tres preguntas de opción múltiple antes de que termine el reloj. El texto y las preguntas aparecen al empezar.',
    m3preNote: '3 preguntas · reloj estricto de 3 minutos',
    m3start: 'Empezar a leer', m3submit: 'Enviar respuestas', m3answered: (n) => `${n}/3 respondidas`, m3again: 'Leer otro texto', m3againSame: 'Intentar de nuevo (opciones mezcladas)',
    m3resScore: 'Respuestas correctas', m3resTime: 'Tiempo usado', m3resBlank: 'Sin responder',
    say3: {
      ready: 'Respira hondo. El texto y las preguntas aparecen al empezar.',
      read: 'Primero lee, después toca tus respuestas.',
      critical: '¡Últimos 20 segundos! Toca tus respuestas.',
      timeup: '¡Tiempo! Se enviaron tus respuestas.',
      win: 'Excelente lectura. ¡Muy bien!',
      low: 'Difícil. Revisa las correcciones y prueba otro texto.'
    },
    say: {
      ready: 'Cuando quieras. Toca el cuadro y escribe: el reloj empieza con tu primera letra.',
      typing: 'Pulso firme. Ojo con las tildes.',
      critical: '¡Últimos 20 segundos! Sigue.',
      paste: 'Aquí no se puede pegar texto. Escríbelo: ese es el entrenamiento.',
      accent: 'Ahí falta una tilde. Usa las teclas francesas de abajo.',
      space: 'Aviso: en la tipografía de Francia va un espacio antes de ? ! : y ;',
      timeup: '¡Tiempo! La hoja quedó bloqueada.',
      done: 'Terminaste el texto antes de la campana. Bravo.',
      victory: 'Entraste en tu top 10 personal. ¡Excelente!',
      record: '¡Nuevo récord personal! ¡Excelente!',
      flagged: 'Más de 130 PPM parece automático: este intento no se guarda.',
      plain: 'Buen intento. ¿Otra ronda?',
      empty: 'No escribiste nada esta vez. ¿Probamos de nuevo?'
    },
    noteTop: (rank) => `Este intento es el #${rank} de tus mejores puntajes en este dispositivo.`,
    noteOut: 'Todavía no entra en tu top 10. Las tildes son lo que más sube la precisión.',
    flagMsg: 'Velocidad mayor a 130 PPM. La regla anti-trampas descarta puntajes así de rápidos.',
    formula: (w, a) => `${w} PPM × (${a} / 100)²`,
    emptyBoard: 'Todavía no hay intentos guardados. Termina un sprint para verlo aquí.',
    thRank: '#', thScore: 'Puntaje', thWpm: 'PPM', thAcc: 'Prec.', thDate: 'Fecha',
    boardEyebrow: 'Top 20 semanal',
    boardSoon: 'El ranking semanal público llega en la Iteración 3. Por ahora estos son tus mejores puntajes guardados en este dispositivo.',
    rulesTitle: 'Reglas del ranking',
    rules: [
      'Top 20 semanal para cada nivel (de A1 a Avanzado), que se reinicia cada lunes a las 00:00 hora del Este. No hace falta registrarse. Solo el Sprint de tipeo entra al ranking.',
      'Para entrar al ranking, un intento necesita al menos 90 % de precisión, 30 segundos y 60 caracteres.',
      'Por ahora es un ranking de práctica, sin premios. Las filas marcadas «ejemplo» son de muestra y no son personas reales.',
      'La función de pegar está bloqueada en todos los campos de ejercicio. Se descartan los intentos de más de 130 PPM o con una entrada muy grande de una sola vez.'
    ],
    soonEyebrow2: 'Módulo II · llega en la Iteración 2', soonTitle2: 'Improvisación',
    soonText2: '60 segundos para planear tres ideas y luego 4 minutos para escribir una introducción con dos conectores franceses sorteados.',
    soonEyebrow3: 'Módulo III · llega en la Iteración 2', soonTitle3: 'Lectura exprés',
    soonText3: 'Un texto en francés junto a tres preguntas de opción múltiple, con un reloj estricto de 3 minutos.'
  }
};

/* =================== SERVICES (shared, module-agnostic) =================== */
/* safe(): run anything that must never take the page down (audio, timers, module hooks). */
const safe = (fn, fallback) => { try { return fn(); } catch (e) { try { console.error('[P&C]', e); } catch (_) {} return fallback; } };
/* quiet(): same, but silent. Audio failures are expected on some tablets and must not spam the console. */
const quiet = (fn, fallback) => { try { return fn(); } catch (e) { return fallback; } };
const fin = (x) => (typeof x === 'number' && isFinite(x) ? x : 0);   // NaN / Infinity -> 0

/* Timers: the ONLY place that creates intervals/timeouts. Each module registers through here,
   and a tab change or a finished test calls clearAll()/stop(), so no ghost clocks survive. */
const Timers = {
  _i: new Set(), _t: new Set(),
  every(fn, ms) { const id = setInterval(() => safe(fn), ms); this._i.add(id); return id; },
  after(fn, ms) { const id = setTimeout(() => { this._t.delete(id); safe(fn); }, ms); this._t.add(id); return id; },
  stop(id) { clearInterval(id); clearTimeout(id); this._i.delete(id); this._t.delete(id); },
  clearAll() { this._i.forEach(clearInterval); this._t.forEach(clearTimeout); this._i.clear(); this._t.clear(); },
  get active() { return this._i.size + this._t.size; }
};

/* =================== AUDIO (implemented in audio.js, exposed as window.PCAudio) =================== */
/* If audio.js fails to load the app keeps working, silently. */
const Sound = window.PCAudio || { enabled: false, unlock() {}, ding() {}, tick() {}, alarm() {}, soft() {} };

/* ---- shared UI helpers for the modules (no module state lives here) ---- */
const NOASSIST = 'autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" inputmode="text" writingsuggestions="false" data-gramm="false" data-gramm_editor="false" data-enable-grammarly="false"';
const fmtClock = (sec) => { const s = Math.max(0, Math.ceil(fin(sec))); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

/* =================== PRACTICE-LANGUAGE SHEETS (one sheet per language being PRACTISED) ===================
   Everything that depends on the practice language (PC_BANK.active, today 'fr') lives here, never on the interface
   language (pc_lang = EN | ES, which only changes UI texts). The fr sheet holds the exact values used before, so scores,
   accuracy marks, Improv feedback and reading behave identically. en and es are prepared skeletons (ready: false):
   they only take effect when exercises.js activates them with their own bank.
   Safety: an unknown or alias code ('fr-CA', 'fra', 'French'…) resolves to its sheet, else to fr; a missing or
   malformed field falls back to a neutral default of the right type (never throws). */
const PRACTICE_SHEETS = {
  fr: {
    ready: true,
    htmlLang: 'fr',                        // lang attribute of the French text, prompts, editors and options
    char: 'fr',                            // character in the header and next to the clocks: the mime
    name: { en: 'French', es: 'Francés' },
    keys: ['é','è','ê','ë','à','â','ç','ù','û','ô','î','œ','«','»'],                      // touch key bar
    upper: { 'é':'É','è':'È','ê':'Ê','ë':'Ë','à':'À','â':'Â','ç':'Ç','ù':'Ù','û':'Û','ô':'Ô','î':'Î','œ':'Œ' },   // shift on the key bar
    base: { 'é':'e','è':'e','ê':'e','ë':'e','à':'a','â':'a','ç':'c','ù':'u','û':'u','ô':'o','î':'i','ï':'i','œ':'o',
            'É':'E','È':'E','Ê':'E','À':'A','Â':'A','Ç':'C','Ô':'O','Î':'I','Û':'U','Ù':'U','Œ':'O' },   // Sprint: "missing accent" = typed the base letter
    doublePunct: '?!:;',                   // Sprint: the space before these is a typography notice
    regionalTypo: 'qc',                    // Sprint: Quebec typography toggle (space before ? ! : ; optional)
    apos: false,                           // Sprint: true = ' and ’ count as the same character (fr keeps the strict comparison)
    andWords: ['et'],                      // Improv: « et » + ambiguous connector still counts as a connector position
    noQue: ['alors', 'ainsi'],             // Improv: « alors que » / « ainsi que » is never the connector
    srcAria: 'Texte à recopier',
    ambiguous: ['aussi', 'puis', 'alors', 'ainsi', 'enfin'],   // Improv: connectors that count only in a connector position
    accentWords: { etre: 'être', tres: 'très', deja: 'déjà', apres: 'après', voila: 'voilà', ete: 'été', meme: 'même', memes: 'mêmes',
                                         probleme: 'problème', problemes: 'problèmes', premiere: 'première', derniere: 'dernière', interessant: 'intéressant', interessante: 'intéressante',
                                         ecole: 'école', etudiant: 'étudiant', etudiante: 'étudiante', etudiants: 'étudiants', etudes: 'études', societe: 'société', securite: 'sécurité',
                                         sante: 'santé', qualite: 'qualité', possibilite: 'possibilité', activite: 'activité', activites: 'activités', verite: 'vérité', liberte: 'liberté',
                                         necessaire: 'nécessaire', economique: 'économique', ecrire: 'écrire', idee: 'idée', idees: 'idées', telephone: 'téléphone', systeme: 'système',
                                         reponse: 'réponse', repondre: 'répondre', decision: 'décision', developpement: 'développement', general: 'général', generalement: 'généralement',
                                         egalement: 'également', evidemment: 'évidemment', reussir: 'réussir', reussite: 'réussite', reflechir: 'réfléchir', francais: 'français',
                                         francaise: 'française', garcon: 'garçon', lecon: 'leçon', ca: 'ça', plutot: 'plutôt', bientot: 'bientôt', cout: 'coût', gout: 'goût',
                                         fete: 'fête', tete: 'tête', fenetre: 'fenêtre', hopital: 'hôpital', hotel: 'hôtel', theatre: 'théâtre', cafe: 'café', experience: 'expérience',
                                         difficulte: 'difficulté', difficultes: 'difficultés', realite: 'réalité', medecin: 'médecin', numero: 'numéro', energie: 'énergie',
                                         enorme: 'énorme', epoque: 'époque', etat: 'état', etranger: 'étranger', etrangers: 'étrangers', evenement: 'événement', reunion: 'réunion',
                                         region: 'région', annee: 'année', annees: 'années', journee: 'journée', soiree: 'soirée', mere: 'mère', pere: 'père', frere: 'frère',
                                         regle: 'règle', regles: 'règles', deuxieme: 'deuxième', troisieme: 'troisième', bibliotheque: 'bibliothèque', ecologique: 'écologique',
                                         electrique: 'électrique', tele: 'télé', television: 'télévision', desole: 'désolé', desolee: 'désolée', peut_etre: 'peut-être', voisinage: null }                   // Improv feedback: frequent words written without their accent
  },
  en: {
    ready: true, htmlLang: 'en-CA', char: 'en', name: { en: 'English', es: 'Inglés' },   // Canadian English
    keys: [], upper: {}, base: {},                    // no special-key bar: the English text has no accents
    doublePunct: '', regionalTypo: null,              // no French spacing before ? ! : ; and no Quebec toggle
    apos: true,                                       // ' and ’ are the same apostrophe
    andWords: ['and'], noQue: [],
    srcAria: 'Text to copy',
    ambiguous: ['also', 'then', 'so', 'still', 'yet', 'thus'],   // only count as connectors at the start of a sentence, after , ; : or after « and »
    accentWords: {},
    ui: {                                             // only wording that names the practice language (existing keys only)
      en: { m1intro: 'Copy the English text exactly as written: capitals and punctuation count, and a curly ’ or a straight \' is the same apostrophe. The clock starts with your first letter. Paste is disabled.',
            m3intro: 'Read the English text and answer three multiple-choice questions before the clock runs out. Text and questions appear when you start.',
            keysLabel: 'Special keys',
            soonText2: '60 seconds to plan three ideas, then 4 minutes to write an introduction using two English connectors drawn at random.',
            soonText3: 'An English text beside three multiple-choice questions, against a strict 3-minute clock.' },
      es: { m1intro: 'Copia el texto en inglés tal cual: cuentan las mayúsculas y la puntuación, y el apóstrofo curvo ’ y el recto \' se consideran el mismo. El reloj empieza con tu primera letra. La función de pegar está desactivada.',
            m3intro: 'Lee el texto en inglés y responde tres preguntas de opción múltiple antes de que termine el reloj. El texto y las preguntas aparecen al empezar.',
            keysLabel: 'Teclas especiales',
            soonText2: '60 segundos para planear tres ideas y luego 4 minutos para escribir una introducción con dos conectores en inglés sorteados.',
            soonText3: 'Un texto en inglés junto a tres preguntas de opción múltiple, con un reloj estricto de 3 minutos.' }
    }
  },
  es: {
    ready: true, htmlLang: 'es', char: 'es', name: { en: 'Spanish', es: 'Español' },   // neutral Spanish
    keys: ['á','é','í','ó','ú','ü','ñ','¿','¡'],
    upper: { 'á':'Á','é':'É','í':'Í','ó':'Ó','ú':'Ú','ü':'Ü','ñ':'Ñ' },
    base: { 'á':'a','é':'e','í':'i','ó':'o','ú':'u','ü':'u','ñ':'n','Á':'A','É':'E','Í':'I','Ó':'O','Ú':'U','Ü':'U','Ñ':'N' },
    doublePunct: '', regionalTypo: null,              // no space before ? ! : ; in Spanish
    apos: false, andWords: ['y', 'e'], noQue: [],
    srcAria: 'Texto para copiar',
    ambiguous: ['así', 'entonces', 'luego', 'pues', 'también'],
    accentWords: { tambien: 'también', ademas: 'además', aqui: 'aquí', alli: 'allí', ahi: 'ahí', asi: 'así', despues: 'después', proximo: 'próximo', proxima: 'próxima',
                   telefono: 'teléfono', musica: 'música', tecnico: 'técnico', facil: 'fácil', dificil: 'difícil', util: 'útil', rapido: 'rápido', pais: 'país', paises: 'países',
                   dia: 'día', dias: 'días', cafe: 'café', informacion: 'información', educacion: 'educación', situacion: 'situación', comunicacion: 'comunicación',
                   decision: 'decisión', opinion: 'opinión', razon: 'razón', corazon: 'corazón', solucion: 'solución', atencion: 'atención', direccion: 'dirección',
                   relacion: 'relación', organizacion: 'organización', economia: 'economía', energia: 'energía', tecnologia: 'tecnología', biologia: 'biología',
                   ingles: 'inglés', frances: 'francés', sabado: 'sábado', miercoles: 'miércoles', quizas: 'quizás', jamas: 'jamás', adios: 'adiós', detras: 'detrás',
                   exito: 'éxito', rapidamente: 'rápidamente', facilmente: 'fácilmente' },   // only words whose unaccented spelling is not itself a Spanish word
    ui: {
      en: { m1intro: 'Copy the Spanish text exactly as written: accents (á é í ó ú ü ñ) and capitals count, and ¿ ¡ are part of the text. The clock starts with your first letter. Paste is disabled.',
            m3intro: 'Read the Spanish text and answer three multiple-choice questions before the clock runs out. Text and questions appear when you start.',
            keysLabel: 'Spanish keys',
            soonText2: '60 seconds to plan three ideas, then 4 minutes to write an introduction using two Spanish connectors drawn at random.',
            soonText3: 'A Spanish text beside three multiple-choice questions, against a strict 3-minute clock.',
            say: { accent: 'An accent is missing there. Try the Spanish keys below.' } },
      es: { m1intro: 'Copia el texto en español tal cual: cuentan las tildes (á é í ó ú ü ñ) y las mayúsculas, y ¿ ¡ forman parte del texto. El reloj empieza con tu primera letra. La función de pegar está desactivada.',
            m3intro: 'Lee el texto en español y responde tres preguntas de opción múltiple antes de que termine el reloj. El texto y las preguntas aparecen al empezar.',
            keysLabel: 'Teclas del español',
            soonText2: '60 segundos para planear tres ideas y luego 4 minutos para escribir una introducción con dos conectores en español sorteados.',
            soonText3: 'Un texto en español junto a tres preguntas de opción múltiple, con un reloj estricto de 3 minutos.',
            say: { accent: 'Ahí falta una tilde. Usa las teclas del español de abajo.' } }
    }
  }
};
const PRACTICE_ALIASES = { fra: 'fr', fre: 'fr', french: 'fr', francais: 'fr', 'français': 'fr', eng: 'en', english: 'en', ingles: 'en', 'inglés': 'en', spa: 'es', spanish: 'es', espanol: 'es', 'español': 'es' };
function practiceCode(v) {                 // 'fr', 'FR', 'fr-CA', 'fra', 'French' -> 'fr'; anything unknown -> 'fr'
  const k = String(v == null ? '' : v).trim().toLowerCase();
  if (PRACTICE_SHEETS[k]) return k;
  const head = k.split(/[-_]/)[0], a = PRACTICE_SHEETS[head] ? head : (PRACTICE_ALIASES[k] || PRACTICE_ALIASES[head]);
  return a && PRACTICE_SHEETS[a] ? a : 'fr';
}
function practiceSheet(v) {
  const code = practiceCode(v), s = PRACTICE_SHEETS[code] || {};
  const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
  const pick = (k, ok, d) => { try { return ok(s[k]) ? s[k] : d; } catch (e) { return d; } };
  return Object.freeze({
    code, ready: s.ready === true,
    htmlLang: pick('htmlLang', (x) => typeof x === 'string' && x.length > 0, code),
    char: pick('char', (x) => typeof x === 'string' && x.length > 0, code),
    name: pick('name', isObj, {}),
    keys: pick('keys', (x) => Array.isArray(x) && x.every(c => typeof c === 'string'), []),
    upper: pick('upper', isObj, {}),
    base: pick('base', isObj, {}),
    doublePunct: pick('doublePunct', (x) => typeof x === 'string', ''),
    regionalTypo: pick('regionalTypo', (x) => x === null || typeof x === 'string', null),
    ambiguous: pick('ambiguous', (x) => Array.isArray(x), []),
    accentWords: pick('accentWords', isObj, {}),
    apos: pick('apos', (x) => typeof x === 'boolean', false),
    andWords: pick('andWords', (x) => Array.isArray(x) && x.every(w => typeof w === 'string'), []),
    noQue: pick('noQue', (x) => Array.isArray(x) && x.every(w => typeof w === 'string'), []),
    srcAria: pick('srcAria', (x) => typeof x === 'string', ''),
    ui: pick('ui', isObj, {})
  });
}
/* Practice language chosen with the FR · EN · ES selector (pc_plang, independent of pc_lang). It is read once, here, before
   anything else needs the sheet: a sheet that is ready AND has a sprint bank wins, anything else keeps the bank's own `active`. */
const practiceReady = (c) => { const s = PRACTICE_SHEETS[c], b = window.PC_BANK && window.PC_BANK.langs && window.PC_BANK.langs[c]; return !!(s && s.ready === true && b && Array.isArray(b.sprint) && b.sprint.length > 0); };
(function () {
  const saved = store.get('pc_plang', null);
  if (window.PC_BANK && typeof window.PC_BANK === 'object' && typeof saved === 'string') { const c = practiceCode(saved); if (practiceReady(c)) window.PC_BANK.active = c; }
})();
const PRACTICE = practiceSheet(window.PC_BANK && window.PC_BANK.active);
/* Wording that names the practice language (copy intro, key bar label, hints) overrides EXISTING interface texts only, so EN/ES keys stay in parity. fr has no overrides. */
(function () {
  ['en', 'es'].forEach(l => {
    const o = PRACTICE.ui[l]; if (!o || typeof o !== 'object') return;
    Object.keys(o).forEach(k => {
      if (!(k in I18N[l])) return;
      if (k === 'say') { if (o.say && typeof o.say === 'object') Object.assign(I18N[l].say, o.say); } else I18N[l][k] = o[k];
    });
  });
})();

/* Accents(): the French key bar. Inserts at the real cursor of whichever field getField() returns,
   keeps the tablet keyboard open (buttons cancel pointerdown/touchstart), respects maxLength. */
function Accents(box, getField, canInsert) {
  let shiftOn = false;
  const UPPER = PRACTICE.upper, KEYS = PRACTICE.keys;   // from the practice-language sheet
  if (!KEYS.length) {                                   // this language has no special keys (English): hide the bar and its label row
    box.innerHTML = ''; box.hidden = true; box.style.display = 'none';
    const row = box.previousElementSibling; if (row && row.hasAttribute('data-keyrow')) { row.hidden = true; row.style.display = 'none'; }
    return { setDisabled() {} };
  }
  const guard = (btn) => {
    ['pointerdown', 'mousedown', 'touchstart'].forEach(ev => btn.addEventListener(ev, (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false }));
    btn.addEventListener('touchend', (e) => { if (e.cancelable) { e.preventDefault(); btn.click(); } }, { passive: false });
  };
  const paint = () => box.querySelectorAll('.key[data-ch]').forEach(b => { const ch = b.dataset.ch; b.textContent = shiftOn && UPPER[ch] ? UPPER[ch] : ch; });
  function insert(ch) {
    const field = getField();
    if (!field || field.readOnly || field.disabled || (canInsert && !canInsert())) return;
    if (document.activeElement !== field) field.focus({ preventScroll: true });
    const val = field.value;
    if (val.length + ch.length > (field.maxLength > 0 ? field.maxLength : Infinity)) return;
    let s = field.selectionStart, e = field.selectionEnd;
    if (typeof s !== 'number' || typeof e !== 'number') { s = e = val.length; }
    if (s > e) { const x = s; s = e; e = x; }
    try { field.setRangeText(ch, s, e, 'end'); }
    catch (err) { field.value = val.slice(0, s) + ch + val.slice(e); const pos = s + ch.length; quiet(() => field.setSelectionRange(pos, pos)); }
    field.dispatchEvent(new Event('input', { bubbles: true }));
    if (shiftOn) { shiftOn = false; const sh = box.querySelector('.shift'); if (sh) sh.setAttribute('aria-pressed', 'false'); paint(); }
  }
  box.innerHTML = '';
  const sh = document.createElement('button');
  sh.type = 'button'; sh.className = 'key shift'; sh.tabIndex = -1; sh.textContent = '⇧ Aa'; sh.setAttribute('aria-pressed', 'false'); sh.setAttribute('aria-label', 'Shift');
  guard(sh); sh.addEventListener('click', () => { shiftOn = !shiftOn; sh.setAttribute('aria-pressed', shiftOn); paint(); });
  box.appendChild(sh);
  KEYS.forEach(ch => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'key'; b.tabIndex = -1; b.dataset.ch = ch; b.textContent = ch;
    guard(b); b.addEventListener('click', () => insert(shiftOn && UPPER[ch] ? UPPER[ch] : ch));
    box.appendChild(b);
  });
  return { setDisabled(d) { box.querySelectorAll('.key').forEach(k => { k.disabled = !!d; }); } };
}

/* Coach: markup + controller for the reactive mime next to a module's clock. One per module (prefix p). */
function coachHTML(p) {
  return `<div class="coach"><div id="${p}Mime" style="width:68px;height:68px;" aria-hidden="true"></div>
    <div class="bubble" id="${p}Bubble" aria-live="polite">…</div>
    <div class="clock-wrap"><div class="clock-label" id="${p}ClockLabel"></div><div class="clock" id="${p}Clock">0:00</div></div></div>
    <div class="timebar mt-3" id="${p}Bar"><i id="${p}Fill"></i></div>`;
}
function Coach(p, sayKey, cardId) {
  $(p + 'Mime').innerHTML = mimeSVG(p);
  let state = 'calm', last = 'ready', lastWarn = false;
  const api = {
    get state() { return state; },
    mime(s) { state = s; const m = document.querySelector('#' + p + 'Mime .mime'); if (m) m.setAttribute('data-state', s); },
    say(key, warn) { last = key; lastWarn = !!warn; api.refresh(); },
    refresh() { const b = $(p + 'Bubble'); b.textContent = (I18N[lang][sayKey] || {})[last] || ''; b.classList.toggle('warn', lastWarn); },
    clock(sec) { $(p + 'Clock').textContent = fmtClock(sec); },
    bar(frac) { $(p + 'Fill').style.transform = `scaleX(${Math.min(1, Math.max(0, fin(frac)))})`; },
    label(txt) { $(p + 'ClockLabel').textContent = txt; },
    critical(on) { $(p + 'Clock').classList.toggle('critical', on); $(p + 'Bar').classList.toggle('critical', on); $(cardId).classList.toggle('critical', on); }
  };
  return api;
}

/* =================== CHARACTERS (pure SVG, ink strokes) ===================
   One character per PRACTICE language (PC_BANK.active), never per interface language (pc_lang):
   fr = the mime, en = a powdered-wig statesman, es = a quiet chronicler with a notebook in the jacket pocket.
   All three share the same skeleton: viewBox 0 0 64 64, stroke currentColor, the same .ring, the same face and the
   same state layers (.st-calm, .st-typing, .st-critical, .st-victory). Only the costume layers change.
   Preview without changing the bank: add ?char=en or ?char=es to the address (it changes the drawing only). */
const CHAR_IDS = ['fr', 'en', 'es'];
function practiceChar() {
  let q = null;
  try { q = new URLSearchParams(location.search).get('char'); } catch (e) { q = null; }
  if (CHAR_IDS.includes(q)) return q;
  return CHAR_IDS.includes(PRACTICE.char) ? PRACTICE.char : 'fr';   // from the practice-language sheet
}
const PAPER_FILL = '#FFFDF9';
const CHAR_PARTS = {
  fr: {
    label: 'Mime',
    back: '',
    collar: `<path d="M18 60 q4 -6 8 -3 q3 -4 6 -1 q3 -3 6 1 q4 -3 8 3" stroke-width="1"/>`,
    top: `<g transform="rotate(-16 31 21)">
      <path d="M16.5 23.4 C15.8 15.6 25 12.4 33 12.6 C41.4 12.8 47.4 16.6 46.6 21.4 C42 24.2 24 25.2 16.5 23.4 Z" fill="currentColor" stroke-width="1"/>
      <path d="M31.6 12.7 l.6 -3.1" stroke-width="1.4"/>
      <path d="M18.4 23.9 C26 25.4 39 24.7 45.4 22.2" stroke="${PAPER_FILL}" stroke-width=".6" stroke-dasharray="1 1.4"/>
    </g>`,
    marks: `<path d="M26.6 39.6 v2.4 M37.4 39.6 v2.4" stroke-width=".9"/>
    <circle cx="39.6" cy="45.2" r=".55" fill="currentColor" stroke="none"/>`
  },
  en: {
    label: 'Statesman',
    back: `<path d="M17.6 40 C14.6 27 18.4 13.4 32 13.4 C45.6 13.4 49.4 27 46.4 40" fill="${PAPER_FILL}" stroke-width="1.1"/>
    <path d="M46.4 40 q2.6 3.4 .4 6.8 M47.2 46.8 l2.4 1.6 M47.2 46.8 l1 2.6" stroke-width=".9"/>`,
    collar: `<path d="M17 62 L25.4 54 M47 62 L38.6 54" stroke-width="1"/>
    <path d="M27.6 54.6 q4.4 2.6 8.8 0" stroke-width="1"/>
    <path d="M32 56 q-2.6 1.8 0 3.4 q2.6 1.6 0 3.4 M32 56 q2.6 1.8 0 3.4" stroke-width=".8"/>`,
    top: `<path d="M19.6 30 C18.8 19.4 24.4 14.4 32 14.4 C39.6 14.4 45.2 19.4 44.4 30 C42.6 24.8 37.8 22.4 32 23.2 C26.2 22.4 21.4 24.8 19.6 30 Z" fill="${PAPER_FILL}" stroke-width="1.15"/>
    <path d="M24.6 18.6 q1.8 -1.4 3.6 0 q1.9 -1.4 3.8 0 q1.9 -1.4 3.8 0 q1.8 -1.4 3.6 0" stroke-width=".7"/>
    <ellipse cx="17.6" cy="31.2" rx="3.1" ry="2.1" fill="${PAPER_FILL}" stroke-width="1"/>
    <ellipse cx="17.6" cy="36.4" rx="3.1" ry="2.1" fill="${PAPER_FILL}" stroke-width="1"/>
    <ellipse cx="46.4" cy="31.2" rx="3.1" ry="2.1" fill="${PAPER_FILL}" stroke-width="1"/>
    <ellipse cx="46.4" cy="36.4" rx="3.1" ry="2.1" fill="${PAPER_FILL}" stroke-width="1"/>`,
    marks: ''
  },
  es: {
    label: 'Chronicler',
    back: '',
    collar: `<path d="M16 62 L24.4 53.4 L29 58.4 M48 62 L39.6 53.4 L35 58.4" stroke-width="1"/>
    <path d="M27.6 53.2 L32 57.4 L36.4 53.2" stroke-width=".9"/>
    <rect x="37.8" y="56" width="5.2" height="5" rx=".6" stroke-width=".9"/>
    <path d="M37.8 57.6 h5.2" stroke-width=".7"/>`,
    top: `<path d="M19.4 31 C18.4 19.6 24.6 14.8 32.4 14.9 C40.2 15 45.6 19.8 44.6 31 C43.8 26.4 41.6 23.2 38 21.6 C33.6 24.2 26.4 24.4 21.8 25.6 C20.6 27.2 19.8 29 19.4 31 Z" fill="currentColor" stroke-width="1"/>
    <path d="M38 21.6 C36.4 19.2 34.2 17 31.4 15.6" stroke="${PAPER_FILL}" stroke-width=".6"/>`,
    marks: ''
  }
};

function charSVG(uid, who) {
  const c = CHAR_PARTS[who] || CHAR_PARTS.fr;
  const id = CHAR_PARTS[who] ? who : 'fr';
  return `
<svg class="mime" data-char="${id}" data-state="calm" viewBox="0 0 64 64" width="100%" height="100%" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="${c.label}">
  <clipPath id="clip-${uid}"><circle cx="32" cy="32" r="28.6"/></clipPath>
  <circle class="ring" cx="32" cy="32" r="30.6" stroke-width="1.3"/>
  <circle cx="32" cy="32" r="28.6" stroke-width=".5" stroke-dasharray=".6 1.6"/>
  <g clip-path="url(#clip-${uid})">
    <g class="ch-back">${c.back}</g>
    <g class="ch-collar">${c.collar}</g>
    <!-- face (shared) -->
    <path d="M19.5 33 C19.5 22.5 25 18.6 32 18.6 C39 18.6 44.5 22.5 44.5 33 C44.5 44 38.6 52.4 32 52.4 C25.4 52.4 19.5 44 19.5 33 Z" stroke-width="1.3" fill="${PAPER_FILL}"/>
    <g class="ch-top">${c.top}</g>
    <!-- nose (shared) + costume marks -->
    <path d="M32 37.4 q-1.2 2.4 .6 2.8" stroke-width=".9"/>
    <g class="ch-marks">${c.marks}</g>

    <!-- 1 · calm -->
    <g class="st st-calm" stroke-width="1.1">
      <path d="M23.4 30.6 q3 -1.6 6.2 -.2 M34.4 30.4 q3.2 -1.4 6.2 .2"/>
      <path d="M24.6 35 q2 1.4 4 0 M35.4 35 q2 1.4 4 0"/>
      <path d="M28.4 45.2 q3.6 2.2 7.2 0"/>
    </g>
    <!-- 2 · typing (focused, eyes down) -->
    <g class="st st-typing" stroke-width="1.1">
      <path d="M23.4 29.8 l6.2 1.6 M40.6 29.8 l-6.2 1.6"/>
      <path d="M24.4 34.2 h4.6 M35 34.2 h4.6" stroke-width=".9"/>
      <circle cx="26.7" cy="36" r="1.15" fill="currentColor" stroke="none"/>
      <circle cx="37.3" cy="36" r="1.15" fill="currentColor" stroke="none"/>
      <path d="M29.4 45.6 h5.2"/>
    </g>
    <!-- 3 · critical (wide eyes, O mouth) -->
    <g class="st st-critical" stroke-width="1.1">
      <path d="M22.8 27.6 q3.6 -2.8 7.2 -.6 M34 27 q3.6 -2.2 7.2 .6"/>
      <circle cx="26.6" cy="34.4" r="2.5"/><circle cx="37.4" cy="34.4" r="2.5"/>
      <circle cx="26.6" cy="34.6" r=".95" fill="currentColor" stroke="none"/>
      <circle cx="37.4" cy="34.6" r=".95" fill="currentColor" stroke="none"/>
      <ellipse cx="32" cy="46" rx="2.1" ry="2.7"/>
    </g>
    <!-- 4 · victory (^ ^ and wide smile) -->
    <g class="st st-victory" stroke-width="1.15">
      <path d="M23.6 29.4 q3 -2 6 -.6 M34.4 28.8 q3 -1.4 6 .6"/>
      <path d="M24.4 35.6 q2.3 -3 4.6 0 M35 35.6 q2.3 -3 4.6 0"/>
      <path d="M26.2 43.4 q5.8 6 11.6 0 q-5.8 1.6 -11.6 0 Z" fill="currentColor"/>
      <path d="M22.4 40.4 l-1.2 .8 M41.6 40.4 l1.2 .8" stroke-width=".8"/>
    </g>
  </g>
</svg>`;
}
/* Every caller (header, Sprint coach, Coach() in II and III) goes through here, so all of them show the same character. */
function mimeSVG(uid) { return charSVG(uid, practiceChar()); }

/* =================== APP SHELL =================== */
const $ = (id) => document.getElementById(id);
const ACCENT_KEYS = PRACTICE.keys, UPPER = PRACTICE.upper, BASE = PRACTICE.base;   // practice-language sheet
const DOUBLE_PUNCT = PRACTICE.doublePunct;
const PL = PRACTICE.htmlLang;               // lang attribute for every practice-language text

let lang = (() => { const v = store.get('pc_lang', null); return v === 'es' || v === 'en' ? v : 'en'; })();   // English by default; Spanish only when chosen
const t = (k) => I18N[lang][k];

/* Header: the brand mark (#brandMark, static SVG in index.html) is the logo. No character is drawn in the header;
   characters appear only next to the clocks (Sprint coach and Coach() in II and III) and follow practiceChar(). */

/* Module registry. A module is { mount(), unmount(), onLang() } and owns its own state and DOM ids.
   The shell never reads a module's variables; it only calls these three hooks, wrapped in safe(). */
const Modules = {};
let currentMod = 1;

/* Leaderboard storage (shared service; shape is ready for a Supabase table later) */
const Board = {
  lastAt: null,
  load() { const r = store.get('pc_runs', []); return Array.isArray(r) ? r : []; },
  save(run) {                                   // returns rank 1..10, or 0 if outside the personal top 10
    const row = Object.assign({ mod: 'sprint', at: new Date().toISOString() }, run);
    const runs = Board.load(); runs.push(row);
    runs.sort((x, y) => fin(y.score) - fin(x.score));
    const top = runs.slice(0, 10); store.set('pc_runs', top);
    const idx = top.indexOf(row); Board.lastAt = idx === -1 ? null : row.at;
    return idx === -1 ? 0 : idx + 1;
  },
  render() {
    const runs = Board.load(), box = $('boardTable');
    if (!runs.length) { box.innerHTML = `<p style="color:var(--ink-soft);font-size:.9rem;margin:4px 0">${t('emptyBoard')}</p>`; return; }
    const loc = lang === 'es' ? 'es' : 'en';
    box.innerHTML = `<table class="board"><thead><tr><th>${t('thRank')}</th><th class="r">${t('thScore')}</th><th class="r">${t('thWpm')}</th><th class="r">${t('thAcc')}</th><th>${t('thDate')}</th></tr></thead><tbody>` +
      runs.map((r, i) => `<tr class="${Board.lastAt && r.at === Board.lastAt ? 'mine' : ''}"><td>${i + 1}</td><td class="r">${Math.round(fin(r.score))}</td><td class="r">${fin(r.wpm)}</td><td class="r">${fin(r.acc)}%</td><td>${new Date(r.at).toLocaleDateString(loc, { day: 'numeric', month: 'short' })}</td></tr>`).join('') +
      `</tbody></table>`;
  },
  open() { if (busy) return; Board.refresh(); $('boardSheet').hidden = false; $('closeBoard').focus(); },
  refresh() { Board.render(); LBView.sheet(); }
};
$('boardBtn').addEventListener('click', Board.open);
$('closeBoard').addEventListener('click', () => { $('boardSheet').hidden = true; });
$('boardSheet').addEventListener('click', (e) => { if (e.target.id === 'boardSheet') $('boardSheet').hidden = true; });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('boardSheet').hidden = true; });

/* =================== SITE CONFIG (edit when going live) =================== */
/* kit: product page of the PDF Kit per language. ads: AdSense publisher and slot ids.
   supabase: fill url + anonKey to move the weekly ranking from localStorage to a Supabase table (schema below). */
const SITE = {
  kit: { en: '', es: '' },
  ads: { client: '', slot: '' },
  supabase: { url: '', anonKey: '' },
  feedbackEmail: 'lifeandgently@gmail.com',
  prizesLive: false,     // prizes and the email field stay hidden until this is true AND the ranking is live with server-side validation
  feedbackEndpoint: ''   // optional: https URL that accepts a JSON POST (e.g. a Supabase function or form service). Empty = mailto + copy only.
};
/* Supabase schema (run once in the SQL editor), then add a row-level policy that allows insert/select to anon
   and CHECK constraints so the server also rejects cheats:
     create table scores (id uuid primary key default gen_random_uuid(), week_id text not null, nick text not null,
       score numeric not null check (score >= 0), wpm int not null check (wpm between 1 and 130),
       acc int not null check (acc between 0 and 100), level text check (level in ('A1','A2','B1','B2','C1')), mod text default 'sprint', created_at timestamptz default now());
     create table leads (id uuid primary key default gen_random_uuid(), week_id text, nick text, email text, created_at timestamptz default now());
   Keep `leads` readable only by you (no select policy for anon). */

/* =================== PROFANITY FILTER (basic, EN / ES / FR) =================== */
const Profanity = (function () {
  const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i', '+': 't' };
  const collapse = (s) => s.replace(/(.)\1+/g, '$1');
  const prep = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe').replace(/[0134578@$!+]/g, (c) => LEET[c] || c);
  const STRONG = ['fuck', 'shit', 'bitch', 'cunt', 'pussy', 'asshole', 'whore', 'slut', 'nigger', 'nigga', 'faggot', 'hitler', 'porn',
    'putain', 'merde', 'salope', 'connard', 'encule', 'batard', 'branleur', 'mierda', 'joder', 'carajo', 'pendejo', 'cabron', 'gilipollas', 'hijueputa', 'maricon', 'chinga'].map(collapse);
  const WEAK = ['dick', 'cock', 'rape', 'nazi', 'sex', 'cul', 'bite', 'pute', 'puta', 'puto', 'verga', 'pija', 'culo', 'cono', 'zorra', 'nique', 'bitch', 'ass'].map(collapse);
  return {
    check(nick) {
      const p = prep(nick);
      const flat = collapse(p.replace(/[^a-z]/g, ''));
      const tokens = p.split(/[^a-z]+/).filter(Boolean).map(collapse);
      return STRONG.some(w => flat.includes(w)) || WEAK.some(w => tokens.includes(w));
    }
  };
})();
function nickError(nick) {            // null when valid, else 'len' | 'chars' | 'bad'
  const n = String(nick || '').replace(/\s+/g, ' ').trim();
  const len = [...n].length;
  if (len < 3 || len > 16) return 'len';
  if (!/^[\p{L}\p{N}][\p{L}\p{N} ._-]*$/u.test(n) || /(https?:|www\.|\.com|\.net|\.org|\.ca|\.fr)/i.test(n)) return 'chars';
  if (Profanity.check(n)) return 'bad';
  return null;
}
const emailOk = (e) => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@.]{2,}$/.test(e) && e.length <= 120;

/* =================== WEEKLY RANKING (storage hook + anti-cheat) =================== */
function sampleRows(week) {
  let a = 0; for (const ch of week) a = (a * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => { a = (a + 0x6D2B79F5) | 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  const nicks = ['Marie_QC', 'Camila.T', 'LucasBXL', 'Ana-Lyon', 'Diego_MTL', 'Sofi92', 'Pierre.G', 'Valen_TO', 'Nadia_Ott', 'Mateo.fr', 'Lola_Gat', 'Jo_Laval', 'Inès_Que', 'Tomás.CA'];
  const out = [];                          // 4 example rows per level (all >= the accuracy floor), clearly tagged as samples
  LEVELS.forEach((lvl, L) => { for (let k = 0; k < 4; k++) {
    const i = (L * 4 + k) % nicks.length, wpm = Math.round(18 + L * 4 + rnd() * 26), acc = Math.round(LB.MIN_ACC + rnd() * (99 - LB.MIN_ACC));
    out.push({ id: 's' + week + lvl + k, nick: nicks[i], wpm, acc, score: Math.round(wpm * Math.pow(acc / 100, 2) * 10) / 10, at: week + 'T12:00:00Z', mod: 'sprint', lvl, sample: true });
  } });
  return out;
}
const sortRows = (rows) => rows.slice().sort((x, y) => (y.score - x.score) || (x.at < y.at ? -1 : 1));

const LocalStore = {                      // default backend: this device only
  async getWeek(week) {
    let o = store.get('pc_week', null);
    if (!o || o.week !== week || !Array.isArray(o.rows)) { o = { week, v: 2, rows: sampleRows(week) }; store.set('pc_week', o); }
    else if (o.v !== 2) { o = { week, v: 2, rows: sampleRows(week).concat(o.rows.filter(r => r && !r.sample)) }; store.set('pc_week', o); }   // older sample set: replace samples, keep real rows
    return o.rows;
  },
  async addScore(week, row) { const rows = await LocalStore.getWeek(week); rows.push(row); store.set('pc_week', { week, v: 2, rows }); },
  async addLead(week, lead) { let l = store.get('pc_leads', []); if (!Array.isArray(l)) l = []; l.push(lead); store.set('pc_leads', l); }   // private: never rendered
};
const SupabaseStore = {                   // hook: used only when SITE.supabase is filled (needs the tables above)
  h() { const k = SITE.supabase.anonKey; return { apikey: k, Authorization: 'Bearer ' + k, 'Content-Type': 'application/json' }; },
  async getWeek(week, level) {
    const lv = level ? `&level=eq.${encodeURIComponent(level)}` : '';
    const r = await fetch(`${SITE.supabase.url}/rest/v1/scores?week_id=eq.${encodeURIComponent(week)}${lv}&order=score.desc,created_at.asc&limit=${LB.TOP}&select=id,nick,score,wpm,acc,level,created_at`, { headers: SupabaseStore.h() });
    if (!r.ok) throw new Error('supabase read');
    return (await r.json()).map(x => ({ id: x.id, nick: x.nick, score: +x.score, wpm: x.wpm, acc: x.acc, lvl: x.level || '', at: x.created_at, mod: 'sprint' }));
  },
  async addScore(week, row) {
    const r = await fetch(`${SITE.supabase.url}/rest/v1/scores`, { method: 'POST', headers: SupabaseStore.h(), body: JSON.stringify({ week_id: week, nick: row.nick, score: row.score, wpm: row.wpm, acc: row.acc, level: row.lvl || null, mod: row.mod }) });
    if (!r.ok) throw new Error('supabase write');
  },
  async addLead(week, lead) {
    const r = await fetch(`${SITE.supabase.url}/rest/v1/leads`, { method: 'POST', headers: SupabaseStore.h(), body: JSON.stringify({ week_id: week, nick: lead.nick, email: lead.email }) });
    if (!r.ok) throw new Error('supabase lead');
  }
};
const Backend = (SITE.supabase.url && SITE.supabase.anonKey) ? SupabaseStore : LocalStore;

const LB = {
  MAX_WPM: 130, MIN_SECS: 30, MIN_CHARS: 60, MIN_ACC: 90, TOP: 20, PRIZE: 10, TZ: 'America/Toronto',
  live: Backend !== LocalStore,
  prizes() { return LB.live && SITE.prizesLive === true; },   // honest prizes: never shown in demo / without server validation
  etNow(now) {                            // wall clock in Eastern Time; fixed UTC-5 fallback if Intl is missing
    now = now || new Date();
    try {
      const parts = new Intl.DateTimeFormat('en-CA', { timeZone: LB.TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short', hourCycle: 'h23' }).formatToParts(now);
      const g = (k) => parts.find(p => p.type === k).value;
      const dow = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }[g('weekday')];
      if (dow === undefined) throw new Error('weekday');
      return { y: +g('year'), m: +g('month'), d: +g('day'), h: +g('hour') % 24, mi: +g('minute'), s: +g('second'), dow };
    } catch (e) {
      const x = new Date(now.getTime() - 5 * 3600 * 1000);
      return { y: x.getUTCFullYear(), m: x.getUTCMonth() + 1, d: x.getUTCDate(), h: x.getUTCHours(), mi: x.getUTCMinutes(), s: x.getUTCSeconds(), dow: (x.getUTCDay() + 6) % 7 };
    }
  },
  weekId(now) { const e = LB.etNow(now); return new Date(Date.UTC(e.y, e.m - 1, e.d - e.dow)).toISOString().slice(0, 10); },   // Monday of the current ET week
  msToReset(now) { const e = LB.etNow(now); return Math.max(0, Date.UTC(e.y, e.m - 1, e.d - e.dow + 7) - Date.UTC(e.y, e.m - 1, e.d, e.h, e.mi, e.s)); },
  check(run) {                            // null = rankable, else the reason it is discarded
    if (!run || !(run.typed > 0) || !(run.score > 0)) return 'empty';
    if (run.suspect) return 'suspect';
    if (run.wpm > LB.MAX_WPM) return 'speed';
    if (run.elapsed < LB.MIN_SECS || run.typed < LB.MIN_CHARS) return 'short';
    if (!(fin(run.acc) >= LB.MIN_ACC)) return 'acc';                 // accuracy floor: precision first
    const exp = run.wpm * Math.pow(run.acc / 100, 2);
    if (!isFinite(exp) || Math.abs(exp - run.score) > 0.5) return 'suspect';
    return null;
  },
  async rows(level) {                     // one ranking per level ('' / undefined = all levels)
    const week = LB.weekId(); let rows;
    try { rows = await Backend.getWeek(week, level); } catch (e) { rows = await LocalStore.getWeek(week); }
    if (level) rows = rows.filter(r => r && r.lvl === level);
    return sortRows(rows);
  },
  async previewRank(score, level) { const rows = await LB.rows(level); return 1 + rows.filter(r => r.score > score).length; },
  mine() { const o = store.get('pc_mine', null); return new Set(o && o.week === LB.weekId() && Array.isArray(o.ids) ? o.ids : []); },
  async submit(run, nick, email) {
    const why = LB.check(run); if (why) return { ok: false, error: why };
    const nErr = nickError(nick); if (nErr) return { ok: false, error: 'nick-' + nErr };
    email = String(email || '').trim(); if (email && !emailOk(email)) return { ok: false, error: 'email' };
    nick = String(nick).replace(/\s+/g, ' ').trim();
    const week = LB.weekId();
    const row = { id: 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), nick, wpm: Math.round(run.wpm), acc: Math.round(run.acc), score: Math.round(run.score * 10) / 10, at: new Date().toISOString(), mod: 'sprint', lvl: LEVELS.indexOf(run.level) !== -1 ? run.level : '' };
    try { await Backend.addScore(week, row); if (email) await Backend.addLead(week, { nick, email, at: row.at }); }
    catch (e) { await LocalStore.addScore(week, row); if (email) await LocalStore.addLead(week, { nick, email, at: row.at }); }
    const ids = LB.mine(); ids.add(row.id); store.set('pc_mine', { week, ids: [...ids] });
    store.set('pc_nick', nick);
    const rows = await LB.rows(row.lvl);
    return { ok: true, rank: rows.findIndex(r => r.id === row.id) + 1, id: row.id };
  }
};

/* =================== RESULTS SCREEN (shared service; modules only pass a payload) =================== */
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let busy = false;                        // true while any module has a run in progress
function setBusy(b) {
  busy = !!b; const btn = $('boardBtn');
  btn.disabled = busy; btn.title = busy ? t('boardBusy') : '';
  document.querySelectorAll('#levelBar .lvl').forEach(b => { b.disabled = busy; b.title = busy ? t('lvlBusy') : ''; });
  document.querySelectorAll('#plangBar [data-pcode]').forEach(b => { b.disabled = busy; b.title = busy ? t('plangBusy') : ''; });
}
function lbTable(rows, limit, mine) {
  const body = rows.slice(0, limit).map((r, i) => `<tr class="${mine.has(r.id) ? 'mine' : ''}${i >= LB.PRIZE && LB.prizes() ? ' rest' : ''}${r.sample ? ' sample' : ''}"><td>${i + 1}</td><td>${esc(r.nick)}${r.lvl ? ` <span class="tag lvl">${esc(r.lvl)}</span>` : ''}${r.sample ? ` <span class="tag ex">${esc(t('lbSample'))}</span>` : ''}${mine.has(r.id) ? ` <span class="tag you">${esc(t('lbYou'))}</span>` : ''}</td><td class="r">${Math.round(r.score)}</td><td class="r">${r.wpm}</td><td class="r">${r.acc}%</td></tr>`).join('');
  if (!rows.length) return `<p class="rv-note">${esc(t('lbEmptyLvl'))}</p>`;
  return `<div style="overflow-x:auto"><table class="board"><thead><tr><th>#</th><th>${esc(t('lbNick'))}</th><th class="r">${esc(t('thScore'))}</th><th class="r">${esc(t('thWpm'))}</th><th class="r">${esc(t('thAcc'))}</th></tr></thead><tbody>${body}</tbody></table></div>`;
}
function resetText() {
  const ms = LB.msToReset(), d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000);
  return t('lbReset')(d, h);
}
function boardNotes() {                   // prizes only when the ranking is live AND validated on the server (SITE.prizesLive)
  const rules = `<p class="rv-note">${esc(t('lbRulesMin')(LB.MIN_ACC))}</p>`;
  if (LB.prizes()) return rules + `<p class="rv-note">${esc(t('lbPrize1'))}<br>${esc(t('lbPrize10'))}</p>`;
  return rules + `<p class="rv-note demo">${esc(t('lbNoPrize'))}${LB.live ? '' : ' ' + esc(t('lbLocal'))}</p>`;
}

/* =================== CONNECTOR MATCHING (shared: Improv live chips + post-test review) ===================
   Whole words, case and accent insensitive (an accent slip is still found, and flagged). Ambiguous words (bank flag `amb`,
   or aussi / puis / alors / ainsi / enfin) only count in a connector position: start of the text or of a sentence,
   after , ; : or right after « et ». « alors que » and « ainsi que » are never the connector. */
const ConnMatch = (() => {
  const AMB = new Set(PRACTICE.ambiguous.map(w => String(w).toLowerCase()));   // practice-language sheet
  const fold = (ch) => (ch === '’' || ch === '‘') ? "'" : /\s/.test(ch) ? ' ' : ((ch.normalize('NFD')[0] || ch).toLowerCase());
  const isL = (ch) => !!ch && /\p{L}/u.test(ch);
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const same = (s) => String(s).replace(/[’‘]/g, "'").replace(/\s+/g, ' ').toLowerCase();
  const ambiguous = (c) => c.amb === true || AMB.has(String(c.fr).trim().toLowerCase());
  function ctxOk(text, s, e, c) {
    if (!ambiguous(c)) return true;
    const word = String(c.fr).trim().toLowerCase(), next = text.slice(e).replace(/^\s+/, '').toLowerCase();
    if (PRACTICE.noQue.includes(word) && /^qu(e\b|'|’)/.test(next)) return false;
    let i = s - 1; while (i >= 0 && /[\s«»"“”(\-–—]/.test(text[i])) i--;
    if (i < 0 || /[.!?…:;,]/.test(text[i])) return true;
    const prev = text.slice(Math.max(0, i - 20), i + 1).match(/(\p{L}+)$/u);
    return !!prev && PRACTICE.andWords.includes(prev[1].toLowerCase());
  }
  function find(text, c) {                 // every whole-word occurrence: { s, e, orig, accentMissing, ok }
    text = String(text || ''); const out = [];
    if (!c || !c.fr || !text) return out;
    const base = text.split('').map(fold).join('');
    const words = String(c.fr).split('').map(fold).join('').trim().split(/ +/).filter(Boolean);
    if (!words.length) return out;
    const re = new RegExp(words.map(reEsc).join(' +'), 'g'); let m, guard = 0;
    while ((m = re.exec(base)) && guard++ < 80) {
      const s = m.index, e = s + m[0].length;
      if (isL(text[s - 1]) || isL(text[e])) continue;
      const orig = text.slice(s, e);
      out.push({ s, e, orig, accentMissing: same(orig) !== same(c.fr), ok: ctxOk(text, s, e, c) });
    }
    return out;
  }
  function detect(text, c) {               // found = at least one valid use; loose = only out-of-context uses of an ambiguous word
    const hits = find(text, c), ok = hits.filter(h => h.ok);
    return { found: ok.length > 0, accentMissing: ok.length > 0 && ok.every(h => h.accentMissing), loose: !ok.length && hits.length > 0 };
  }
  return { find, detect, ambiguous };
})();

/* =================== IMPROV REVIEW (pure, post-test only; never runs while writing) ===================
   Builds the highlighted copy of the learner's text and at most 3 calm remarks:
   1) connectors found (soft highlight; flags a missing accent), 2) frequent French words written without their accent,
   3) a sentence that starts in lower case after . ! ?  Any failure falls back to the plain text. */
const ImprovReview = (function () {
  const MAX_OBS = 3, MAX_MARKS = 3;
  // Unaccented form -> correct form. Only words whose unaccented spelling is NOT itself a French word (no a/à, ou/où, la/là...).
  const ACC = PRACTICE.accentWords;                 // from the practice-language sheet (fr: the exact list used before)
  const strip1 = (ch) => { const d = ch.normalize('NFD'); return (d[0] || ch).toLowerCase(); };
  const isL = (ch) => !!ch && /\p{L}/u.test(ch);
  const q = (s) => (lang === 'es' || lang === 'fr') ? `« ${s} »` : `“${s}”`;
  function connectorMarks(text, conns, det) {
    const marks = [], miss = [], used = [], loose = [];
    (conns || []).forEach((c, ci) => {
      if (!c || !c.fr) return;
      let hit = false, out = false;
      ConnMatch.find(text, c).forEach(h => {
        if (!h.ok) { out = true; return; }                                         // ambiguous word outside a connector position: not counted
        marks.push({ s: h.s, e: h.e, cls: 'mk-conn' + (h.accentMissing ? ' warn' : ''), title: h.accentMissing ? c.fr : '' });
        if (h.accentMissing && miss.length < MAX_MARKS) miss.push(`${q(h.orig)} → ${q(c.fr)}`);
        hit = true;
      });
      if (hit || (det && det[ci] && det[ci].found)) used.push(q(c.fr));
      else if (out) loose.push(q(c.fr));
    });
    return { marks, miss, used, loose };
  }
  function accentMarks(text) {
    const marks = [], pairs = [], seen = new Set();
    const re = /\p{L}+(?:-\p{L}+)*/gu; let m, guard = 0;
    while ((m = re.exec(text)) && guard++ < 2000) {
      const w = m[0], low = w.toLowerCase();
      if (/[^\x00-\x7F]/.test(w)) continue;                                        // already has accents or special letters
      const fix = ACC[low.replace(/-/g, '_')];
      if (!fix) continue;
      if (marks.length >= MAX_MARKS) break;
      const shown = w[0] === w[0].toUpperCase() ? fix[0].toUpperCase() + fix.slice(1) : fix;
      marks.push({ s: m.index, e: m.index + w.length, cls: 'mk-acc', title: shown });
      if (!seen.has(low)) { seen.add(low); pairs.push(`${q(w)} → ${q(shown)}`); }
    }
    return { marks, pairs };
  }
  function capitalMarks(text) {
    const marks = [], pairs = [];
    const re = /(^|[.!?]["»”)]?\s+)(\p{Ll}[\p{L}'’-]*)/gu; let m, guard = 0;
    while ((m = re.exec(text)) && guard++ < 2000) {
      const lead = m[1], word = m[2], start = m.index + lead.length;
      if (lead && /\.\.\.?\s*$|…/.test(text.slice(Math.max(0, m.index - 2), m.index + lead.length))) continue;   // "..." may go on in lower case
      if (/\b(etc|cf|p\.ex|ex)\.\s*$/i.test(text.slice(Math.max(0, m.index - 6), m.index + lead.length))) continue;
      if (marks.length >= MAX_MARKS) break;
      marks.push({ s: start, e: start + word.length, cls: 'mk-cap', title: word[0].toUpperCase() + word.slice(1) });
      pairs.push(`${q(word)} → ${q(word[0].toUpperCase() + word.slice(1))}`);
    }
    return { marks, pairs };
  }
  function paint(text, marks) {
    const sorted = marks.slice().sort((a, b) => a.s - b.s || b.e - a.e), out = []; let pos = 0;
    sorted.forEach(k => {
      if (k.s < pos) return;                                                        // never overlap marks
      out.push(esc(text.slice(pos, k.s)));
      out.push(`<mark class="${k.cls}"${k.title ? ` title="${esc(k.title)}"` : ''}>${esc(text.slice(k.s, k.e))}</mark>`);
      pos = k.e;
    });
    out.push(esc(text.slice(pos)));
    return out.join('');
  }
  return {
    analyze(text, conns, det) {
      text = String(text || '');
      if (!text.trim()) return { html: '', obs: [] };
      try {
        const c = connectorMarks(text, conns, det), a = accentMarks(text), k = capitalMarks(text), obs = [];
        if (c.miss.length) obs.push({ kind: 'conn', text: t('m2obsConn')(c.miss.join(', ')) });
        if (c.loose.length) obs.push({ kind: 'ctx', text: t('m2obsCtx')(c.loose.join(', ')) });
        if (a.pairs.length) obs.push({ kind: 'acc', text: t('m2obsAccent')(a.pairs.join(', ')) });
        if (k.pairs.length) obs.push({ kind: 'cap', text: t('m2obsCap')(k.pairs.join(', ')) });
        if (obs.length < MAX_OBS && !c.miss.length && c.used.length) obs.push({ kind: 'ok', text: t('m2obsConnOk')(c.used.join(lang === 'es' ? ' y ' : ' and ')) });
        return { html: paint(text, c.marks.concat(a.marks, k.marks)), obs: obs.slice(0, MAX_OBS) };
      } catch (e) { return { html: esc(text), obs: [] }; }
    }
  };
})();

/* formula line: one decimal when rounding would hide a small error (99.7 instead of 100), so the shown formula adds up */
const accShown = (acc) => { const x = fin(acc), r = Math.round(x * 10) / 10; const v = Number.isInteger(r) ? r : r.toFixed(1); return lang === 'es' ? String(v).replace('.', ',') : String(v); };
const Results = {
  cur: null, tok: 0, submitted: {},
  show(n, payload) {
    setBusy(false);
    Results.cur = { n, p: payload };
    document.querySelectorAll('.page.showing-results').forEach(s => s.classList.remove('showing-results'));
    const sec = $('mod' + n); sec.classList.add('showing-results'); sec.appendChild($('resultsView'));
    $('resultsView').hidden = false;
    Results.render();
    Timers.after(() => $('resultsView').scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
  },
  hide() {
    $('resultsView').hidden = true; Results.cur = null; Results.tok++;
    document.querySelectorAll('.page.showing-results').forEach(s => s.classList.remove('showing-results'));
  },
  visible() { return !$('resultsView').hidden; },
  body(n, p) {
    if (n === 1) {
      const w = Math.round(p.wpm), a = Math.round(p.acc), s = Math.round(p.score), prog = p.total ? Math.round((Math.min(p.reached != null ? p.reached : p.typed, p.total) / p.total) * 100) : 0;
      return `<div class="rv-hero"><div class="result-score">${s}</div><div class="formula">${esc(t('rvFormula')(w, accShown(p.acc), s))}</div></div>
        <p class="rv-note score-explain">${esc(t('rvScoreExplain'))}</p>
        <p class="practice-note" id="rvPractice">${esc(t('rvPracticeNote'))}</p>
        <div class="stats auto mt-4">
          <div class="stat"><div class="k">${esc(t('wpm'))}</div><div class="v">${w}</div></div>
          <div class="stat"><div class="k">${esc(t('acc'))}</div><div class="v">${a}<small>%</small></div></div>
          <div class="stat"><div class="k">${esc(t('progress'))}</div><div class="v">${prog}<small>%</small></div></div>
          <div class="stat"><div class="k">${esc(t('time'))}</div><div class="v">${esc(fmtClock(p.elapsed))}</div></div>
        </div>
        <div class="chips mt-3">
          <span class="chip ${p.nAccent ? 'hot' : ''}">${esc(t('eAccent'))} · <b>${p.nAccent}</b></span>
          <span class="chip ${p.nSpace ? 'soft' : ''}">${esc(t(p.qc ? 'eSpaceQc' : 'eSpace'))} · <b>${p.nSpace}</b></span>
          <span class="chip">${esc(t('eOther'))} · <b>${p.nOther}</b></span></div>
        <p class="rv-note">${esc(t(p.qc ? 'rvAccNoteQc' : 'rvAccNote'))}</p>
        ${p.typed === 0 ? `<div class="flag mt-3">${esc(t('rvZero'))}</div>` : ''}`;
    }
    if (n === 2) {
      const pct = p.goal ? Math.min(100, Math.round((p.words / p.goal) * 100)) : 0;
      const used = p.det.filter(d => d.found).length;
      const secs = Math.round(p.secs), time = `${Math.floor(secs / 60)} min ${secs % 60} s`;
      return `<div class="stats auto mt-3">
          <div class="stat"><div class="k">${esc(t('m2resWords'))}</div><div class="v">${p.words}<small> / ${p.goal}</small></div></div>
          <div class="stat"><div class="k">${esc(t('m2resConn'))}</div><div class="v">${used}/2</div></div>
          <div class="stat"><div class="k">${esc(t('m2resTime'))}</div><div class="v" style="font-size:1.05rem">${esc(time)}</div></div>
        </div>
        <div class="goalbar mt-3" aria-hidden="true"><i style="width:${pct}%"></i></div>
        <p class="rv-note">${esc(p.words >= p.goal ? t('m2goalMet') : t('m2goalShort')(p.goal - p.words))}</p>
        <div class="eyebrow mt-4">${esc(t('m2connLabel'))}</div>
        <div class="chips mt-2">${p.conns.map((c, i) => { const d = p.det[i]; return `<span class="chip conn ${d.found ? 'ok' : 'miss'}">${d.found ? '✓' : '✗'} <b>${esc(c.fr)}</b> <small>· ${esc(t(d.found ? 'm2used' : 'm2missing'))}${d.accentMissing ? ' · ' + esc(t('m2noAccent')) : ''}</small></span>`; }).join('')}</div>
        ${p.words === 0 ? `<div class="flag mt-3">${esc(t('say2').empty)}</div>` : ''}
        ${Results.draft(p)}
        ${p.react === null ? '' : `<p class="react-note">${esc(t('m2reactNote')(lang === 'es' ? p.react.toFixed(1).replace('.', ',') : p.react.toFixed(1)))}</p>`}`;
    }
    const letters = ['A', 'B', 'C', 'D'];
    return `<div class="rv-hero"><div class="result-score">${p.score}/3</div><div class="formula">${esc(t('m3resScore'))}</div></div>
      <div class="stats auto mt-4">
        <div class="stat"><div class="k">${esc(t('m3resTime'))}</div><div class="v">${esc(fmtClock(p.used))}</div></div>
        <div class="stat"><div class="k">${esc(t('m3resBlank'))}</div><div class="v">${p.blank}</div></div>
      </div>
      <div class="eyebrow mt-4">${esc(p.title)} · ${esc(t('rvDetail'))}</div>
      ${p.items.map((it, i) => `<div class="corr ${it.chosen === it.correct ? 'good' : 'bad'}"><div class="q-text" lang="${PL}">${i + 1}. ${esc(it.q)}</div>
        <div class="corr-line">${it.chosen === it.correct ? '✓' : '✗'} ${esc(t('rvYours'))}: <span lang="${PL}">${it.chosen === null ? esc(t('rvNoAns')) : letters[it.chosen] + '. ' + esc(it.o[it.chosen])}</span></div>
        ${it.chosen === it.correct ? '' : `<div class="corr-line">${esc(t('rvRight'))}: <span lang="${PL}"><b>${letters[it.correct]}. ${esc(it.o[it.correct])}</b></span></div>`}
        <div class="why" lang="${PL}">${esc(it.why)}</div></div>`).join('')}`;
  },
  draft(p) {                               // Improv only: the learner's own text, softly marked, plus up to 3 remarks
    const text = String(p.text || ''), rv = ImprovReview.analyze(text, p.conns, p.det);
    if (!text.trim()) return `<div class="eyebrow mt-5">${esc(t('m2draftLabel'))}</div><p class="rv-note">${esc(t('m2draftEmpty'))}</p>`;
    return `<div class="flex flex-wrap items-center justify-between gap-2 mt-5"><div class="eyebrow">${esc(t('m2draftLabel'))}</div>
        <button type="button" class="btn alt btn-sm" id="rvCopyDraft">${esc(t('m2copy'))}</button></div>
      <div class="draft mt-2" id="rvDraft" lang="${PL}">${rv.html}</div>
      <p class="draft-legend">${esc(t('m2legend'))}</p>
      <p class="draft-status" id="rvCopyStatus" role="status" aria-live="polite"></p>
      <div class="eyebrow mt-4">${esc(t('m2reviewLabel'))}</div>
      ${rv.obs.length ? `<ul class="obs mt-2">${rv.obs.map(o => `<li class="obs-${o.kind}">${esc(o.text)}</li>`).join('')}</ul>` : `<p class="rv-note">${esc(t('m2reviewNone'))}</p>`}`;
  },
  copyDraft(p) {
    const btn = $('rvCopyDraft'), box = $('rvDraft'), status = $('rvCopyStatus'); if (!btn || !box) return;
    const text = String(p.text || '');
    const done = () => { btn.textContent = t('m2copied'); btn.classList.add('done'); Timers.after(() => { if (btn.isConnected) { btn.textContent = t('m2copy'); btn.classList.remove('done'); } }, 1800); };
    const manual = () => {
      quiet(() => { const r = document.createRange(); r.selectNodeContents(box); const s = getSelection(); s.removeAllRanges(); s.addRange(r); });
      let ok = false; try { ok = document.execCommand && document.execCommand('copy'); } catch (e) { ok = false; }
      if (ok) done(); else if (status) status.textContent = t('m2copyFail');
    };
    btn.addEventListener('click', () => {
      if (status) status.textContent = '';
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, manual);
        else manual();
      } catch (e) { manual(); }
    });
  },
  render() {
    const c = Results.cur; if (!c) return;
    const n = c.n, p = c.p, view = $('resultsView');
    const url = SITE.kit[lang] || '', ready = /^https:\/\//.test(url);
    const cta = ready
      ? `<a class="btn quill kit-cta" href="${esc(url)}" target="_blank" rel="noopener sponsored">${esc(t('kitCta'))}</a>`
      : `<span class="kit-status" role="status"><span class="dot" aria-hidden="true"></span>${esc(t('kitPrep'))}</span><span class="kit-fine">${esc(t('kitPrepNote'))}</span>`;
    // Plume Writing Kit: full card right after a writing practice (Improv), compact card after Sprint / Reading
    const kit = n === 2
      ? `<aside class="kit kit-full mt-5" id="rvKit">
        <p class="kit-lead">${esc(t('kitLead'))}</p>
        <div class="eyebrow">${esc(t('kitEyebrow'))}</div>
        <h3 class="h-serif" style="font-size:1.25rem;margin:2px 0 6px">${esc(t('kitTitle'))}</h3>
        <p style="margin:0 0 8px;max-width:60ch">${esc(t('kitText'))}</p>
        <ul class="kit-points">${t('kitPoints').map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        <div class="flex flex-wrap items-center gap-3 mt-3">${cta}${ready ? `<span class="kit-fine">${esc(t('kitFine'))}</span>` : ''}</div>
      </aside>`
      : `<aside class="kit kit-compact mt-6" id="rvKit">
        <div class="eyebrow">${esc(t('kitEyebrow'))}</div>
        <h3 class="h-serif" style="font-size:1.1rem;margin:2px 0 4px">${esc(t('kitTitle'))}</h3>
        <p style="margin:0 0 8px;max-width:60ch">${esc(t('kitShort'))}</p>
        <div class="flex flex-wrap items-center gap-3">${cta}</div>
      </aside>`;
    const adsOn = !!(SITE.ads.client && SITE.ads.slot);
    const others = [1, 2, 3].filter(m => m !== n);
    view.innerHTML = `
      <div class="eyebrow">${esc(t('rvEyebrow'))}${p.level ? ` <span class="chip lvl">${esc(t('rvLevel'))} ${esc(Levels.full(p.level))}</span>` : ''}</div>
      <h2 class="h-serif" style="font-size:1.45rem;margin:2px 0 2px">${esc(t('tab' + n))}${p.title && n === 1 ? ` <span class="rv-sub">· ${esc(p.title)}</span>` : ''}</h2>
      <p class="rv-note" style="margin:0 0 4px">${esc((t('rvReason') || {})[p.reason] || '')}</p>
      <div id="rvBody">${Results.body(n, p)}</div>
      ${n === 1 ? '<div id="rvBoard" class="mt-5"></div>' : ''}
      ${n === 2 ? kit : ''}
      <div class="rv-actions mt-5">
        <button type="button" class="btn quill" id="rvAgain">${esc(n === 3 ? (Levels.pool('reading').list.length > 1 ? t('m3again') : t('m3againSame')) : t('again'))}</button>
        ${n === 3 ? '' : `<button type="button" class="btn alt" id="rvNew">${esc(t('rvNew'))}</button>`}
        <span class="rv-switch"><span class="eyebrow">${esc(t('rvSwitch'))}</span>${others.map(m => `<button type="button" class="btn alt" data-go="${m}">${esc(t('tab' + m))}</button>`).join('')}</span>
      </div>
      ${n === 2 ? '' : kit}
      <div class="ad-wrap mt-6${adsOn ? '' : ' ads-off'}" id="adWrap" ${adsOn ? '' : 'hidden aria-hidden="true"'}><div class="ad-label">${esc(t('adLabel'))}</div>
        <div class="ad-slot" id="adSlot" data-ad-client="${esc(SITE.ads.client)}" data-ad-slot="${esc(SITE.ads.slot)}"><span>${esc(t('adReserved'))}</span></div></div>`;
    $('rvAgain').onclick = () => { Results.hide(); safe(() => Modules[n].retry()); $('mod' + n).scrollIntoView({ behavior: 'smooth' }); };
    if ($('rvNew')) $('rvNew').onclick = () => { Results.hide(); safe(() => Modules[n].next()); $('mod' + n).scrollIntoView({ behavior: 'smooth' }); };
    view.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { showMod(+b.dataset.go); window.scrollTo({ top: 0, behavior: 'smooth' }); }));
    Results.ads();
    if (n === 1) Results.board(p);
    if (n === 2) Results.copyDraft(p);
  },
  ads() {                                  // AdSense: empty placeholder until SITE.ads is filled and the page loads the AdSense script
    const slot = $('adSlot'); if (!slot || !SITE.ads.client || !SITE.ads.slot) return;
    quiet(() => {
      slot.innerHTML = `<ins class="adsbygoogle" style="display:block" data-ad-client="${esc(SITE.ads.client)}" data-ad-slot="${esc(SITE.ads.slot)}" data-ad-format="auto" data-full-width-responsive="true"></ins>`;
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    });
  },
  async board(p) {
    const tok = ++Results.tok, box = $('rvBoard'); if (!box) return;
    const lvl = LEVELS.indexOf(p.level) !== -1 ? p.level : '';
    if (lvl) store.set('pc_lb_lvl', lvl);
    const rows = await LB.rows(lvl); if (tok !== Results.tok) return;
    const mine = LB.mine();
    let qual = '';
    const done = Results.submitted[p.at];
    if (p.why) {
      const why = t('rvNo_' + p.why);
      qual = `<div class="flag" id="lbWhy">${esc(typeof why === 'function' ? why(accShown(p.acc)) : why)}</div>`;
    } else if (done) {
      qual = `<div class="lb-ok">${esc(t('lbDone')(done))}</div>`;
    } else {
      const rank = 1 + rows.filter(r => r.score > p.score).length;
      if (rank <= LB.TOP) {
        const prefill = esc(store.get('pc_nick', '') || '');
        qual = `<form id="lbForm" novalidate class="lb-form">
          <div class="lb-qual">${esc(rank <= LB.PRIZE ? t('lbQualify10')(rank) : t('lbQualify20')(rank))}</div>
          <label class="lb-label" for="lbNick">${esc(t('lbNickLabel'))}</label>
          <input id="lbNick" class="input" type="text" maxlength="16" autocomplete="nickname" autocapitalize="off" autocorrect="off" spellcheck="false" value="${prefill}">
          <div class="hint">${esc(t('lbNickHint'))}</div>
          ${rank <= LB.PRIZE && LB.prizes() ? `<label class="lb-label" for="lbEmail">${esc(t('lbEmailLabel'))}</label>
            <input id="lbEmail" class="input" type="email" maxlength="120" autocomplete="email" autocapitalize="off" spellcheck="false">
            <div class="hint">${esc(t('lbEmailHint'))}</div>` : ''}
          <div class="err" id="lbErr" role="alert"></div>
          <button type="submit" class="btn quill">${esc(t('lbSubmit'))}</button></form>`;
      } else qual = `<div class="rv-note">${esc(t('lbOut'))}</div>`;
    }
    box.innerHTML = `<div class="eyebrow">${esc(t('lbEyebrow'))}${lvl ? ` <span class="chip lvl">${esc(t('rvLevel'))} ${esc(Levels.full(lvl))}</span>` : ''}</div>
      <p class="rv-note" style="margin:2px 0 8px">${esc(resetText())}</p>
      ${qual}
      <div class="mt-3">${lbTable(rows, 5, mine)}</div>
      <div class="flex flex-wrap items-center gap-3 mt-2"><button type="button" class="btn alt" id="lbAll">${esc(t('lbSeeAll'))}</button></div>
      ${boardNotes()}`;
    const all = $('lbAll'); if (all) all.onclick = () => { if (lvl) LBView.pick(lvl, false); Board.open(); };
    const form = $('lbForm');
    if (form) form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = $('lbErr'), nick = $('lbNick').value, email = $('lbEmail') ? $('lbEmail').value : '';
      err.textContent = '';
      const res = await LB.submit(p, nick, email);
      if (!res.ok) { err.textContent = t('lbErr')[res.error] || t('lbErr').other; return; }
      Results.submitted[p.at] = res.rank;
      Results.board(p);
    });
  },
  onLang() { if (Results.cur) Results.render(); }
};

/* ranking sheet (opened from the header; disabled while a run is in progress) */
const LBView = {
  lvl: null, tok: 0,
  level() {                                // chosen level > current level filter > last level played > B1 / first level
    if (LEVELS.indexOf(LBView.lvl) !== -1) return LBView.lvl;
    if (typeof Levels !== 'undefined' && LEVELS.indexOf(Levels.cur) !== -1) return Levels.cur;
    const saved = store.get('pc_lb_lvl', null);
    if (LEVELS.indexOf(saved) !== -1) return saved;
    return LEVELS.indexOf('B1') !== -1 ? 'B1' : LEVELS[0];
  },
  pick(v, redraw) { if (LEVELS.indexOf(v) === -1) return; LBView.lvl = v; store.set('pc_lb_lvl', v); if (redraw !== false) LBView.sheet(); },
  async sheet() {
    const box = $('lbBox'); if (!box) return;
    const lvl = LBView.level(), tok = ++LBView.tok;
    const rows = await LB.rows(lvl), mine = LB.mine(); if (tok !== LBView.tok) return;
    const pills = LEVELS.map(c => `<button type="button" class="chip lb-lvl${c === lvl ? ' on' : ''}" data-lv="${esc(c)}" aria-pressed="${c === lvl}">${esc(Levels.label(c))}</button>`).join('');
    box.innerHTML = `<div class="lb-lvls" role="group" aria-label="${esc(t('lbLevelPick'))}">${pills}</div>
      <p class="rv-note" style="margin:6px 0 8px">${esc(resetText())}</p>${lbTable(rows, LB.TOP, mine)}${boardNotes()}`;
    box.querySelectorAll('.lb-lvl').forEach(b => b.addEventListener('click', () => LBView.pick(b.dataset.lv)));
  }
};

/* header audio button: icon only (speaker; crossed out when off), same width in every language.
   The full label is the accessible name and the tooltip; aria-pressed drives which icon strokes show (style.css). */
function paintAudio() {
  const full = Sound.enabled ? t('audioOn') : t('audioOff');
  $('audioLabel').textContent = full; $('audioBtn').setAttribute('aria-label', full); $('audioBtn').setAttribute('title', full);
  const s = $('audioShort'); if (s) s.textContent = Sound.enabled ? t('audioShortOn') : t('audioShortOff');
}
/* i18n: shell texts here, module texts through each module's onLang() */
function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => { const v = t(el.dataset.i18n); if (typeof v === 'string') el.textContent = v; });
  $('langEN').setAttribute('aria-pressed', lang === 'en');
  $('langES').setAttribute('aria-pressed', lang === 'es');
  quiet(() => { $('langGroup').setAttribute('aria-label', t('langLabel')); $('tabBar').setAttribute('aria-label', t('tabsLabel')); $('boardBtn').setAttribute('aria-label', t('board')); });
  paintAudio();
  safe(() => PLANG.paint());
  $('rulesList').innerHTML = t('rules').concat(LB.prizes() ? [t('lbPrize1'), t('lbPrize10')] : []).map(r => `<li>${esc(r)}</li>`).join('');
  new Set(Object.values(Modules)).forEach(m => safe(() => m.onLang && m.onLang()));
  Results.onLang();
  safe(() => Feedback.onLang());
  safe(() => Levels.note());
  if (!$('boardSheet').hidden) Board.refresh();
}
function setLang(l) { lang = l; store.set('pc_lang', l); applyLang(); }
$('langEN').addEventListener('click', () => setLang('en'));
$('langES').addEventListener('click', () => setLang('es'));

$('audioBtn').setAttribute('aria-pressed', Sound.enabled);
$('audioBtn').addEventListener('click', () => {
  Sound.enabled = !Sound.enabled; store.set('pc_audio', Sound.enabled);
  $('audioBtn').setAttribute('aria-pressed', Sound.enabled);
  paintAudio();
  if (Sound.enabled) { Sound.unlock(); Sound.ding(); }
});

$('copyMail').addEventListener('click', () => {
  const txt = $('mail').textContent, btn = $('copyMail');
  const ok = () => { btn.textContent = t('copied'); Timers.after(() => { btn.textContent = t('copy'); }, 1600); };
  const fallback = () => { const r = document.createRange(); r.selectNodeContents($('mail')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
  try { navigator.clipboard.writeText(txt).then(ok, fallback); } catch (e) { fallback(); }
});

/* =================== BANK + LEVELS (shared service; modules ask it for their pool) =================== */
/* Reads the data from exercises.js (window.PC_BANK). Invalid items are skipped, never thrown on.
   Levels.pool(mode) -> { list: [{ item, i }], fallback }  (i = index in the full bank of that mode).
   When the chosen level has nothing in a mode, the pool falls back to ALL levels and `fallback` is true,
   so the module shows a friendly note instead of an empty screen. */
const PCB = (window.PC_BANK && typeof window.PC_BANK === 'object') ? window.PC_BANK : {};
const LEVELS = (Array.isArray(PCB.levels) && PCB.levels.length) ? PCB.levels.slice() : ['A1', 'A2', 'B1', 'B2', 'C1'];
const RAW = (PCB.langs && (PCB.langs[PCB.active] || PCB.langs[PRACTICE.code])) || {};   // alias-safe: 'fr-CA' still finds fr
const lvlOf = (x) => (x && LEVELS.indexOf(x.level) !== -1) ? x.level : 'B1';
const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
/* PROBLEMS[mode](item) -> '' when the item is usable, else a short reason (shown in the console, never on screen). */
const PROBLEMS = {
  sprint: (x) => !x ? 'empty' : !isStr(x.text) ? 'missing text' : !isStr(x.title) ? 'missing title' : '',
  improv: (x) => !x ? 'empty' : !isStr(x.text) ? 'missing text' : !(fin(x.goal) > 0) ? 'goal must be a number above 0' : '',
  connectors: (x) => !x ? 'empty' : !(isStr(x.fr) || isStr(x.word)) ? 'missing word (fr / word)' : !isStr(x.type) ? 'missing type' : '',
  reading: (x) => {
    if (!x) return 'empty';
    if (!isStr(x.text)) return 'missing text';
    if (!isStr(x.title)) return 'missing title';
    if (!Array.isArray(x.qs) || x.qs.length !== 3) return 'needs exactly 3 questions';
    for (let k = 0; k < 3; k++) {
      const q = x.qs[k];
      if (!q || !isStr(q.q)) return `question ${k + 1}: missing text`;
      if (!Array.isArray(q.o) || q.o.length !== 4 || !q.o.every(isStr)) return `question ${k + 1}: needs 4 options`;
      if (!Number.isInteger(q.a) || q.a < 0 || q.a > 3) return `question ${k + 1}: answer "a" must be 0, 1, 2 or 3`;
    }
    return '';
  }
};
/* Bank: each usable item gets a STABLE id (from exercises.js). Saved progress (pc_ex_id, pc_imp_last, pc_rd_last, `exId` in
   personal bests) points to the id, so adding or reordering items never sends the learner to the wrong exercise.
   A missing or repeated id still works (position-based id, flagged in the console) so a typo never blanks the screen. */
const Bank = {
  _c: {},
  list(mode) {
    if (Bank._c[mode]) return Bank._c[mode];
    const raw = Array.isArray(RAW[mode]) ? RAW[mode] : [], out = [], bad = [], noId = [], seen = new Set();
    raw.forEach((x, n) => {
      const why = quiet(() => (PROBLEMS[mode] ? PROBLEMS[mode](x) : ''), 'unreadable item');
      const tag = `#${n + 1}${x && isStr(x.id) ? ' ' + x.id : ''}`;
      if (why) { bad.push(`${tag} (${why})`); return; }
      if (mode === 'connectors') { out.push(isStr(x.fr) ? x : Object.assign({}, x, { fr: x.word })); return; }   // `fr` is the internal name of the word, whatever the language
      let id = isStr(x.id) ? x.id.trim() : '';
      if (!id || seen.has(id)) { noId.push(`${tag}${id ? ' (repeated id)' : ' (no id)'}`); id = `${PCB.active || 'xx'}_${mode}_pos${n + 1}`; }
      seen.add(id);
      out.push(id === x.id ? x : Object.assign({}, x, { id }));
    });
    quiet(() => {
      if (bad.length) console.warn(`[P&C] exercises.js · ${mode}: ${bad.length} item(s) skipped → ${bad.join('; ')}`);
      if (noId.length) console.warn(`[P&C] exercises.js · ${mode}: ${noId.length} item(s) without a unique id, using their position → ${noId.join('; ')}`);
    });
    return (Bank._c[mode] = out);
  },
  find(mode, id) { return typeof id === 'string' && id ? Bank.list(mode).findIndex(x => x.id === id) : -1; },   // -1 when unknown
  idAt(mode, i) { const x = Bank.list(mode)[i]; return x && x.id ? x.id : null; }
};
const Levels = {
  cur: (() => { const v = store.get('pc_level', 'all'); return v === 'all' || LEVELS.indexOf(v) !== -1 ? v : 'all'; })(),
  mode: null,
  set(v) { Levels.cur = (v === 'all' || LEVELS.indexOf(v) !== -1) ? v : 'all'; store.set('pc_level', Levels.cur); },
  label(code) { return code === 'all' ? t('lvlAll') : code === 'C1' ? t('lvlC1') : code; },       // C1 is shown as Advanced / Avanzado
  full(code) { return code === 'C1' ? 'C1 · ' + t('lvlC1') : code; },
  pool(mode) {
    const all = Bank.list(mode).map((item, i) => ({ item, i }));
    if (Levels.cur === 'all') return { list: all, fallback: false };
    const f = all.filter(x => lvlOf(x.item) === Levels.cur);
    return f.length ? { list: f, fallback: false } : { list: all, fallback: all.length > 0 };
  },
  next(mode, from) {                               // next absolute index inside the pool (wraps); first of the pool if `from` is not in it
    const P = Levels.pool(mode).list; if (!P.length) return 0;
    const pos = P.findIndex(x => x.i === from);
    return pos === -1 ? P[0].i : P[(pos + 1) % P.length].i;
  },
  keep(mode, from) { const P = Levels.pool(mode).list; if (!P.length) return 0; return P.some(x => x.i === from) ? from : P[0].i; },
  /* A pair with a teaching sense, fitted to the prompt: one connector to DEVELOP (add, explain, give a cause, sequence)
     + one to TURN or CLOSE (contrast, concede, consequence, conclusion; purpose in letters). Opinion prompts never get
     a sequence word; letters never get a concession. Level first, then the next levels up/down, then the whole bank. */
  PAIRS: {
    opinion: [['addition', 'reinforce', 'explain', 'cause', 'topic'], ['contrast', 'concession', 'consequence', 'conclusion']],
    letter: [['sequence', 'addition', 'cause', 'explain', 'reinforce'], ['consequence', 'conclusion', 'purpose', 'contrast']]
  },
  connectors(level, kind) {
    const all = Bank.list('connectors'), [DEV, TURN] = Levels.PAIRS[kind] || Levels.PAIRS.opinion;
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    const li = LEVELS.indexOf(level), lvIn = (c, f) => Array.isArray(c.lv) && c.lv.some(f);
    const tiers = [(c) => lvIn(c, (v) => v === level), (c) => li !== -1 && lvIn(c, (v) => Math.abs(LEVELS.indexOf(v) - li) <= 1 && LEVELS.indexOf(v) !== -1), () => true];
    for (const inTier of tiers) {
      const pool = all.filter(inTier), a = pool.filter(c => DEV.indexOf(c.type) !== -1), b = pool.filter(c => TURN.indexOf(c.type) !== -1);
      if (a.length && b.length) return [pick(a), pick(b)];
    }
    return Levels.anyPair(level);                  // old banks without these types: any two of different type
  },
  anyPair(level) {
    let pool = Bank.list('connectors').filter(c => Array.isArray(c.lv) && c.lv.indexOf(level) !== -1);
    if (new Set(pool.map(c => c.type)).size < 2) pool = Bank.list('connectors');
    if (new Set(pool.map(c => c.type)).size < 2) return [];
    const a = pool[Math.floor(Math.random() * pool.length)];
    let b; do { b = pool[Math.floor(Math.random() * pool.length)]; } while (b === a || b.type === a.type);
    return [a, b];
  },
  note(mode) {                                     // one polite line under the level bar; hidden when everything is fine
    if (mode !== undefined) Levels.mode = mode;
    const el = $('lvlNote'); if (!el) return;
    if (!Levels.mode) { el.hidden = true; el.textContent = ''; return; }
    const P = Levels.pool(Levels.mode);
    if (!P.list.length) { el.hidden = false; el.textContent = t('lvlNoBank'); }
    else if (P.fallback) { el.hidden = false; el.textContent = t('lvlFallback')(Levels.label(Levels.cur)); }
    else { el.hidden = true; el.textContent = ''; }
  },
  paint() {
    document.querySelectorAll('#levelBar .lvl').forEach(b => { const on = b.dataset.level === Levels.cur; b.setAttribute('aria-pressed', String(on)); b.classList.toggle('on', on); });
  }
};

/* =================== PRACTICE-LANGUAGE SELECTOR (FR · EN · ES), independent of the interface language (pc_lang) ===================
   Changing it: stops every clock, stores the choice (pc_plang), points PC_BANK.active at the new bank and reloads the page, so the sheet
   (character, key bar, accent rules, connectors), the bank and every module restart clean from one single source. It is locked while a run is in progress. */
const PLANG = {
  codes: ['fr', 'en', 'es'].filter(practiceReady),
  set(code) {
    if (busy || PLANG.codes.indexOf(code) === -1 || code === PRACTICE.code) return;
    Timers.clearAll();
    store.set('pc_plang', code);
    quiet(() => { PCB.active = code; });
    quiet(() => location.reload());
  },
  paint() {
    const bar = $('plangBar'); if (!bar) return;
    bar.hidden = PLANG.codes.length < 2;
    bar.querySelectorAll('[data-pcode]').forEach(b => {
      const c = b.dataset.pcode, s = PRACTICE_SHEETS[c], nm = s && s.name && s.name[lang];
      b.hidden = PLANG.codes.indexOf(c) === -1;
      b.setAttribute('aria-pressed', String(c === PRACTICE.code));
      if (nm) b.setAttribute('aria-label', nm);
    });
    const g = $('plangGroup'); if (g) g.setAttribute('aria-label', t('plangAria'));
  }
};
document.querySelectorAll('#plangBar [data-pcode]').forEach(b => b.addEventListener('click', () => PLANG.set(b.dataset.pcode)));

/* =================== MODULE I · TYPING SPRINT (isolated) =================== */
/* Owns: target text, phase, clock, error map, results, the accent bar, #mod1 DOM.
   Shares only services: Timers, Sound, Board, i18n (t), store. */
Modules[1] = (function TypingSprint() {
  const DURATION = 120, CRITICAL = 20, MAX_WPM = 130;
  const SP = () => Bank.list('sprint');
  let exIndex = (() => {                                  // saved by stable id; old saves (position only) still work
    const k = Bank.find('sprint', store.get('pc_ex_id', null)); if (k !== -1) return k;
    const old = PRACTICE.code === 'fr' ? store.get('pc_ex', 0) : 0; return Number.isInteger(old) && old >= 0 && SP().length ? old % SP().length : 0;
  })();
  exIndex = Levels.keep('sprint', exIndex);
  let target = '', spans = [];
  let phase = 'ready';           // ready | running | done
  let t0 = 0, timerId = null, lastSec = DURATION;
  let prev = '';
  let errors = new Map();        // mistakes: current aligned edits (key: target index * 2, +1 = extra char) + corrected ones ('f'+n) -> 'accent' | 'space' | 'other'
  let fixed = [], eraseCounted = false;   // kinds of mistakes the learner erased: one per erase streak, like before
  let hintCooldown = 0, mimeState = 'calm', lastSay = 'ready', suspect = false;
  const field = $('field');

  /* ----- coach mime (the only mime that reacts) ----- */
  $('mimeCoach').innerHTML = mimeSVG('c');
  function setMime(state) {
    mimeState = state;
    const m = document.querySelector('#mimeCoach .mime'); if (m) m.setAttribute('data-state', state);
  }
  function say(key, warn) {
    lastSay = key;
    const b = $('bubble');
    b.textContent = I18N[lang].say[key] || '';
    b.classList.toggle('warn', !!warn);
  }

  /* ----- text ----- */
  const norm = (s) => String(s == null ? '' : s).replace(/[’‘ʼ]/g, "'").replace(/[   ]/g, ' ').replace(/\n/g, ' ');
  function loadExercise(i) {
    const n = SP().length, src = $('source'); src.innerHTML = ''; spans = [];
    if (!n) {                                         // no bank at all: friendly notice, field stays locked
      target = ''; src.textContent = t('lvlNoBank'); $('srcTitle').textContent = '—'; $('srcMeta').textContent = '';
      reset(); Levels.note('sprint'); return;
    }
    exIndex = ((i % n) + n) % n; store.set('pc_ex_id', Bank.idAt('sprint', exIndex));
    target = SP()[exIndex].text;
    const frag = document.createDocumentFragment();
    for (const ch of target) { const s = document.createElement('span'); s.textContent = ch; s.className = 'p'; frag.appendChild(s); spans.push(s); }
    src.appendChild(frag); src.scrollTop = 0;
    renderMeta();
    reset();
    Levels.note('sprint');
  }
  function renderMeta() {
    if (!target) return;
    const ex = SP()[exIndex], P = Levels.pool('sprint').list, pos = Math.max(0, P.findIndex(x => x.i === exIndex));
    $('srcTitle').textContent = `${ex.theme || ''} · ${ex.title}`;
    $('srcMeta').textContent = `${target.split(/\s+/).filter(w => /[\p{L}\d]/u.test(w)).length} ${t('words')} · ${lvlOf(ex)} · ${pos + 1}/${P.length}`;
  }
  function renderText(v) {
    const al = align(v);
    for (let j = 0; j < spans.length; j++) { const cls = clsFor(j, al); if (spans[j].className !== cls) spans[j].className = cls; }
    renderStrip(al);
    const cur = spans[Math.min(al.end, spans.length - 1)];
    if (cur) {
      const src = $('source'), top = cur.offsetTop - src.offsetTop;
      if (top < src.scrollTop + 8 || top > src.scrollTop + src.clientHeight - 48) src.scrollTop = Math.max(0, top - src.clientHeight / 3);
    }
  }

  /* ----- tolerant alignment -----
     The typed text is aligned with the model by a banded edit distance (free end: the part not typed yet costs nothing).
     An omitted, inserted or wrong character is ONE localized edit, so the rest of the text realigns with its real position
     instead of turning red from that point on. Cached per typed value, so stats, colors and the strip share one pass. */
  const BAND = 40;
  let alKey = null, alVal = null;
  const eqc = PRACTICE.apos ? (a, b) => a === b || (/[’‘ʼ']/.test(a) && /[’‘ʼ']/.test(b)) : (a, b) => a === b;   // english: every apostrophe form is the same character
  function omissionKind(j, T) { return T[j] === ' ' && DOUBLE_PUNCT.includes(T[j + 1] || '') ? 'space' : 'other'; }
  /* Quebec typography (pc_qc): the space before ? ! : ; is optional, so skipping it costs nothing and is never marked.
     Default (France): a missing space there is a typography NOTICE ('space'); it is shown but does not lower accuracy. */
  let qc = PRACTICE.regionalTypo === 'qc' && store.get('pc_qc', false) === true;   // toggle exists only where the sheet offers it
  const optSpace = (j, T) => qc && omissionKind(j, T) === 'space';
  function positional(V, T) {                        // fallback, only if the alignment band cannot be used
    const m = T.length, st = new Uint8Array(m), edits = []; let correct = 0;
    for (let i = 0; i < V.length; i++) {
      if (i >= m) { edits.push({ ti: m, ins: true, kind: 'other' }); continue; }
      if (eqc(V[i], T[i])) { st[i] = 1; correct++; } else { st[i] = 2; edits.push({ ti: i, ins: false, kind: classify(i, V[i], T) }); }
    }
    return { end: Math.min(V.length, m), correct, edits, st, ins: new Set() };
  }
  function align(v) {
    if (alVal && alKey === v) return alVal;
    const T = [...target], V = [...(v || '')], n = V.length, m = T.length, W = BAND, w = 2 * W + 1, INF = 65000;
    let out = null;
    try {
      const D = new Uint16Array((n + 1) * w).fill(INF);
      const at = (i, j) => { const d = j - i + W; return (j < 0 || j > m || d < 0 || d >= w) ? -1 : i * w + d; };
      for (let j = 0, c = 0; j <= Math.min(m, W); j++) { D[at(0, j)] = c; if (j < m) c += optSpace(j, T) ? 0 : 1; }
      for (let i = 1; i <= n; i++) {
        const lo = Math.max(0, i - W), hi = Math.min(m, i + W);
        for (let j = lo; j <= hi; j++) {
          let best = INF, k;
          if (j > 0 && (k = at(i - 1, j - 1)) >= 0 && D[k] < INF) best = Math.min(best, D[k] + (eqc(V[i - 1], T[j - 1]) ? 0 : 1));
          if ((k = at(i - 1, j)) >= 0 && D[k] < INF) best = Math.min(best, D[k] + 1);           // extra typed char
          if (j > 0 && (k = at(i, j - 1)) >= 0 && D[k] < INF) best = Math.min(best, D[k] + (optSpace(j - 1, T) ? 0 : 1));  // skipped model char (optional space: free)
          D[at(i, j)] = best;
        }
      }
      let end = -1, cost = INF;
      for (let j = Math.max(0, n - W); j <= Math.min(m, n + W); j++) {
        const k = at(n, j); if (k < 0) continue;
        if (D[k] < cost || (D[k] === cost && Math.abs(j - n) <= Math.abs(end - n))) { cost = D[k]; end = j; }
      }
      if (end >= 0 && cost < INF) {
        const st = new Uint8Array(m), ins = new Set(), edits = []; let correct = 0, i = n, j = end, guard = n + m + 2, k;
        while ((i > 0 || j > 0) && guard-- > 0) {
          const cur = D[at(i, j)];
          if (i > 0 && j > 0 && (k = at(i - 1, j - 1)) >= 0 && D[k] + (eqc(V[i - 1], T[j - 1]) ? 0 : 1) === cur) {
            if (eqc(V[i - 1], T[j - 1])) { st[j - 1] = 1; correct++; } else { st[j - 1] = 2; edits.push({ ti: j - 1, ins: false, kind: classify(j - 1, V[i - 1], T) }); }
            i--; j--;
          } else if (i > 0 && (k = at(i - 1, j)) >= 0 && D[k] + 1 === cur) { ins.add(j); edits.push({ ti: j, ins: true, kind: 'other' }); i--; }
          else if (j > 0 && optSpace(j - 1, T) && (k = at(i, j - 1)) >= 0 && D[k] === cur) { st[j - 1] = 3; j--; }   // optional space left out: fine
          else if (j > 0 && (k = at(i, j - 1)) >= 0 && D[k] + 1 === cur) { st[j - 1] = 2; edits.push({ ti: j - 1, ins: false, kind: omissionKind(j - 1, T) }); j--; }
          else break;
        }
        out = { end, correct, edits, st, ins };
      }
    } catch (e) { out = null; }
    alKey = v; alVal = out || positional(V, T);
    return alVal;
  }
  function clsFor(j, al) {
    let cls = j < al.end ? (al.st[j] === 1 || al.st[j] === 3 ? 'o' : 'x') : 'p';
    if (al.ins.has(j)) cls += ' i';
    if (j === al.end && phase !== 'done') cls += ' c';
    return cls;
  }

  /* ----- compact live strip: the segment around the cursor, pinned while the keyboard is open ----- */
  const strip = $('liveStrip'), SEG_BEFORE = 14, SEG_LEN = 70;
  function renderStrip(al) {
    const box = $('lsText'); if (!box) return;
    const T = [...target]; box.textContent = '';
    if (!T.length) return;
    let a = Math.max(0, al.end - SEG_BEFORE), steps = 0;
    while (a > 0 && T[a - 1] !== ' ' && steps++ < 16) a--;          // start on a word boundary
    const b = Math.min(T.length, a + SEG_LEN), frag = document.createDocumentFragment();
    const add = (txt, cls) => { const s = document.createElement('span'); s.textContent = txt; s.className = cls; frag.appendChild(s); };
    if (a > 0) add('… ', 'gap');
    for (let j = a; j < b; j++) add(T[j], clsFor(j, al));
    if (b < T.length) add(' …', 'gap');
    box.appendChild(frag);
  }

  /* ----- scoring (all divisions guarded) ----- */
  function classify(i, typed, tchars) {
    const want = tchars[i];
    if (BASE[want] && BASE[want] === typed) return 'accent';
    if (want === ' ' && DOUBLE_PUNCT.includes(tchars[i + 1] || '') && typed === tchars[i + 1]) return 'space';
    return 'other';
  }
  function compute(v) {
    const tchars = [...target], vchars = [...(v || '')], al = align(v || '');
    const correct = fin(al.correct);                                   // aligned matches: one slip no longer cascades
    const elapsed = phase === 'ready' ? 0 : Math.min(DURATION, Math.max(0, fin((performance.now() - t0) / 1000)));
    const minutes = Math.max(elapsed, 1) / 60;                       // never divides by 0
    const wpm = fin(elapsed < 2 ? 0 : (correct / 5) / minutes);      // too little time -> 0, not Infinity
    let nErr = 0; errors.forEach(k => { if (k !== 'space') nErr++; });   // the space notice never lowers accuracy
    const denom = correct + nErr;
    const acc = denom === 0 ? 100 : Math.min(100, Math.max(0, fin((correct / denom) * 100)));   // nothing typed -> 100
    const score = fin(wpm * Math.pow(acc / 100, 2));
    let a = 0, s = 0, o = 0; errors.forEach(k => { if (k === 'accent') a++; else if (k === 'space') s++; else o++; });
    return { wpm, acc, score, correct, typed: vchars.length, reached: Math.min(al.end, tchars.length), total: tchars.length, elapsed, nAccent: a, nSpace: s, nOther: o, qc };
  }
  function paintStats(r) {
    $('sWpm').textContent = Math.round(r.wpm);
    $('sAcc').textContent = Math.round(r.acc);
    $('sScore').textContent = Math.round(r.score);
    $('nAccent').textContent = r.nAccent; $('nSpace').textContent = r.nSpace; $('nOther').textContent = r.nOther;
    $('cAccent').classList.toggle('hot', r.nAccent > 0);
    $('cSpace').classList.toggle('soft', r.nSpace > 0);
  }

  /* ----- clock (driven by Timers) ----- */
  const fmt = (sec) => { const s = Math.max(0, Math.ceil(fin(sec))); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  function setCritical(on) {
    $('clock').classList.toggle('critical', on); $('lsClock').classList.toggle('critical', on);
    $('timebar').classList.toggle('critical', on);
    $('mod1').classList.toggle('critical', on);
  }
  function tick() {
    if (phase !== 'running') { if (timerId !== null) { Timers.stop(timerId); timerId = null; } return; }
    const rem = DURATION - fin((performance.now() - t0) / 1000);
    $('clock').textContent = fmt(rem); $('lsClock').textContent = fmt(rem);
    $('timefill').style.transform = `scaleX(${Math.min(1, Math.max(0, rem / DURATION))})`;
    const sec = Math.ceil(rem);
    if (sec !== lastSec) {
      lastSec = sec;
      if (sec <= CRITICAL && sec > 0) {
        Sound.tick(sec % 2);
        if (mimeState !== 'critical') { setMime('critical'); setCritical(true); say('critical', true); }
      }
      paintStats(compute(prev));
    }
    if (rem <= 0) finish('time');
  }

  /* ----- lifecycle ----- */
  function reset() {
    if (timerId !== null) { Timers.stop(timerId); timerId = null; }
    phase = 'ready'; prev = ''; errors = new Map(); fixed = []; eraseCounted = false; lastSec = DURATION; suspect = false; setBusy(false);
    alKey = null; alVal = null; $('lsClock').textContent = fmt(DURATION); $('lsClock').classList.remove('critical');
    strip.classList.remove('active'); $('mod1').classList.remove('kb');
    field.value = ''; field.readOnly = false; field.disabled = false;
    field.maxLength = [...target].length + 15;
    if (!target) { field.readOnly = true; field.placeholder = ''; }
    $('clock').textContent = fmt(DURATION); $('timefill').style.transform = 'scaleX(1)';
    setCritical(false); setMime('calm'); say('ready');
    accents.setDisabled(false);
    $('startBtn').hidden = false;
    renderText(''); paintStats(compute('')); paintQc();
  }
  function begin() {
    phase = 'running'; t0 = performance.now(); lastSec = DURATION + 1; setBusy(true);
    setMime('typing'); say('typing');
    Sound.ding();
    $('startBtn').hidden = true; paintQc();
    timerId = Timers.every(tick, 150);
  }
  function finish(reason) {
    if (phase !== 'running') return;
    if (timerId !== null) { Timers.stop(timerId); timerId = null; }
    const r = compute(prev);
    phase = 'done';
    field.readOnly = true; field.blur();
    accents.setDisabled(true);
    setCritical(false);
    if (reason === 'time') { $('clock').textContent = '0:00'; $('lsClock').textContent = '0:00'; $('timefill').style.transform = 'scaleX(0)'; Sound.alarm(); }
    else Sound.ding();
    strip.classList.remove('active'); $('mod1').classList.remove('kb');
    renderText(prev); paintStats(r); paintQc();

    r.flagged = r.wpm > MAX_WPM; r.reason = reason; r.rank = 0; r.suspect = suspect;
    r.why = LB.check({ typed: r.typed, score: r.score, wpm: r.wpm, acc: r.acc, elapsed: r.elapsed, suspect });   // null = rankable
    if (!r.why || r.why === 'acc') r.rank = Board.save({ score: Math.round(r.score * 10) / 10, wpm: Math.round(r.wpm), acc: Math.round(r.acc), exId: Bank.idAt('sprint', exIndex), lvl: lvlOf(SP()[exIndex]) });
    if (r.flagged) { setMime('calm'); say('flagged', true); }
    else if (r.typed === 0) { setMime('calm'); say('empty'); }
    else if (r.rank === 1) { setMime('victory'); say('record'); }
    else if (r.rank > 0) { setMime('victory'); say('victory'); }
    else { setMime('calm'); say(reason === 'time' ? 'plain' : 'done'); }
    r.at = new Date().toISOString(); r.title = SP()[exIndex].title; r.level = lvlOf(SP()[exIndex]);
    setBusy(false); Results.show(1, r);
  }

  /* ----- input (paste blocked, typing tracked) ----- */
  function blockPaste(e) { e.preventDefault(); say('paste', true); }
  field.addEventListener('paste', blockPaste);
  field.addEventListener('drop', blockPaste);
  field.addEventListener('dragover', (e) => e.preventDefault());
  field.addEventListener('cut', (e) => e.preventDefault());
  field.addEventListener('beforeinput', (e) => {
    if (phase === 'done') { e.preventDefault(); return; }
    const it = e.inputType || '';
    if (it === 'insertFromPaste' || it === 'insertFromDrop' || it === 'insertFromYank' || it === 'insertFromPasteAsQuotation') { blockPaste(e); return; }
    if (it === 'insertLineBreak' || it === 'insertParagraph') e.preventDefault();
  });
  field.addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });

  function onInput() {
    if (phase === 'done') return;
    const v = norm(field.value);
    if (phase === 'ready') { if (!v.length) return; begin(); }
    const tchars = [...target], vchars = [...v], pchars = [...prev];
    const keyOf = (e) => e.ti * 2 + (e.ins ? 1 : 0);
    const before = align(prev), had = new Map(before.edits.map(e => [keyOf(e), e.kind]));
    const al = align(v), cur = new Map(al.edits.map(e => [keyOf(e), e.kind]));
    // Erasing a mistake still counts it once (one per erase streak, same leniency as before); typing forward never double-counts.
    if (vchars.length < pchars.length) {
      const gone = [...had.keys()].filter(k => !cur.has(k)).sort((x, y) => x - y);
      if (gone.length && !eraseCounted) { fixed.push(had.get(gone[0])); eraseCounted = true; }
    } else if (vchars.length > pchars.length) eraseCounted = false;
    // Each wrong, skipped or extra character is one error at its real place in the model text; the rest realigns.
    errors = new Map(cur); fixed.forEach((kind, n) => errors.set('f' + n, kind));
    let hint = null;
    cur.forEach((kind, k) => { if (!had.has(k) && kind !== 'other') hint = kind; });
    if (vchars.length - pchars.length > 40) suspect = true;     // one input event adding a whole sentence = not typing
    prev = v;
    renderText(v);
    paintStats(compute(v));
    const now = performance.now();
    if (hint && mimeState !== 'critical' && now > hintCooldown) { say(hint, true); hintCooldown = now + 2500; }
    else if (!hint && mimeState === 'typing' && $('bubble').classList.contains('warn') && now > hintCooldown) say('typing');
    // Done when the text is exact, or when the last model character has been reached with a match (even after a slip earlier).
    if (v === target || (tchars.length && al.end === tchars.length && al.st[tchars.length - 1] === 1)) finish('complete');
  }
  field.addEventListener('input', onInput);
  const kbMode = () => quiet(() => window.matchMedia('(pointer: coarse), (max-width: 820px)').matches, false);
  field.addEventListener('focus', () => {
    if (phase !== 'done') { strip.classList.add('active'); $('mod1').classList.toggle('kb', kbMode()); }
    if (window.matchMedia('(pointer: coarse)').matches) Timers.after(() => field.scrollIntoView({ block: 'center', behavior: 'smooth' }), 320);
  });
  // No layout change on blur (a tap below the field must not move under the finger); the strip and compact text
  // are cleared on reset / finish instead.
  // Virtual keyboard opening/closing resizes the visual viewport: keep the field in view (the strip stays pinned on top).
  let vvTimer = null;
  quiet(() => window.visualViewport && window.visualViewport.addEventListener('resize', () => {
    if (document.activeElement !== field || phase === 'done' || $('mod1').hidden) return;
    if (vvTimer !== null) Timers.stop(vvTimer);
    vvTimer = Timers.after(() => { vvTimer = null; quiet(() => field.scrollIntoView({ block: 'center', behavior: 'auto' })); }, 120);
  }));

  /* ----- French accent bar (shared service) ----- */
  const accents = Accents($('accents'), () => field, () => phase !== 'done');

  /* ----- buttons ----- */
  function paintQc() {
    quiet(() => { const hideA = !Object.keys(BASE).length, hideS = !DOUBLE_PUNCT; [['cAccent', hideA], ['cSpace', hideS]].forEach(([id, h]) => { const c = $(id); if (c) { c.hidden = h; c.style.display = h ? 'none' : ''; } }); });   // chips for marks this language does not have
    const b = $('qcBtn'); if (!b) return;
    if (PRACTICE.regionalTypo !== 'qc') { b.hidden = true; return; }
    b.classList.toggle('on', qc); b.setAttribute('aria-pressed', String(qc));
    b.title = t(qc ? 'qcHint' : 'qcOffHint'); b.disabled = phase === 'running';
    $('qcLabel').textContent = t('qcLabel');
    const sl = $('cSpace') && $('cSpace').querySelector('[data-i18n]'); if (sl) sl.textContent = t(qc ? 'eSpaceQc' : 'eSpace');
  }
  quiet(() => $('qcBtn').addEventListener('click', () => {
    if (phase === 'running') return;
    qc = !qc; store.set('pc_qc', qc); alKey = null; alVal = null; paintQc();
    if (phase === 'ready') { renderText(prev); paintStats(compute(prev)); }
  }));
  $('startBtn').addEventListener('click', () => { Sound.unlock(); field.focus(); });
  $('restartBtn').addEventListener('click', () => { reset(); field.focus(); });
  $('nextBtn').addEventListener('click', () => loadExercise(Levels.next('sprint', exIndex)));

  loadExercise(exIndex);

  return {
    mount() { reset(); Levels.note('sprint'); },
    unmount() { reset(); },                          // stops the clock and clears the run
    onLang() {
      field.placeholder = target ? t('placeholder') : '';
      say(lastSay, $('bubble').classList.contains('warn'));
      renderMeta(); paintQc();
    },
    retry() { reset(); },
    next() { loadExercise(Levels.next('sprint', exIndex)); },
    onLevel() { loadExercise(Levels.keep('sprint', exIndex)); }
  };
})();

/* =================== MODULE II · IMPROVISATION (isolated) =================== */
/* Owns: #mod2, scenario + connectors, the two phases, its clock, its coach mime.
   Shares only services: Timers, Sound, Accents, Coach, i18n (t / lang). */
Modules[2] = (function Improv() {
  const PLAN = 60, WRITE = 240, CRITICAL = 20;
  const root = $('mod2');
  root.innerHTML = `
    <div class="eyebrow" data-i18n="m2eyebrow"></div>
    <h1 class="h-serif" style="font-size:1.55rem;margin:2px 0 0" data-i18n="m2title"></h1>
    <p class="intro work" data-i18n="m2intro"></p>
    <div class="stickybar">${coachHTML('m2')}
      <div class="chips mt-3"><span class="chip" id="m2ph1" data-i18n="m2phasePlan"></span><span class="chip" id="m2ph2" data-i18n="m2phaseWrite"></span><span class="chip" id="m2ph3" data-i18n="m2phaseDone"></span></div></div>
    <div id="m2pre" class="work flex flex-wrap items-center gap-3 mt-4">
      <button type="button" class="btn quill" id="m2startBtn" data-i18n="m2start"></button>
      <span class="pre-note" data-i18n="m2preNote"></span></div>
    <div id="m2body" class="work" hidden>
      <div class="eyebrow mt-4 flex items-center gap-2"><span data-i18n="m2scenarioLabel"></span><span class="chip lvl" id="m2lvl"></span></div>
      <div class="prompt mt-2" id="m2prompt" lang="${PL}"></div>
      <div class="eyebrow mt-4" data-i18n="m2connLabel"></div>
      <div class="chips mt-2" id="m2conns"></div>
      <p class="conn-ex" id="m2connEx" aria-live="polite" hidden></p>
      <div class="flex items-center justify-between gap-2 mt-4 mb-2" data-keyrow><div class="eyebrow" data-i18n="keysLabel"></div><div class="eyebrow" style="text-transform:none;letter-spacing:0;font-weight:500" data-i18n="keysHint"></div></div>
      <div class="accents" id="m2accents"></div>
      <div class="eyebrow mt-4" id="m2notesLabel"></div>
      <textarea id="m2notes" class="field mt-2" lang="${PL}" rows="3" maxlength="600" ${NOASSIST}></textarea>
      <div id="m2writeBox" hidden>
        <div class="flex items-center justify-between gap-2 mt-4"><div class="eyebrow" data-i18n="m2editorLabel"></div><span class="chip" id="m2count">0</span></div>
        <textarea id="m2editor" class="field mt-2" lang="${PL}" rows="8" maxlength="3000" style="min-height:200px" ${NOASSIST}></textarea>
      </div>
      <div class="flex flex-wrap gap-2 mt-3">
        <button type="button" class="btn quill" id="m2skipBtn" data-i18n="m2skip"></button>
        <button type="button" class="btn quill" id="m2finishBtn" data-i18n="m2finish" hidden></button>
        <button type="button" class="btn alt" id="m2restartBtn" data-i18n="restart"></button>
      </div>
    </div>`;
  const coach = Coach('m2', 'say2', 'mod2');
  const notes = $('m2notes'), editor = $('m2editor');
  const accents = Accents($('m2accents'), () => (phase === 'plan' ? notes : editor), () => phase === 'plan' || phase === 'write');

  let phase = 'ready';            // ready | plan | write | done
  let scenario = null, conns = [], seen = [], lastId = store.get('pc_imp_last', null), exOpen = -1;   // lastId: stable id of the last scenario (not repeated next)   // exOpen: chip whose one-line example is shown
  let phaseT0 = 0, dur = PLAN, timerId = null, lastSec = PLAN, firstKeyAt = null, lastRes = null;

  /* ----- text utilities ----- */
  const countWords = (s) => (String(s || '').match(/[\p{L}\p{N}][\p{L}\p{N}'’\-]*/gu) || []).length;
  const detect = (text, c) => ConnMatch.detect(text, c);   // whole words, accent-insensitive; ambiguous words only in a connector position

  /* ----- scenario ----- */
  function loadScenario() {
    const P = Levels.pool('improv').list;
    if (!P.length) {                                  // no bank at all: friendly notice, start is disabled in reset()
      scenario = null; conns = []; seen = [false, false]; $('m2prompt').textContent = t('lvlNoBank'); $('m2lvl').textContent = '';
      renderConns(''); Levels.note('improv'); return;
    }
    let k, guard = 0; do { k = Math.floor(Math.random() * P.length); } while (P.length > 1 && P[k].item.id === lastId && guard++ < 50);
    scenario = P[k].item; lastId = scenario.id || null; store.set('pc_imp_last', lastId);
    conns = Levels.connectors(lvlOf(scenario), scenario.kind); seen = [false, false]; exOpen = -1;
    $('m2prompt').textContent = scenario.text; $('m2lvl').textContent = Levels.full(lvlOf(scenario));
    renderConns(editor.value);
    Levels.note('improv');
  }
  function renderConns(v) {
    const box = $('m2conns'); box.innerHTML = '';
    conns.forEach((c, i) => {
      const d = detect(v, c), chip = document.createElement('button');
      chip.type = 'button'; chip.dataset.i = i;
      chip.className = 'chip conn' + (d.found ? ' ok' : '') + (exOpen === i ? ' open' : '');
      chip.setAttribute('aria-expanded', String(exOpen === i)); chip.setAttribute('aria-controls', 'm2connEx');
      chip.title = t('m2exHint');
      chip.innerHTML = `<span class="tick">${d.found ? '✓' : '○'}</span> <b lang="${PL}"></b> <small></small>`;
      chip.querySelector('b').textContent = c.fr; chip.querySelector('small').textContent = '· ' + c[lang];
      // keep the tablet keyboard open while writing (same guard as the French keys)
      ['pointerdown', 'mousedown', 'touchstart'].forEach(ev => chip.addEventListener(ev, (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false }));
      chip.addEventListener('touchend', (e) => { if (e.cancelable) { e.preventDefault(); chip.click(); } }, { passive: false });
      chip.addEventListener('click', () => { exOpen = exOpen === i ? -1 : i; renderConns(editor.value); });
      box.appendChild(chip);
    });
    const ex = $('m2connEx'), c = conns[exOpen];
    if (c && c.ex) {
      ex.innerHTML = `<span class="k"></span> <span class="s" lang="${PL}"></span>`;
      ex.querySelector('.k').textContent = `${t('m2exLabel')} · ${c.fr}:`; ex.querySelector('.s').textContent = c.ex;
      ex.hidden = false;
    } else { ex.hidden = true; ex.textContent = ''; }
  }
  function setLabels() {
    $('m2notesLabel').textContent = t(phase === 'plan' || phase === 'ready' ? 'm2notesLabel' : 'm2notesLocked');
    $('m2skipBtn').hidden = phase !== 'plan'; $('m2finishBtn').hidden = phase !== 'write';
    $('m2restartBtn').hidden = phase === 'done';
    $('m2ph1').classList.toggle('on', phase === 'plan'); $('m2ph2').classList.toggle('on', phase === 'write'); $('m2ph3').classList.toggle('on', phase === 'done');
    coach.label(t(phase === 'write' ? 'm2phaseWriteShort' : phase === 'done' ? 'm2phaseDone' : 'm2phasePlanShort'));
    notes.placeholder = t('m2notesPh'); editor.placeholder = t('m2editorPh');
    $('m2count').textContent = `${countWords(editor.value)} / ${scenario ? scenario.goal : 0}`;
    $('m2count').classList.toggle('ok', !!scenario && countWords(editor.value) >= scenario.goal);
  }

  /* ----- clock (Timers) ----- */
  function stopTimer() { if (timerId !== null) { Timers.stop(timerId); timerId = null; } }
  function tick() {
    if (phase !== 'plan' && phase !== 'write') { stopTimer(); return; }
    const rem = dur - fin((performance.now() - phaseT0) / 1000);
    coach.clock(rem); coach.bar(rem / dur);
    const sec = Math.ceil(rem);
    if (sec !== lastSec) {
      lastSec = sec;
      if (sec <= CRITICAL && sec > 0) {
        Sound.tick(sec % 2);
        if (coach.state !== 'critical') { coach.mime('critical'); coach.critical(true); coach.say('critical', true); }
      }
    }
    if (rem <= 0) { if (phase === 'plan') toWrite('time'); else finish('time'); }
  }

  /* ----- lifecycle ----- */
  function reset() {
    stopTimer();
    phase = 'ready'; firstKeyAt = null; lastRes = null; seen = [false, false]; lastSec = PLAN;
    notes.value = ''; editor.value = ''; notes.readOnly = false; editor.readOnly = false;
    $('m2pre').hidden = false; $('m2body').hidden = true; $('m2writeBox').hidden = true; setBusy(false);
    coach.critical(false); coach.mime('calm'); coach.say('ready'); coach.clock(PLAN); coach.bar(1);
    accents.setDisabled(true); renderConns(''); setLabels();
    $('m2startBtn').disabled = !scenario || conns.length < 2;
  }
  function start() {
    if (!scenario || conns.length < 2) return;
    Sound.unlock(); Sound.ding(); setBusy(true);
    phase = 'plan'; dur = PLAN; phaseT0 = performance.now(); lastSec = PLAN + 1;
    $('m2pre').hidden = true; $('m2body').hidden = false;
    accents.setDisabled(false); coach.mime('typing'); coach.say('plan'); setLabels();
    timerId = Timers.every(tick, 150);
    notes.focus({ preventScroll: true });
  }
  function toWrite(reason) {
    if (phase !== 'plan') return;
    stopTimer();
    phase = 'write'; dur = WRITE; phaseT0 = performance.now(); lastSec = WRITE + 1; firstKeyAt = null;
    notes.readOnly = true; $('m2writeBox').hidden = false;
    Sound.ding();
    coach.critical(false); coach.mime('typing'); coach.say(reason === 'time' ? 'locked' : 'write');
    coach.clock(WRITE); coach.bar(1); setLabels();
    timerId = Timers.every(tick, 150);
    editor.focus({ preventScroll: true });
    editor.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function finish(reason) {
    if (phase !== 'write') return;
    stopTimer();
    const now = performance.now(), v = editor.value;
    phase = 'done'; editor.readOnly = true; notes.readOnly = true; editor.blur(); accents.setDisabled(true);
    coach.critical(false);
    if (reason === 'time') { coach.clock(0); coach.bar(0); Sound.alarm(); } else Sound.ding();
    const words = countWords(v), det = conns.map(c => detect(v, c));
    lastRes = { words, goal: scenario.goal, det, conns: conns.slice(), reason, level: lvlOf(scenario), text: String(v || '').slice(0, 3000),
                react: firstKeyAt === null ? null : Math.max(0, (firstKeyAt - phaseT0) / 1000),
                secs: Math.min(WRITE, Math.max(0, fin((now - phaseT0) / 1000))) };
    const win = words >= scenario.goal && det.every(d => d.found);
    if (words === 0) { coach.mime('calm'); coach.say('empty'); }
    else if (win) { coach.mime('victory'); coach.say('win'); }
    else { coach.mime('calm'); coach.say(reason === 'time' ? 'timeup' : 'close'); }
    setBusy(false); setLabels(); Results.show(2, lastRes);
  }
  /* ----- input ----- */
  function blockPaste(e) { e.preventDefault(); coach.say('paste', true); }
  [notes, editor].forEach(f => {
    f.addEventListener('paste', blockPaste); f.addEventListener('drop', blockPaste); f.addEventListener('dragover', (e) => e.preventDefault());
    f.addEventListener('cut', (e) => e.preventDefault());
    f.addEventListener('beforeinput', (e) => {
      if (f.readOnly) { e.preventDefault(); return; }
      const it = e.inputType || '';
      if (it === 'insertFromPaste' || it === 'insertFromDrop' || it === 'insertFromYank' || it === 'insertFromPasteAsQuotation') blockPaste(e);
    });
  });
  editor.addEventListener('input', () => {
    if (phase !== 'write') return;
    const v = editor.value;
    if (firstKeyAt === null && v.length) firstKeyAt = performance.now();
    renderConns(v); setLabels();
    conns.forEach((c, i) => { const f = detect(v, c).found; if (f && !seen[i]) { seen[i] = true; if (coach.state !== 'critical') coach.say('found'); } if (!f) seen[i] = false; });
  });
  editor.addEventListener('focus', () => { if (window.matchMedia('(pointer: coarse)').matches) Timers.after(() => editor.scrollIntoView({ block: 'center', behavior: 'smooth' }), 320); });

  $('m2startBtn').addEventListener('click', start);
  $('m2skipBtn').addEventListener('click', () => toWrite('skip'));
  $('m2finishBtn').addEventListener('click', () => finish('manual'));
  $('m2restartBtn').addEventListener('click', reset);

  loadScenario(); reset();
  return {
    mount() { reset(); Levels.note('improv'); },
    unmount() { reset(); },
    retry() { reset(); },
    next() { loadScenario(); reset(); },
    onLevel() { loadScenario(); reset(); },
    onLang() { coach.refresh(); renderConns(editor.value); setLabels(); if (scenario) $('m2lvl').textContent = Levels.full(lvlOf(scenario)); else $('m2prompt').textContent = t('lvlNoBank'); }
  };
})();

/* =================== MODULE III · SPEED READING (isolated) =================== */
/* Owns: #mod3, current text/answers, its 3-minute clock, its coach mime. Layout is CSS (.split): side by side on wide
   screens, stacked on tablets/phones, with a sticky clock so it stays visible while scrolling. */
Modules[3] = (function Reading() {
  const DURATION = 180, CRITICAL = 20, LETTERS = ['A', 'B', 'C', 'D'];
  const root = $('mod3');
  root.innerHTML = `
    <div class="eyebrow" data-i18n="m3eyebrow"></div>
    <h1 class="h-serif" style="font-size:1.55rem;margin:2px 0 0" data-i18n="m3title"></h1>
    <p class="intro work" data-i18n="m3intro"></p>
    <div class="stickybar">${coachHTML('m3')}
      <div class="chips mt-3"><span class="chip on" id="m3answered"></span></div></div>
    <div id="m3pre" class="work flex flex-wrap items-center gap-3 mt-4">
      <button type="button" class="btn quill" id="m3startBtn" data-i18n="m3start"></button>
      <span class="pre-note" data-i18n="m3preNote"></span></div>
    <div id="m3body" hidden class="work mt-4">
      <div class="split">
        <article class="readbox"><div class="source-title" id="m3tag"></div><h2 class="h-serif" id="m3textTitle" style="font-size:1.2rem;margin:2px 0 8px"></h2>
          <div class="source readtext" id="m3text" lang="${PL}"></div></article>
        <div id="m3qs"></div>
      </div>
      <div class="flex flex-wrap gap-2 mt-4">
        <button type="button" class="btn quill" id="m3submitBtn" data-i18n="m3submit"></button>
        <button type="button" class="btn alt" id="m3restartBtn" data-i18n="restart"></button>
      </div>
    </div>`;
  const coach = Coach('m3', 'say3', 'mod3');
  let phase = 'ready';            // ready | running | done
  const RD = () => Bank.list('reading');
  let idx = 0, item = null;
  {                                               // first text: random inside the level, never the one read last time (stable id)
    const P0 = Levels.pool('reading').list, last = store.get('pc_rd_last', null), P1 = P0.length > 1 ? P0.filter(x => x.item.id !== last) : P0;
    idx = P1.length ? P1[Math.floor(Math.random() * P1.length)].i : 0;
  }
  let answers = [null, null, null], t0 = 0, timerId = null, lastSec = DURATION, lastRes = null;
  /* Shuffled options: shown[qi] = { o: options in the order shown, a: position of the right one in that order }.
     The bank keeps its original order and its own `a`; only this map is used to grade and to correct, so A/B/C/D
     never leak the answer and the correction always matches what the learner saw. */
  let shown = [], prevRight = null;
  function shuffleQ(q, avoid) {
    let order = [0, 1, 2, 3], tries = 0;
    do {
      for (let k = order.length - 1; k > 0; k--) { const r = Math.floor(Math.random() * (k + 1)); const tmp = order[k]; order[k] = order[r]; order[r] = tmp; }
    } while (avoid !== null && avoid !== undefined && order.indexOf(q.a) === avoid && tries++ < 12);   // a repeated text: the right answer moves
    return { o: order.map(k => q.o[k]), a: order.indexOf(q.a) };
  }

  function renderItem() {
    item = RD()[idx] || null;
    const box = $('m3qs'); box.innerHTML = '';
    if (!item) { $('m3tag').textContent = ''; $('m3textTitle').textContent = ''; $('m3text').textContent = t('lvlNoBank'); return; }   // no bank: notice, start is disabled
    $('m3tag').textContent = `${item.theme || ''} · ${Levels.full(lvlOf(item))}`; $('m3textTitle').textContent = item.title; $('m3text').textContent = item.text;
    const again = prevRight && prevRight.id === item.id ? prevRight.a : null;
    shown = item.qs.map((q, qi) => quiet(() => shuffleQ(q, again ? again[qi] : null), { o: q.o.slice(), a: q.a }));
    prevRight = { id: item.id, a: shown.map(x => x.a) };
    item.qs.forEach((q, qi) => {
      const wrap = document.createElement('div'); wrap.className = 'q'; wrap.setAttribute('role', 'radiogroup'); wrap.setAttribute('aria-labelledby', 'm3q' + qi);
      const h = document.createElement('div'); h.className = 'q-text'; h.id = 'm3q' + qi; h.lang = PL; h.textContent = `${qi + 1}. ${q.q}`; wrap.appendChild(h);
      shown[qi].o.forEach((o, oi) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false');
        b.dataset.q = qi; b.dataset.o = oi; b.lang = PL;
        b.innerHTML = '<span class="ltr"></span><span class="otxt"></span>';
        b.querySelector('.ltr').textContent = LETTERS[oi]; b.querySelector('.otxt').textContent = o;
        b.addEventListener('click', () => choose(qi, oi)); wrap.appendChild(b);
      });
      box.appendChild(wrap);
    });
  }
  function paintAnswers() {
    document.querySelectorAll('#m3qs .opt').forEach(b => b.setAttribute('aria-checked', String(answers[+b.dataset.q] === +b.dataset.o)));
    $('m3answered').textContent = t('m3answered')(answers.filter(a => a !== null).length);
  }
  function choose(qi, oi) { if (phase !== 'running') return; answers[qi] = oi; paintAnswers(); }

  function stopTimer() { if (timerId !== null) { Timers.stop(timerId); timerId = null; } }
  function tick() {
    if (phase !== 'running') { stopTimer(); return; }
    const rem = DURATION - fin((performance.now() - t0) / 1000);
    coach.clock(rem); coach.bar(rem / DURATION);
    const sec = Math.ceil(rem);
    if (sec !== lastSec) {
      lastSec = sec;
      if (sec <= CRITICAL && sec > 0) {
        Sound.tick(sec % 2);
        if (coach.state !== 'critical') { coach.mime('critical'); coach.critical(true); coach.say('critical', true); }
      }
    }
    if (rem <= 0) finish('time');
  }
  function reset() {
    stopTimer();
    phase = 'ready'; answers = [null, null, null]; lastSec = DURATION; lastRes = null;
    $('m3pre').hidden = false; $('m3body').hidden = true; setBusy(false);
    coach.critical(false); coach.mime('calm'); coach.say('ready'); coach.label(t('time')); coach.clock(DURATION); coach.bar(1);
    renderItem(); paintAnswers();
    $('m3submitBtn').hidden = false; $('m3restartBtn').hidden = false;
    $('m3startBtn').disabled = !item;
  }
  function start() {
    if (!item) return;
    Sound.unlock(); Sound.ding(); setBusy(true);
    phase = 'running'; t0 = performance.now(); lastSec = DURATION + 1;
    $('m3pre').hidden = true; $('m3body').hidden = false;
    coach.mime('typing'); coach.say('read');
    timerId = Timers.every(tick, 150);
  }
  function finish(reason) {
    if (phase !== 'running') return;
    stopTimer();
    const used = Math.min(DURATION, Math.max(0, fin((performance.now() - t0) / 1000)));
    phase = 'done'; coach.critical(false);
    if (reason === 'time') { coach.clock(0); coach.bar(0); Sound.alarm(); } else Sound.ding();
    const score = item.qs.reduce((n, q, i) => n + (answers[i] === shown[i].a ? 1 : 0), 0);
    lastRes = { score, used, blank: answers.filter(a => a === null).length, reason, title: item.title, level: lvlOf(item),
                items: item.qs.map((q, k) => ({ q: q.q, o: shown[k].o, chosen: answers[k], correct: shown[k].a, why: q.why })) };
    store.set('pc_rd_last', item.id || null);
    if (score >= 2) { coach.mime('victory'); coach.say('win'); }
    else { coach.mime('calm'); coach.say(reason === 'time' ? 'timeup' : 'low'); }
    setBusy(false); Results.show(3, lastRes);
  }
  $('m3startBtn').addEventListener('click', start);
  $('m3submitBtn').addEventListener('click', () => finish('manual'));
  $('m3restartBtn').addEventListener('click', reset);

  reset();
  return {
    mount() { reset(); Levels.note('reading'); },
    unmount() { reset(); },
    retry() {                                     // "Try again": next text of the level when there is one; same text only if it is the only one (options reshuffled, right answers moved)
      if (Levels.pool('reading').list.length > 1) idx = Levels.next('reading', idx);
      reset(); Levels.note('reading');
    },
    next() { idx = Levels.next('reading', idx); reset(); Levels.note('reading'); },
    onLevel() { idx = Levels.keep('reading', idx); reset(); Levels.note('reading'); },
    onLang() { coach.refresh(); coach.label(t('time')); paintAnswers(); if (item) $('m3tag').textContent = `${item.theme || ''} · ${Levels.full(lvlOf(item))}`; else $('m3text').textContent = t('lvlNoBank'); }
  };
})();

/* =================== FEEDBACK (isolated: footer form, no timers, no modals) =================== */
/* Owns: #fbBox DOM only. Reads currentMod / Results.visible() to prefill the context; never touches clocks, Accents, Coach or Results.
   Send = SITE.feedbackEndpoint (JSON POST) when configured, else a mailto: draft; Copy is always available as backup. */
const Feedback = (function () {
  const LIMIT = 600, COOLDOWN = 8000, CTX_BY_MOD = { 1: 'sprint', 2: 'improv', 3: 'reading' };
  let open = false, busy = false, lastSend = 0, ctxTouched = false, statusTimer = 0;
  const el = (id) => $(id);
  const clean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, n);
  function detectCtx() { try { return Results.visible() ? 'results' : (CTX_BY_MOD[currentMod] || 'general'); } catch (e) { return 'general'; } }
  function status(msg, isErr) {
    const s = el('fbStatus'); if (!s) return;
    s.textContent = msg || ''; s.classList.toggle('err', !!isErr);
    clearTimeout(statusTimer);
    if (msg && !isErr) statusTimer = setTimeout(() => { try { s.textContent = ''; } catch (e) {} }, 9000);
  }
  function setOpen(v) {
    open = v; const f = el('fbForm'), b = el('fbToggle'); if (!f || !b) return;
    f.hidden = !v; b.setAttribute('aria-expanded', String(v));
    if (v) {
      if (!ctxTouched) el('fbCtx').value = detectCtx();
      try { el('fbMsg').focus({ preventScroll: true }); f.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {}
    } else { status(''); el('fbManual').hidden = true; }
  }
  function collect() {
    const type = clean(el('fbType').value, 12), ctx = ctxTouched ? clean(el('fbCtx').value, 12) : detectCtx();
    return { type, ctx, msg: clean(el('fbMsg').value, LIMIT), email: clean(el('fbEmail').value, 120), lang,
             device: clean((navigator.userAgent || '').replace(/\s+/g, ' '), 140) + ' · ' + innerWidth + 'x' + innerHeight, at: new Date().toISOString() };
  }
  function validate(d) {
    if (d.msg.length < 5) return t('fbErrEmpty');
    if (d.email && !emailOk(d.email)) return t('fbErrEmail');
    return '';
  }
  const label = (d) => ({ suggestion: t('fbTypeSug'), bug: t('fbTypeBug'), opinion: t('fbTypeOpi') }[d.type] || d.type);
  const ctxLabel = (d) => ({ general: t('fbCtxGen'), sprint: t('fbCtxM1'), improv: t('fbCtxM2'), reading: t('fbCtxM3'), results: t('fbCtxRes') }[d.ctx] || d.ctx);
  const subject = (d) => '[Plume & Chrono] ' + label(d) + ' · ' + ctxLabel(d);
  const report = (d) => ['Plume & Chrono · Feedback', 'Type: ' + label(d), 'Where: ' + ctxLabel(d), 'Language: ' + d.lang, 'Level filter: ' + Levels.cur, 'Device: ' + d.device,
                         'Reply to: ' + (d.email || '-'), '', d.msg].join('\n');
  function mailto(d) {
    const url = 'mailto:' + (SITE.feedbackEmail || 'lifeandgently@gmail.com') + '?subject=' + encodeURIComponent(subject(d)) + '&body=' + encodeURIComponent(report(d));
    const a = document.createElement('a'); a.href = url; a.style.display = 'none'; document.body.appendChild(a); a.click(); a.remove();
  }
  async function post(d) {
    const ctl = typeof AbortController === 'function' ? new AbortController() : null, to = setTimeout(() => { try { ctl && ctl.abort(); } catch (e) {} }, 8000);
    try {
      const r = await fetch(SITE.feedbackEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d), signal: ctl ? ctl.signal : undefined });
      return !!r && r.ok;
    } finally { clearTimeout(to); }
  }
  function reset() { el('fbMsg').value = ''; el('fbEmail').value = ''; el('fbCount').textContent = '0/' + LIMIT; ctxTouched = false; el('fbManual').hidden = true; }
  async function submit(ev) {
    if (ev) ev.preventDefault();
    if (busy) return;
    try {
      if (el('fbWeb').value) { reset(); status(t('fbOkSent')); return; }       // honeypot: bots only
      const d = collect(), bad = validate(d);
      if (bad) { status(bad, true); return; }
      if (Date.now() - lastSend < COOLDOWN) { status(t('fbErrWait'), true); return; }
      busy = true; el('fbSend').disabled = true;
      if (SITE.feedbackEndpoint) {
        let ok = false; try { ok = await post(d); } catch (e) { ok = false; }
        if (ok) { lastSend = Date.now(); reset(); status(t('fbOkSent')); }
        else status(t('fbErrNet'), true);
      } else {
        mailto(d); lastSend = Date.now(); status(t('fbOkMail'));     // draft opened; the text stays until the user closes or edits it
      }
    } catch (e) { status(t('fbErrNet'), true); }
    finally { busy = false; const b = el('fbSend'); if (b) b.disabled = false; }
  }
  function copy() {
    try {
      const d = collect(), bad = validate(d); if (bad) { status(bad, true); return; }
      const txt = report(d), box = el('fbManual');
      const manual = () => { box.value = txt; box.hidden = false; status(t('fbManual')); try { box.focus(); box.select(); } catch (e) {} };
      let done = false;
      try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt).then(() => status(t('fbOkCopy')), manual); done = true; } } catch (e) { done = false; }
      if (!done) manual();
    } catch (e) { status(t('fbErrNet'), true); }
  }
  function init() {
    if (!el('fbBox')) return;
    el('fbToggle').addEventListener('click', () => safe(() => setOpen(!open)));
    el('fbClose').addEventListener('click', () => safe(() => setOpen(false)));
    el('fbForm').addEventListener('submit', (e) => { safe(() => submit(e)); });
    el('fbCopy').addEventListener('click', copy);
    el('fbCtx').addEventListener('change', () => { ctxTouched = true; });
    el('fbMsg').addEventListener('input', () => { const m = el('fbMsg'); if (m.value.length > LIMIT) m.value = m.value.slice(0, LIMIT); el('fbCount').textContent = m.value.length + '/' + LIMIT; });
    onLang();
  }
  function onLang() {
    const m = el('fbMsg'), e = el('fbEmail'); if (m) m.placeholder = t('fbMsgPh'); if (e) e.placeholder = t('fbEmailPh');
  }
  return { init, onLang };
})();

/* =================== TABS =================== */
function showMod(n) {
  const leaving = Modules[currentMod];
  if (n === currentMod) { if (Results.visible()) { Results.hide(); safe(() => leaving.mount()); } return; }   // tapping the open tab on a results screen returns to the exercise
  Results.hide();
  safe(() => leaving && leaving.unmount());
  Timers.clearAll(); setBusy(false);                                   // no ghost clocks after a tab change
  currentMod = n;
  document.querySelectorAll('.tab').forEach(tb => tb.setAttribute('aria-selected', String(+tb.dataset.mod === n)));
  [1, 2, 3].forEach(i => { $('mod' + i).hidden = i !== n; });
  safe(() => Modules[n] && Modules[n].mount());
}
document.querySelectorAll('.tab').forEach(tb => tb.addEventListener('click', () => showMod(+tb.dataset.mod)));

/* =================== LEVEL BAR (shell): changes the filter, then asks the open module to re-pick =================== */
document.querySelectorAll('#levelBar .lvl').forEach(b => b.addEventListener('click', () => {
  if (busy || b.dataset.level === Levels.cur) return;                       // locked while a run is in progress
  Levels.set(b.dataset.level); Levels.paint();
  Results.hide();
  safe(() => Sound.soft && Sound.soft());
  safe(() => { const m = Modules[currentMod]; if (m && m.onLevel) m.onLevel(); });
}));

/* =================== BOOT =================== */
quiet(() => document.querySelectorAll('[data-plang]').forEach(el => { el.lang = PL; }));   // practice-language texts in index.html
quiet(() => { if (PRACTICE.srcAria) $('source').setAttribute('aria-label', PRACTICE.srcAria); });
safe(() => Feedback.init());
Levels.paint();
Levels.note({ 1: 'sprint', 2: 'improv', 3: 'reading' }[currentMod]);
/* Reading: the text column sticks just below the clock bar, whatever its real height (compact bar on short screens, wrapped bubble…) */
quiet(() => {
  const sb = document.querySelector('#mod3 .stickybar'); if (!sb || !window.ResizeObserver) return;
  new ResizeObserver(() => quiet(() => document.documentElement.style.setProperty('--m3-sticky', (sb.offsetHeight + 12) + 'px'))).observe(sb);
});
applyLang();
})();
