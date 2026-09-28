# Fonts

Self-hosted per `design/README.md` ("Self-host fonts for offline Chromebooks").
All three are OFL 1.1 and must ship with their licence files.

| File | Family | Weights used |
| --- | --- | --- |
| `ChakraPetch-Bold.woff2` | Chakra Petch | 700 — display, headings, wordmark, buttons >= 20 px |
| `IBMPlexMono-Regular.woff2` | IBM Plex Mono | 400 / 500 / 600 — readouts, numbers, labels, all math |
| `IBMPlexSans-Regular.woff2` | IBM Plex Sans | 400 / 500 — prompts, briefing copy, manual prose |

`src/style.css` already declares the `@font-face` rules. Until the files are
here the game falls back to the nearest system faces, which changes metrics but
not layout: every measurement comes from `design/tokens.json`, not from the font.
