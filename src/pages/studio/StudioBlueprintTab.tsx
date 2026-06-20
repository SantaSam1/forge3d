import { useState } from 'react';
import { Cog, AlignVerticalSpaceAround, CircleDashed, RectangleHorizontal, Sparkles } from 'lucide-react';
import { useLang } from '../../lib/i18n';
import type { GearParams, ShaftSegment, BushingParams, PlateParams } from '../../lib/parametricShapes';

export type BlueprintShape = 'gear' | 'shaft' | 'bushing' | 'plate';

export interface BlueprintResult {
  shape: BlueprintShape;
  gear?: GearParams;
  shaft?: ShaftSegment[];
  bushing?: BushingParams;
  plate?: PlateParams;
  name: string;
}

interface Props {
  generating: boolean;
  onBuild: (result: BlueprintResult) => void;
}

const numberField = (
  label: string,
  value: number,
  onChange: (v: number) => void,
  opts?: { min?: number; max?: number; step?: number; suffix?: string }
) => (
  <div key={label}>
    <label className="text-xs font-medium text-gray-400 block mb-1">{label}</label>
    <div className="relative">
      <input
        type="number"
        value={value}
        min={opts?.min}
        max={opts?.max}
        step={opts?.step ?? 0.1}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-cyan-500/50"
      />
      {opts?.suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">{opts.suffix}</span>
      )}
    </div>
  </div>
);

