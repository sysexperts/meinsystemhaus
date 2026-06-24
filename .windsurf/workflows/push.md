---
description: Änderungen committen und zu GitHub (origin/main) pushen
---

Ziel: Den aktuellen Stand von MeinSystemhaus nach GitHub
(https://github.com/sysexperts/meinsystemhaus) pushen.

1. Geänderte Dateien prüfen.
// turbo
2. `git status -s` ausführen, um die Änderungen zu sehen.
// turbo
3. Alle Änderungen stagen: `git add -A`
4. Mit einer aussagekräftigen Nachricht committen:
   `git commit -m "<beschreibe die Änderung>"`
   (Wenn nichts zu committen ist, hier abbrechen.)
// turbo
5. Pushen: `git push`
   Hinweis: PowerShell meldet stderr ggf. als "NativeCommandError",
   obwohl der Push erfolgreich war. Erfolg an "-> main" bzw.
   "Everything up-to-date" erkennen, nicht am Fehler-Wrapper.
// turbo
6. Verifizieren: `git status -sb` sollte "## main...origin/main" ohne
   "ahead" anzeigen.
