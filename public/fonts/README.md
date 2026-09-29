# Fonts

Self-hosted per `design/README.md` ("Self-host fonts for offline Chromebooks").
All three families are OFL 1.1. **Ship the licence files with them.**

Drop these six files in this directory, named exactly like this. `src/style.css`
already declares them; nothing else needs changing.

| File | Family | Weight | Used for |
| --- | --- | --- | --- |
| `ChakraPetch-Bold.woff2` | Chakra Petch | 700 | Wordmark, screen titles, chapter names, buttons at 20 px and up |
| `IBMPlexMono-Regular.woff2` | IBM Plex Mono | 400 | Option text, table cells, plain readouts |
| `IBMPlexMono-Medium.woff2` | IBM Plex Mono | 500 | Caps labels, status pills |
| `IBMPlexMono-SemiBold.woff2` | IBM Plex Mono | 600 | HUD numbers, button labels, answer values |
| `IBMPlexSans-Regular.woff2` | IBM Plex Sans | 400 | Problem prompts, briefing copy, manual prose |
| `IBMPlexSans-Medium.woff2` | IBM Plex Sans | 500 | Emphasis inside body copy |

One file per weight, not one per family. A single Regular declared across a
weight range lets the browser fake the heavier weights by smearing the Regular,
which is not what the artboards are drawn in.

## Where they come from

- **IBM Plex Mono and IBM Plex Sans** — https://github.com/IBM/plex (OFL 1.1).
  The release zips contain a `woff2/` folder with exactly these names.
- **Chakra Petch** — https://fonts.google.com/specimen/Chakra+Petch or
  https://github.com/cadsondemak/Chakra-Petch (OFL 1.1). Google Fonts serves TTF;
  convert to woff2, or take the woff2 from the Google Fonts CSS response.

`design/tokens.json → font` is the authority on which families and weights the
game uses. If that changes, change these declarations to match.

## Until they land

The game runs. `src/style.css` falls back to the nearest system faces, so letter
shapes and metrics change but layout does not: every measurement comes from
`design/tokens.json`, not from the font.
