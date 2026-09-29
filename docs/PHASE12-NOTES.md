# Phase 12 notes

Seven changes aimed at one problem: the flying and the maths were two activities
glued together, and almost nothing the player earned did anything.

## What was actually wrong

Three findings from reading the code before changing it.

- **Credits had one sink.** HINT, at 50. A pilot twenty sorties in was sitting on
  thousands of them with nothing to want.
- **The streak did nothing.** It counted up and played a rising note. No reward
  was attached, so a wrong answer was nearly free and guessing was the fastest
  route to the next bogey.
- **The bogeys never attacked.** Shields only dropped on a wrong answer, so
  flying well or badly changed nothing at all.

## The seven

1. **The streak pays.** Each answer in an unbroken run adds 10% to the next, to a
   cap of double, shown on the HUD beside the streak. A miss drops the multiplier
   to 1 and never below: it ends the run without taking anything away.
2. **A shop.** `src/data/shop.ts` and `ShopScene`. Two real liveries, three HUD
   accents, three lock reticles.
3. **Contacts escape.** One allowed past the tail is gone, and costs the credits
   and the intel card it was worth. No shield, no progress.
4. **The next aircraft is named.** `nextUnlock` counts the sorties down to it in
   the hangar.
5. **The loadout is a choice.** Prep used to rotate fuel, shields and missiles by
   index; he now picks which bar each answer fills.
6. **Personal bests.** Fastest sortie, most first-try hits, best haul, on the
   Profile screen.
7. **A boss rule.** A boss holds a tighter lock cone, 240 against 340.

## The rule the shop lives by

It sells looks and never advantage. The moment credits buy a shield or a second
on the clock, the fastest route to the reward is to stop thinking, and the game
starts teaching the opposite of what it is for. A test asserts the catalogue
contains nothing but cosmetics, so adding a power item means arguing with a
failing suite rather than quietly shipping it.

It also only sells what the game can already draw. Both liveries are sprites the
design ships; the HUD accents come from the existing palette and the reticles are
drawn in code. Nothing arrives looking like a placeholder, and nothing adds a
download.

The save holds the item id rather than its value, so an item can be repriced or
its colour retuned without rewriting anyone's save file.

## Pressure without punishment

`docs/design.md` says learning is never punished, and most of the obvious ways to
make a game tense are punishment-shaped. Two of the seven had to be built around
that.

An **escaped contact** costs a reward he never banked rather than progress he
had. Losing something he had would make him afraid to try; losing something he
might have had just makes him hurry.

The **boss rule** presses the flying, not the thinking. The world is frozen while
a problem card is up, so a tighter lock cone cannot cost him time on a question.
What it costs is sloppy flying between them. `tests/game/bossRule.test.ts` pins
the other half of that: every lane a contact can arrive in has to sit inside even
the tighter cone with room to spare, or a boss could put a contact on screen that
cannot be locked at all.

## Music

Three Uppbeat tracks: "Strength & Honor" on the title, "Impetus" on every other
screen, "The Big Adventure" in the sortie, ducked to a quarter while a problem
card is up so the question still has the room.

One map decides it and `main.ts` applies it, rather than fourteen scenes each
remembering. A scene missing from the map stops the music, so silence is the
default. A test lists the registered scene keys, which is what caught a `Shop`
entry pointing at a scene that did not exist yet.

Three things a browser does that had to be handled: it will not start audio
before the page is touched; Chrome skips preload on a detached audio element, so
the file was never fetched at all; and `game.scene.scenes` is empty immediately
after the Phaser constructor, so the listeners went nowhere until they were moved
onto the READY event.
