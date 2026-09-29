---
skill: sp.7.4
title: Measures of variation
standards: [7.SP.D.8a]
honors: false
chapter: 7
section: "7.4"
sources:
  im: [G6.U8.MAD-IQR]
  khan: "https://www.khanacademy.org/math/cc-seventh-grade-math/cc-7th-probability-statistics"
reps: [dot-plot, quartile-marks]
---

## What it is

Two squadrons can share a mean and be nothing alike. Measures of variation say how SPREAD OUT the values are, which is the other half of describing data.

**Key idea: Range = max − min. Sort, split at the median, then Q1 and Q3 are the medians of the two halves. IQR = Q3 − Q1, the width of the middle half.**

## How to solve it

1. Sort the values. Every measure here is read off the sorted list.
2. Range: largest minus smallest. It uses only the two ends, so one odd value moves it a long way.
3. Split the sorted list at the median. On an ODD count the median goes in NEITHER half. Q1 is the median of the lower half and Q3 the median of the upper half.
4. IQR is Q3 MINUS Q1. For MAD instead, find the mean, take each value's distance from it, drop the signs and average those distances.

## Worked example

{{worked-example}}

## Watch out for

- **Mistake:** adding the quartiles, so IQR comes out as Q3 + Q1. **Fix:** a spread is a difference. Q3 − Q1.
- **Mistake:** keeping the median inside both halves on an odd count. **Fix:** with 1 2 3 4 5 6 7 the halves are 1 2 3 and 5 6 7. The 4 belongs to neither.
- **Mistake:** giving the range when the IQR was asked for. **Fix:** the range is the whole spread; the IQR is the middle half only, and it ignores the extremes on purpose.

## Try one

{{try-one}}

## Where it shows up

- **Debrief** — how consistent your landing times are, not just how fast.
- **Hangar** — the spread of fuel burn across the squadron.
- **Systems:** Fuel, Engines.
- **Real aircraft:** two pilots can average the same lock time while one is steady and the other is all over the place. The IQR is what tells them apart.

[Watch on Khan Academy](https://www.khanacademy.org/math/cc-seventh-grade-math/cc-7th-probability-statistics)
