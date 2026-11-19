# Plume & Chrono

*by Life and Gently* · Daily warm-up for computer-based French exams (TEF/TCF Canada style).

Zero-build web app: plain HTML, Tailwind via CDN, vanilla JavaScript and the Web Audio API. No npm, no compiler. Upload the files straight to `public_html` on Hostinger.

## Iteration 1 + 2 (this version)

A single self-contained `index.html` with:

- Kindle "paper and ink" look (Lora + Inter)
- Mime-face SVG mascot with 4 states: calm, typing, critical (last 20 s), victory
- EN | ES interface switch (auto-detected, saved in `localStorage`); exercises stay in French
- Exam audio made with Web Audio (ding, last-20-seconds tick-tock, alarm at 00:00), with an ON/OFF switch
- Touch-friendly French accent bar that inserts at the cursor without closing the tablet keyboard
- Module 1, Typing Sprint: 6 French B1–B2 texts, 2-minute timer, paste blocked, live WPM and accuracy, `Score = WPM × (Accuracy/100)²`, separate counts for missing accents and the missing space before `? ! : ;`
- Personal top 10 saved on the device; runs above 130 WPM are not saved

- Module 2, 60s Improv: 8 exam situations, 60 s planning pad that locks at 0:00 (ding), 4 min editor with accent bar and no paste, 2 random required connectors detected live (case and accent tolerant), results with words vs. goal, connectors used and reaction time
- Module 3, Speed Reading: 4 French texts with 3 multiple-choice questions each, strict 3-minute clock with progress bar, side by side on wide screens and stacked on tablets and phones, score and corrections at the end

- Iteration 3: shared results screen for all 3 modes (retry / new exercise / switch mode); weekly Top 20 (resets Monday 00:00 Toronto time) with anti-cheat (>130 WPM, <30 s, <60 chars or a single big input are discarded), public nickname with profanity filter and private optional email for Top 10; demo data in `localStorage` with a Supabase hook (`SITE` config + SQL schema comment); PDF Kit card with EN/ES links; AdSense slot on results only; legal footer. Only the Typing Sprint is ranked.

The split into separate files comes in Iteration 4. Real prizes need the live Supabase ranking with server-side checks.

Not affiliated with CCIP, France Éducation international or IRCC. Contact: lifeandgently@gmail.com
