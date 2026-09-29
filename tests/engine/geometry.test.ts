import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { rat, eq, toNumber, type Rational } from "../../src/engine/rational";
import {
  PI_314, piLabel, acceptPi,
  diameterOf, radiusOf, circumferenceCoefficient, circleAreaCoefficient, circumference, circleArea,
  isTriangle, thirdSideRange, TRIPLES, isRightTriangle, toTenth, hypotenuse, otherLeg,
  boxSurface, boxVolume, prismSurface, prismVolume,
  cylinderSurfaceCoefficient, cylinderLateralCoefficient, cylinderVolumeCoefficient,
  pyramidSurface, pyramidLateral, pyramidVolume, coneVolumeCoefficient, sphereVolumeCoefficient,
  complement, supplement, partnerAngle, crossSection,
} from "../../src/engine/geometry";

describe("pi", () => {
  it("treats 3.14 as an exact fraction, so decimal circle work never drifts", () => {
    expect(PI_314).toEqual(rat(157, 50));
    // C = 2 x 3.14 x 5 = 31.4, exactly.
    expect(circumference(rat(5), PI_314)).toEqual(rat(157, 5));
    expect(toNumber(circumference(rat(5), PI_314))).toBe(31.4);
  });

  it("writes a coefficient of one as the symbol alone", () => {
    expect(piLabel(rat(1))).toBe("π");
    expect(piLabel(rat(25))).toBe("25π");
    expect(piLabel(rat(1, 2))).toBe("0.5π");
    expect(piLabel(rat(0))).toBe("0");
  });

  it("accepts the written form and the bare coefficient, and nothing else", () => {
    const ok = acceptPi(rat(25));
    expect(ok("25π")).toBe(true);
    expect(ok("25 pi")).toBe(true);
    expect(ok("25")).toBe(true);
    expect(ok("78.5")).toBe(false);
    expect(ok("50π")).toBe(false);
  });
});

describe("circles", () => {
  it("relates radius and diameter both ways", () => {
    expect(diameterOf(rat(7))).toEqual(rat(14));
    expect(radiusOf(rat(14))).toEqual(rat(7));
  });

  it("keeps C = 2 pi r and A = pi r squared apart", () => {
    // The registry's c-vs-a error: for r = 2 they happen to agree, and nowhere else.
    expect(circumferenceCoefficient(rat(5))).toEqual(rat(10));
    expect(circleAreaCoefficient(rat(5))).toEqual(rat(25));
    expect(eq(circumferenceCoefficient(rat(2)), circleAreaCoefficient(rat(2)))).toBe(true);
  });

  it("computes an area with 3.14 exactly", () => {
    // 3.14 x 100 = 314.
    expect(circleArea(rat(10), PI_314)).toEqual(rat(314));
  });
});

describe("triangles", () => {
  it("rejects three lengths that only just fail to close", () => {
    // The registry names 2, 3, 5 as the foil: it is a straight line, not a triangle.
    expect(isTriangle(2, 3, 5)).toBe(false);
    expect(isTriangle(2, 3, 4)).toBe(true);
    expect(isTriangle(1, 2, 10)).toBe(false);
  });

  it("does not care what order the sides arrive in", () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 20 }), fc.integer({ min: 1, max: 20 }), fc.integer({ min: 1, max: 20 }),
      (a, b, c) => {
        const want = isTriangle(a, b, c);
        expect(isTriangle(c, a, b)).toBe(want);
        expect(isTriangle(b, c, a)).toBe(want);
      },
    ));
  });

  it("gives an open range for the third side that agrees with the inequality", () => {
    const { low, high } = thirdSideRange(7, 10);
    expect({ low, high }).toEqual({ low: 3, high: 17 });
    expect(isTriangle(7, 10, low)).toBe(false);
    expect(isTriangle(7, 10, high)).toBe(false);
    expect(isTriangle(7, 10, low + 1)).toBe(true);
    expect(isTriangle(7, 10, high - 1)).toBe(true);
  });

  it("ships only real Pythagorean triples", () => {
    for (const [a, b, c] of TRIPLES) {
      expect(a * a + b * b, `${a},${b},${c}`).toBe(c * c);
      expect(isRightTriangle(a, b, c)).toBe(true);
    }
  });

  it("finds a hypotenuse and a leg", () => {
    expect(hypotenuse(3, 4)).toBe(5);
    expect(otherLeg(13, 5)).toBe(12);
    expect(toTenth(hypotenuse(5, 7))).toEqual(rat(86, 10));
  });
});

