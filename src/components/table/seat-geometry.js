// Seat layout computation for the table canvas.
// All coordinates are in PERCENT of the canvas (which is positioned 1:1 square),
// with the table centered at (50, 50). Each seat returns:
//   - pinPos:   { leftPct, topPct }  position of the small status pin (table-side)
//   - labelPos: { leftPct, topPct }  position of the name label (outer ring)
//   - align:    "left" | "center" | "right"  text alignment of the label
//   - side:     "top" | "right" | "bottom" | "left" | null   for rect/square only
//
// Round tables use two concentric polar rings (R_PIN inner, R_LABEL outer).
// Square / rectangle distribute seats around the perimeter, with more on the
// long sides (rectangle 2:1).

const R_PIN = 24;     // pin ring radius (% from center) — round tables
const R_LABEL = 36;   // label ring radius (% from center) — round tables

function polar(angleDeg, r) {
  const a = ((angleDeg - 90) * Math.PI) / 180; // start at 12 o'clock, clockwise
  return {
    leftPct: 50 + r * Math.cos(a),
    topPct: 50 + r * Math.sin(a),
  };
}

function alignFromAngle(deg) {
  // deg measured from 12 o'clock, clockwise.
  // top arc → center, right arc → left-aligned, bottom → center, left → right.
  const a = ((deg % 360) + 360) % 360;
  if (a < 22.5 || a > 337.5) return "center";
  if (a < 157.5) return "left";
  if (a < 202.5) return "center";
  return "right";
}

function roundLayout(seatCount) {
  const layouts = [];
  for (let i = 0; i < seatCount; i++) {
    const angleDeg = (i / seatCount) * 360; // 0° = top
    layouts.push({
      pinPos: polar(angleDeg, R_PIN),
      labelPos: polar(angleDeg, R_LABEL),
      align: alignFromAngle(angleDeg),
      side: null,
    });
  }
  return layouts;
}

function rectLayout(seatCount, halfW, halfH) {
  const W = halfW * 2;
  const H = halfH * 2;

  // Allocate per-side proportionally to side length, keeping the long-side
  // total even so the layout stays symmetric.
  let longTotal = Math.round((seatCount * 2 * W) / (2 * W + 2 * H));
  if (longTotal % 2 !== 0) {
    longTotal = longTotal + 1 <= seatCount ? longTotal + 1 : Math.max(0, longTotal - 1);
  }
  longTotal = Math.min(seatCount, Math.max(0, longTotal));
  const topCount = longTotal / 2;
  const bottomCount = longTotal / 2;
  const shortTotal = seatCount - longTotal;
  const rightCount = Math.ceil(shortTotal / 2);
  const leftCount = shortTotal - rightCount;

  const PIN_OFF = 6;     // pin offset outside the table edge
  const LABEL_OFF = 17;  // label offset further out

  const left = 50 - halfW;
  const right = 50 + halfW;
  const top = 50 - halfH;
  const bottom = 50 + halfH;

  const layouts = [];

  for (let i = 0; i < topCount; i++) {
    const t = (i + 0.5) / topCount;
    const x = left + W * t;
    layouts.push({
      pinPos: { leftPct: x, topPct: top - PIN_OFF },
      labelPos: { leftPct: x, topPct: top - LABEL_OFF },
      align: "center",
      side: "top",
    });
  }
  for (let i = 0; i < rightCount; i++) {
    const t = (i + 0.5) / rightCount;
    const y = top + H * t;
    layouts.push({
      pinPos: { leftPct: right + PIN_OFF, topPct: y },
      labelPos: { leftPct: right + LABEL_OFF, topPct: y },
      align: "left",
      side: "right",
    });
  }
  for (let i = 0; i < bottomCount; i++) {
    const t = (i + 0.5) / bottomCount;
    const x = right - W * t;
    layouts.push({
      pinPos: { leftPct: x, topPct: bottom + PIN_OFF },
      labelPos: { leftPct: x, topPct: bottom + LABEL_OFF },
      align: "center",
      side: "bottom",
    });
  }
  for (let i = 0; i < leftCount; i++) {
    const t = (i + 0.5) / leftCount;
    const y = bottom - H * t;
    layouts.push({
      pinPos: { leftPct: left - PIN_OFF, topPct: y },
      labelPos: { leftPct: left - LABEL_OFF, topPct: y },
      align: "right",
      side: "left",
    });
  }

  return layouts;
}

export function computeSeatLayouts(seatCount, shape) {
  if (!seatCount || seatCount <= 0) return [];
  if (shape === "rectangle") return rectLayout(seatCount, 32, 16);
  if (shape === "square") return rectLayout(seatCount, 24, 24);
  return roundLayout(seatCount);
}

// Visual table dimensions in percent (matches the geometry above so seats
// sit just outside the table edges).
export function tableSurfaceSize(shape, isPresidential) {
  if (shape === "rectangle") return { w: 64, h: 32, rounded: false };
  if (shape === "square") return { w: 48, h: 48, rounded: false };
  return { w: isPresidential ? 62 : 56, h: isPresidential ? 62 : 56, rounded: true };
}

// Neighbours of a given seat — works for any seatCount, wraps around.
export function neighborsOf(seatNumber, seatCount) {
  if (seatCount <= 1) return { prev: null, next: null };
  const prev = seatNumber === 1 ? seatCount : seatNumber - 1;
  const next = seatNumber === seatCount ? 1 : seatNumber + 1;
  return { prev, next };
}
