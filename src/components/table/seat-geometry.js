// Seat layout computation for the table canvas.
// All coordinates are in PERCENT of the canvas (which is positioned 1:1 square),
// with the table centered at (50, 50). Each seat returns:
//   - pinPos:   { leftPct, topPct }  position of the small status pin (table-side)
//   - labelPos: { leftPct, topPct }  position of the name label (outer ring)
//   - align:    "left" | "center" | "right"  text alignment of the label
//   - side:     "top" | "right" | "bottom" | "left" | null   for rect/square only
//
// Two concentric rings centered on the table: pin ring (small diameter) just
// outside the edge, label ring (bigger diameter) further outside. Both offsets
// are derived from the actual table radius (halfR) so presidential and standard
// tables stay visually consistent regardless of size.
// Square / rectangle distribute seats around the perimeter with the same
// outward offsets, more seats on the long sides. Rotation rotates all
// positions around (50, 50).

const ROUND_PIN_OUT = 0;       // pin straddles the table edge (round)
const ROUND_LABEL_OUT = 9;     // label this many % outside the table edge (round)
const RECT_PIN_OFF = 6;        // pin offset outside the table edge (rect/square)
const RECT_LABEL_OFF = 17;     // label offset further out

function polar(angleDeg, r) {
  const a = ((angleDeg - 90) * Math.PI) / 180; // start at 12 o'clock, clockwise
  return {
    leftPct: 50 + r * Math.cos(a),
    topPct: 50 + r * Math.sin(a),
  };
}

function rotatePointDeg(pt, deg) {
  if (!deg) return pt;
  const rad = (deg * Math.PI) / 180;
  const dx = pt.leftPct - 50;
  const dy = pt.topPct - 50;
  return {
    leftPct: 50 + dx * Math.cos(rad) - dy * Math.sin(rad),
    topPct: 50 + dx * Math.sin(rad) + dy * Math.cos(rad),
  };
}

function angleFromCenter(pt) {
  // Angle in degrees measured from 12 o'clock, clockwise positive.
  const dx = pt.leftPct - 50;
  const dy = pt.topPct - 50;
  const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return (deg + 360) % 360;
}

function alignFromAngle(deg) {
  const a = ((deg % 360) + 360) % 360;
  if (a < 22.5 || a > 337.5) return "center";
  if (a < 157.5) return "left";
  if (a < 202.5) return "center";
  return "right";
}

function roundLayout(seatCount, halfR, rotationDeg = 0, pinR, labelR) {
  const resolvedPinR = Number.isFinite(pinR) ? pinR : halfR + ROUND_PIN_OUT;
  const resolvedLabelR = Number.isFinite(labelR) ? labelR : halfR + ROUND_LABEL_OUT;
  const layouts = [];
  for (let i = 0; i < seatCount; i++) {
    const angleDeg = ((i / seatCount) * 360 + rotationDeg) % 360;
    layouts.push({
      pinPos: polar(angleDeg, resolvedPinR),
      labelPos: polar(angleDeg, resolvedLabelR),
      align: alignFromAngle(angleDeg),
      side: null,
    });
  }
  return layouts;
}

function rectLayout(seatCount, halfW, halfH, rotationDeg = 0) {
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

  const left = 50 - halfW;
  const right = 50 + halfW;
  const top = 50 - halfH;
  const bottom = 50 + halfH;

  const layouts = [];

  const pushSeat = (pinBase, labelBase, side) => {
    const pinPos = rotatePointDeg(pinBase, rotationDeg);
    const labelPos = rotatePointDeg(labelBase, rotationDeg);
    // Recompute align from the rotated pin angle so labels stay readable
    // regardless of table orientation.
    const align = alignFromAngle(angleFromCenter(pinPos));
    layouts.push({ pinPos, labelPos, align, side });
  };

  for (let i = 0; i < topCount; i++) {
    const t = (i + 0.5) / topCount;
    const x = left + W * t;
    pushSeat(
      { leftPct: x, topPct: top - RECT_PIN_OFF },
      { leftPct: x, topPct: top - RECT_LABEL_OFF },
      "top"
    );
  }
  for (let i = 0; i < rightCount; i++) {
    const t = (i + 0.5) / rightCount;
    const y = top + H * t;
    pushSeat(
      { leftPct: right + RECT_PIN_OFF, topPct: y },
      { leftPct: right + RECT_LABEL_OFF, topPct: y },
      "right"
    );
  }
  for (let i = 0; i < bottomCount; i++) {
    const t = (i + 0.5) / bottomCount;
    const x = right - W * t;
    pushSeat(
      { leftPct: x, topPct: bottom + RECT_PIN_OFF },
      { leftPct: x, topPct: bottom + RECT_LABEL_OFF },
      "bottom"
    );
  }
  for (let i = 0; i < leftCount; i++) {
    const t = (i + 0.5) / leftCount;
    const y = bottom - H * t;
    pushSeat(
      { leftPct: left - RECT_PIN_OFF, topPct: y },
      { leftPct: left - RECT_LABEL_OFF, topPct: y },
      "left"
    );
  }

  return layouts;
}

function applyOffset(layouts, offsetX, offsetY) {
  if (!offsetX && !offsetY) return layouts;
  return layouts.map((l) => ({
    ...l,
    pinPos: { leftPct: l.pinPos.leftPct + offsetX, topPct: l.pinPos.topPct + offsetY },
    labelPos: { leftPct: l.labelPos.leftPct + offsetX, topPct: l.labelPos.topPct + offsetY },
  }));
}

export function computeSeatLayouts(seatCount, shape, options = {}) {
  if (!seatCount || seatCount <= 0) return [];
  const {
    isPresidential = false,
    rotationDeg = 0,
    pinRadius,        // absolute % from center, overrides round default
    labelRadius,      // absolute % from center, overrides round default
    offsetX = 0,      // shift entire ring system horizontally (%)
    offsetY = 0,      // shift entire ring system vertically (%)
  } = options;

  let layouts;
  if (shape === "rectangle") {
    layouts = rectLayout(seatCount, 32, 16, rotationDeg);
  } else if (shape === "square") {
    layouts = rectLayout(seatCount, 24, 24, rotationDeg);
  } else {
    // Round — halfR mirrors tableSurfaceSize so pin/label stay on the edge.
    const halfR = isPresidential ? 31 : 28;
    const pinR = Number.isFinite(pinRadius) ? pinRadius : halfR + ROUND_PIN_OUT;
    const labelR = Number.isFinite(labelRadius) ? labelRadius : halfR + ROUND_LABEL_OUT;
    layouts = roundLayout(seatCount, halfR, rotationDeg, pinR, labelR);
  }
  return applyOffset(layouts, offsetX, offsetY);
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