export default function StudioBlueprintTab({ generating, onBuild }: Props) {
  const { lang } = useLang();
  const isRu = lang === 'ru';

  const [shapeType, setShapeType] = useState<BlueprintShape>('gear');

  // Шестерня
  const [module, setModule] = useState(2);
  const [teeth, setTeeth] = useState(20);
  const [pressureAngle, setPressureAngle] = useState(20);
  const [bore, setBore] = useState(6);
  const [gearThickness, setGearThickness] = useState(5);

  // Вал (до 3 сегментов)
  const [shaftSegments, setShaftSegments] = useState<ShaftSegment[]>([
    { diameter: 10, length: 30 },
    { diameter: 16, length: 15 },
    { diameter: 10, length: 30 },
  ]);

  // Втулка
  const [bushOuter, setBushOuter] = useState(20);
  const [bushInner, setBushInner] = useState(10);
  const [bushLength, setBushLength] = useState(15);

  // Пластина
  const [plateW, setPlateW] = useState(80);
  const [plateH, setPlateH] = useState(50);
  const [plateT, setPlateT] = useState(4);
  const [plateR, setPlateR] = useState(4);

  const shapes: { id: BlueprintShape; label: string; icon: typeof Cog }[] = [
    { id: 'gear', label: isRu ? 'Шестерня' : 'Gear', icon: Cog },
    { id: 'shaft', label: isRu ? 'Вал' : 'Shaft', icon: AlignVerticalSpaceAround },
    { id: 'bushing', label: isRu ? 'Втулка' : 'Bushing', icon: CircleDashed },
    { id: 'plate', label: isRu ? 'Пластина' : 'Plate', icon: RectangleHorizontal },
  ];

  const updateSegment = (idx: number, field: 'diameter' | 'length', value: number) => {
    setShaftSegments((segs) => segs.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  const handleBuild = () => {
    if (shapeType === 'gear') {
      onBuild({
        shape: 'gear',
        gear: { module, teeth, pressureAngleDeg: pressureAngle, boreDiameter: bore, thickness: gearThickness },
        name: isRu ? `Шестерня M${module} Z${teeth}` : `Gear M${module} Z${teeth}`,
      });
    } else if (shapeType === 'shaft') {
      onBuild({ shape: 'shaft', shaft: shaftSegments, name: isRu ? 'Вал' : 'Shaft' });
    } else if (shapeType === 'bushing') {
      onBuild({
        shape: 'bushing',
        bushing: { outerDiameter: bushOuter, innerDiameter: bushInner, length: bushLength },
        name: isRu ? 'Втулка' : 'Bushing',
      });
    } else {
      onBuild({
        shape: 'plate',
        plate: { width: plateW, height: plateH, thickness: plateT, cornerRadius: plateR },
        name: isRu ? 'Пластина' : 'Plate',
      });
    }
  };

  // Расчётные величины для шестерни — показываем сразу, чтобы пользователь видел итоговые мм
  const pitchD = module * teeth;
  const outerD = pitchD + 2 * module;

  return (
    <div className="flex flex-col gap-4">
      <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
        <p className="text-[11px] text-cyan-300 leading-tight">
          {isRu
            ? 'Точная геометрия по формулам — размеры в модели совпадут с введёнными миллиметрами.'
            : 'Exact parametric geometry — model dimensions will match the millimeters you enter.'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {shapes.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => setShapeType(s.id)}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-all ${
                shapeType === s.id
                  ? 'bg-cyan-500/15 border-cyan-500/60 text-cyan-300'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
              }`}
            >
              <Icon className="w-5 h-5" />
              {s.label}
            </button>
          );
        })}
      </div>

      {shapeType === 'gear' && (
        <div className="flex flex-col gap-3">
          {numberField(isRu ? 'Модуль (мм)' : 'Module (mm)', module, setModule, { min: 0.2, step: 0.1 })}
          {numberField(isRu ? 'Число зубьев' : 'Tooth count', teeth, (v) => setTeeth(Math.round(v)), { min: 5, step: 1 })}
          {numberField(isRu ? 'Угол давления (°)' : 'Pressure angle (°)', pressureAngle, setPressureAngle, { min: 10, max: 30, step: 1 })}
          {numberField(isRu ? 'Диаметр отверстия' : 'Bore diameter', bore, setBore, { min: 0, step: 0.5, suffix: 'мм' })}
          {numberField(isRu ? 'Толщина' : 'Thickness', gearThickness, setGearThickness, { min: 1, step: 0.5, suffix: 'мм' })}

          <div className="bg-gray-900/60 border border-white/10 rounded-lg p-2.5 text-xs">
            <div className="flex justify-between py-0.5 text-gray-400">
              <span>{isRu ? 'Делительный Ø' : 'Pitch Ø'}</span>
              <span className="text-gray-200 font-medium">{pitchD.toFixed(1)} мм</span>
            </div>
            <div className="flex justify-between py-0.5 text-gray-400">
              <span>{isRu ? 'Внешний Ø' : 'Outer Ø'}</span>
              <span className="text-gray-200 font-medium">{outerD.toFixed(1)} мм</span>
            </div>
          </div>
        </div>
      )}

      {shapeType === 'shaft' && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-gray-500">{isRu ? 'Ступени вала слева → справа' : 'Shaft steps left → right'}</p>
          {shaftSegments.map((seg, idx) => (
            <div key={idx} className="grid grid-cols-2 gap-2 p-2 bg-white/5 rounded-lg border border-white/10">
              {numberField(isRu ? `Ø ступени ${idx + 1}` : `Step ${idx + 1} Ø`, seg.diameter, (v) => updateSegment(idx, 'diameter', v), { min: 1, step: 0.5, suffix: 'мм' })}
              {numberField(isRu ? 'Длина' : 'Length', seg.length, (v) => updateSegment(idx, 'length', v), { min: 1, step: 1, suffix: 'мм' })}
            </div>
          ))}
          <div className="text-xs text-gray-500 text-right">
            {isRu ? 'Общая длина: ' : 'Total length: '}
            <span className="text-gray-300 font-medium">{shaftSegments.reduce((s, x) => s + x.length, 0)} мм</span>
          </div>
        </div>
      )}

      {shapeType === 'bushing' && (
        <div className="flex flex-col gap-3">
          {numberField(isRu ? 'Внешний Ø' : 'Outer Ø', bushOuter, setBushOuter, { min: 1, step: 0.5, suffix: 'мм' })}
          {numberField(isRu ? 'Внутренний Ø' : 'Inner Ø', bushInner, setBushInner, { min: 0, step: 0.5, suffix: 'мм' })}
          {numberField(isRu ? 'Длина' : 'Length', bushLength, setBushLength, { min: 1, step: 0.5, suffix: 'мм' })}
        </div>
      )}

      {shapeType === 'plate' && (
        <div className="flex flex-col gap-3">
          {numberField(isRu ? 'Ширина' : 'Width', plateW, setPlateW, { min: 1, step: 1, suffix: 'мм' })}
          {numberField(isRu ? 'Высота' : 'Height', plateH, setPlateH, { min: 1, step: 1, suffix: 'мм' })}
          {numberField(isRu ? 'Толщина' : 'Thickness', plateT, setPlateT, { min: 0.5, step: 0.5, suffix: 'мм' })}
          {numberField(isRu ? 'Радиус углов' : 'Corner radius', plateR, setPlateR, { min: 0, step: 0.5, suffix: 'мм' })}
        </div>
      )}

      <button
        onClick={handleBuild}
        disabled={generating}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium text-sm rounded-xl transition-all"
      >
        {generating ? (
          <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{isRu ? 'Построение...' : 'Building...'}</>
        ) : (
          <><Sparkles className="w-4 h-4" />{isRu ? 'Построить модель' : 'Build Model'}</>
        )}
      </button>
      <p className="text-xs text-gray-600 text-center">
        {isRu ? 'Расчёт по эвольвентной геометрии — без AI' : 'Involute geometry calculation — no AI'}
      </p>
    </div>
  );
}
