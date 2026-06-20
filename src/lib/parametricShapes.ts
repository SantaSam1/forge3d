import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────────────────────
// Параметрическая геометрия для точных инженерных деталей.
// В отличие от AI-генерации, здесь размеры считаются по формулам ГОСТ/ISO,
// а не "угадываются" нейросетью — то что введено в мм, то и получится в модели.
// ─────────────────────────────────────────────────────────────────────────────

export interface GearParams {
  module: number;          // модуль зацепления, мм
  teeth: number;            // число зубьев
  pressureAngleDeg: number; // угол давления, обычно 20°
  boreDiameter: number;     // диаметр центрального отверстия, мм (0 = без отверстия)
  thickness: number;        // толщина (высота), мм
  hubDiameter?: number;     // диаметр ступицы (0 = без ступицы)
  hubThickness?: number;    // дополнительная высота ступицы
}

export interface GearMetrics {
  pitchDiameter: number;   // делительный диаметр
  outerDiameter: number;   // внешний диаметр (по вершинам зубьев)
  rootDiameter: number;    // диаметр впадин
  baseDiameter: number;    // основной диаметр
  centerDistance: number;  // межосевое расстояние для пары одинаковых шестерён
}

function involutePoint(baseRadius: number, t: number) {
  const x = baseRadius * (Math.cos(t) + t * Math.sin(t));
  const y = baseRadius * (Math.sin(t) - t * Math.cos(t));
  return { x, y, r: Math.sqrt(x * x + y * y) };
}

/**
 * Строит 2D-контур (THREE.Shape) эвольвентной прямозубой шестерни.
 * Геометрия основана на стандартной ГОСТ 13755 / ISO 21771 эвольвентной форме зуба.
 */
export function buildGearShape(params: GearParams): { shape: THREE.Shape; metrics: GearMetrics } {
  const { module, teeth, pressureAngleDeg, boreDiameter } = params;
  const pressureAngle = (pressureAngleDeg * Math.PI) / 180;

  const pitchRadius = (module * teeth) / 2;
  const addendum = module;
  const dedendum = 1.25 * module;
  const outerRadius = pitchRadius + addendum;
  const rootRadius = Math.max(pitchRadius - dedendum, module * 0.5);
  const baseRadius = pitchRadius * Math.cos(pressureAngle);

  // Находим максимальный параметр t эвольвенты, при котором достигается внешний радиус
  let tMax = 0;
  for (let s = 0; s < 300; s++) {
    const t = s * 0.008;
    if (involutePoint(baseRadius, t).r >= outerRadius) { tMax = t; break; }
    tMax = t;
  }

  const angularPitch = (2 * Math.PI) / teeth;
  const toothHalfAngle = angularPitch / 4; // толщина зуба ~ половина шага

  const N = 10; // сегментов на эвольвентную кривую
  const points: { x: number; y: number }[] = [];

  for (let i = 0; i < teeth; i++) {
    const baseAngle = i * angularPitch;

    const profile: { r: number; th: number }[] = [];
    for (let k = 0; k <= N; k++) {
      const t = (tMax * k) / N;
      const p = involutePoint(baseRadius, t);
      profile.push({ r: p.r, th: Math.atan2(p.y, p.x) });
    }

    // угол эвольвенты в точке делительной окружности — используется для центрирования зуба
    let pitchInvAngle = profile[profile.length - 1].th;
    for (const pr of profile) {
      if (pr.r >= pitchRadius) { pitchInvAngle = pr.th; break; }
    }

    const rootR = Math.max(rootRadius, baseRadius * 0.99);

    points.push({
      x: rootR * Math.cos(baseAngle - toothHalfAngle),
      y: rootR * Math.sin(baseAngle - toothHalfAngle),
    });

    for (const pr of profile) {
      const ang = baseAngle - toothHalfAngle + (pitchInvAngle - pr.th);
      points.push({ x: pr.r * Math.cos(ang), y: pr.r * Math.sin(ang) });
    }
    for (let k = profile.length - 1; k >= 0; k--) {
      const pr = profile[k];
      const ang = baseAngle + toothHalfAngle - (pitchInvAngle - pr.th);
      points.push({ x: pr.r * Math.cos(ang), y: pr.r * Math.sin(ang) });
    }

    points.push({
      x: rootR * Math.cos(baseAngle + toothHalfAngle),
      y: rootR * Math.sin(baseAngle + toothHalfAngle),
    });
  }

  const shape = new THREE.Shape();
  points.forEach((p, idx) => {
    if (idx === 0) shape.moveTo(p.x, p.y); else shape.lineTo(p.x, p.y);
  });
  shape.closePath();

  if (boreDiameter > 0) {
    const hole = new THREE.Path();
    hole.absarc(0, 0, boreDiameter / 2, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }

  return {
    shape,
    metrics: {
      pitchDiameter: pitchRadius * 2,
      outerDiameter: outerRadius * 2,
      rootDiameter: rootRadius * 2,
      baseDiameter: baseRadius * 2,
      centerDistance: pitchRadius * 2,
    },
  };
}

export function buildGearMesh(params: GearParams): THREE.Mesh {
  const { shape, metrics } = buildGearShape(params);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: params.thickness,
    bevelEnabled: false,
    curveSegments: 6,
  });
  geometry.center();
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({ color: 0x1d9e75, metalness: 0.35, roughness: 0.45 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.metrics = metrics;
  mesh.userData.kind = 'gear';
  return mesh;
}

// ─────────────────────────────────────────────────────────────────────────────
// Вал (ступенчатый цилиндр)
// ─────────────────────────────────────────────────────────────────────────────

export interface ShaftSegment {
  diameter: number; // мм
  length: number;   // мм
}

export function buildShaftMesh(segments: ShaftSegment[]): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0x378add, metalness: 0.5, roughness: 0.35 });

  let offset = 0;
  const totalLength = segments.reduce((s, seg) => s + seg.length, 0);

  segments.forEach((seg) => {
    const geo = new THREE.CylinderGeometry(seg.diameter / 2, seg.diameter / 2, seg.length, 32);
    geo.rotateZ(Math.PI / 2); // ось вала вдоль X
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.x = offset + seg.length / 2 - totalLength / 2;
    group.add(mesh);
    offset += seg.length;
  });

  group.userData.kind = 'shaft';
  group.userData.totalLength = totalLength;
  return group;
}