describe("solids", () => {
  const box = { l: rat(4), w: rat(3), h: rat(2) };

  it("surfaces and fills a box", () => {
    // 2(12 + 8 + 6) = 52; 4 x 3 x 2 = 24.
    expect(boxSurface(box)).toEqual(rat(52));
    expect(boxVolume(box)).toEqual(rat(24));
  });

  it("agrees with 2B + Ph on the same box", () => {
    expect(prismSurface(mul4x3(), rat(14), rat(2))).toEqual(boxSurface(box));
    expect(prismVolume(mul4x3(), rat(2))).toEqual(boxVolume(box));
  });
  function mul4x3(): Rational { return rat(12); }

  it("unrolls a cylinder into two circles and a rectangle", () => {
    // r 3, h 5: 2 x 9 + 2 x 15 = 48 pi. The curved part alone is 30 pi.
    expect(cylinderSurfaceCoefficient(rat(3), rat(5))).toEqual(rat(48));
    expect(cylinderLateralCoefficient(rat(3), rat(5))).toEqual(rat(30));
    expect(cylinderVolumeCoefficient(rat(3), rat(5))).toEqual(rat(45));
  });

  it("uses the slant height for a pyramid's faces and the height for its volume", () => {
    // Square base 6, slant 5: 36 + (1/2)(24)(5) = 96.
    expect(pyramidSurface(rat(36), rat(24), rat(5))).toEqual(rat(96));
    expect(pyramidLateral(rat(24), rat(5))).toEqual(rat(60));
    // Same base, height 4: 48.
    expect(pyramidVolume(rat(36), rat(4))).toEqual(rat(48));
  });

  it("makes a cone a third of its cylinder and keeps the sphere cubed", () => {
    const r = rat(3);
    const h = rat(5);
    expect(coneVolumeCoefficient(r, h)).toEqual(rat(15));
    expect(eq(mul3(coneVolumeCoefficient(r, h)), cylinderVolumeCoefficient(r, h))).toBe(true);
    expect(sphereVolumeCoefficient(rat(3))).toEqual(rat(36));
  });
  function mul3(x: Rational): Rational { return rat(x.n * 3, x.d); }
});

describe("angles", () => {
  it("complements to 90 and supplements to 180", () => {
    expect(complement(rat(35))).toEqual(rat(55));
    expect(supplement(rat(35))).toEqual(rat(145));
  });

  it("makes the equal pairs equal and the same-side pair supplementary", () => {
    expect(partnerAngle(rat(70), "CORRESPONDING")).toEqual(rat(70));
    expect(partnerAngle(rat(70), "ALTERNATE INTERIOR")).toEqual(rat(70));
    expect(partnerAngle(rat(70), "VERTICAL")).toEqual(rat(70));
    expect(partnerAngle(rat(70), "SAME-SIDE INTERIOR")).toEqual(rat(110));
  });
});

describe("cross sections", () => {
  it("copies the base when the slice is parallel to it", () => {
    expect(crossSection("TRIANGULAR PRISM", "PARALLEL TO THE BASE")).toBe("TRIANGLE");
    expect(crossSection("CYLINDER", "PARALLEL TO THE BASE")).toBe("CIRCLE");
    expect(crossSection("SQUARE PYRAMID", "PARALLEL TO THE BASE")).toBe("SQUARE");
  });

  it("gives a rectangle through a prism and a triangle through a point", () => {
    // Both of the registry's error tags live here: a pyramid's parallel slice is
    // not a triangle, and a cylinder's perpendicular slice is not a circle.
    expect(crossSection("SQUARE PYRAMID", "PERPENDICULAR TO THE BASE")).toBe("TRIANGLE");
    expect(crossSection("CYLINDER", "PERPENDICULAR TO THE BASE")).toBe("RECTANGLE");
    expect(crossSection("RECTANGULAR PRISM", "PERPENDICULAR TO THE BASE")).toBe("RECTANGLE");
  });
});
