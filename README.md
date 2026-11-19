# Plume & Chrono

*by Life and Gently* · Daily warm-up for computer-based French exams (TEF/TCF Canada style).

Zero-build web app: plain HTML, Tailwind via CDN, vanilla JavaScript and the Web Audio API. No npm, no compiler. Upload the files straight to `public_html` on Hostinger.

## Iteration 1 (this version)

A single self-contained `index.html` with:

- Kindle "paper and ink" look (Lora + Inter)
- Mime-face SVG mascot with 4 states: calm, typing, critical (last 20 s), victory
- EN | ES interface switch (auto-detected, saved in `localStorage`); exercises stay in French
- Exam audio made with Web Audio (ding, last-20-seconds tick-tock, alarm at 00:00), with an ON/OFF switch
- Touch-friendly French accent bar that inserts at the cursor without closing the tablet keyboard
- Module 1, Typing Sprint: 6 French B1–B2 texts, 2-minute timer, paste blocked, live WPM and accuracy, `Score = WPM × (Accuracy/100)²`, separate counts for missing accents and the missing space before `? ! : ;`
- Personal top 10 saved on the device; runs above 130 WPM are not saved

Modules 2 and 3, the public leaderboard and the file split come in later iterations.

Not affiliated with CCIP, France Éducation international or IRCC. Contact: lifeandgently@gmail.com