// ─────────────────────────────────────────────────────────────────────────────
// Втулка (труба) — внешний/внутренний диаметр + длина
// ─────────────────────────────────────────────────────────────────────────────

export interface BushingParams {
  outerDiameter: number;
  innerDiameter: number;
  length: number;
}

export function buildBushingMesh(params: BushingParams): THREE.Mesh {
  const { outerDiameter, innerDiameter, length } = params;
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerDiameter / 2, 0, Math.PI * 2, false);
  if (innerDiameter > 0) {
    const hole = new THREE.Path();
    hole.absarc(0, 0, innerDiameter / 2, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false, curveSegments: 32 });
  geometry.center();
  const material = new THREE.MeshStandardMaterial({ color: 0x7f77dd, metalness: 0.4, roughness: 0.4 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.kind = 'bushing';
  return mesh;
}

// ─────────────────────────────────────────────────────────────────────────────
// Прямоугольная/круглая пластина с отверстиями
// ─────────────────────────────────────────────────────────────────────────────

export interface PlateParams {
  width: number;
  height: number;
  thickness: number;
  cornerRadius?: number;
  holes?: { x: number; y: number; diameter: number }[];
}

export function buildPlateMesh(params: PlateParams): THREE.Mesh {
  const { width, height, thickness, cornerRadius = 0, holes = [] } = params;
  const shape = new THREE.Shape();
  const w = width / 2, h = height / 2, r = Math.min(cornerRadius, w, h);

  if (r > 0) {
    shape.moveTo(-w + r, -h);
    shape.lineTo(w - r, -h);
    shape.quadraticCurveTo(w, -h, w, -h + r);
    shape.lineTo(w, h - r);
    shape.quadraticCurveTo(w, h, w - r, h);
    shape.lineTo(-w + r, h);
    shape.quadraticCurveTo(-w, h, -w, h - r);
    shape.lineTo(-w, -h + r);
    shape.quadraticCurveTo(-w, -h, -w + r, -h);
  } else {
    shape.moveTo(-w, -h);
    shape.lineTo(w, -h);
    shape.lineTo(w, h);
    shape.lineTo(-w, h);
    shape.closePath();
  }

  holes.forEach((hp) => {
    const hole = new THREE.Path();
    hole.absarc(hp.x, hp.y, hp.diameter / 2, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  });

  const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 16 });
  geometry.center();
  const material = new THREE.MeshStandardMaterial({ color: 0xd85a30, metalness: 0.3, roughness: 0.5 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.kind = 'plate';
  return mesh;
}
