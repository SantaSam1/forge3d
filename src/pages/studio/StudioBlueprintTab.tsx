import { useState, useMemo, useRef } from 'react';
import { Cog, AlignVerticalSpaceAround, CircleDashed, RectangleHorizontal, Sparkles, Ruler, SlidersHorizontal, AlertTriangle, ImagePlus, X, ZoomIn } from 'lucide-react';
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

// Стандартный ряд модулей по ГОСТ 9563-60 / ISO 54 (1-й и 2-й ряд, наиболее частые значения)
const STANDARD_MODULES = [0.3, 0.4, 0.5, 0.6, 0.8, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 16, 20];

interface DrawingFit {
  module: number;
  teeth: number;
  pitchDiameter: number;
  outerDiameter: number;
  error: number; // расхождение с введённым внешним диаметром, мм
}

/**
 * По двум диаметрам с чертежа (делительный + внешний) подбирает наиболее правдоподобную
 * пару (модуль из стандартного ряда, целое число зубьев), как это делает инженер вручную:
 * module = pitchDiameter / teeth, перебираем стандартные модули и ищем целое teeth,
 * затем сверяем получившийся внешний диаметр с тем, что введён пользователем.
 */
function fitGearFromDrawing(pitchDiameter: number, outerDiameterHint: number): DrawingFit | null {
  if (pitchDiameter <= 0) return null;
  let best: DrawingFit | null = null;

  for (const m of STANDARD_MODULES) {
    const teethFloat = pitchDiameter / m;
    const teeth = Math.round(teethFloat);
    if (teeth < 5 || teeth > 300) continue;
    // Насколько целое число зубьев получилось — это и есть проверка "правдоподобности" модуля
    const teethError = Math.abs(teethFloat - teeth);
    if (teethError > 0.03) continue; // отбрасываем варианты, где зубья совсем не целые

    const recomputedPitch = m * teeth;
    const recomputedOuter = recomputedPitch + 2 * m;
    const outerError = outerDiameterHint > 0 ? Math.abs(recomputedOuter - outerDiameterHint) : 0;

    if (!best || outerError < best.error) {
      best = { module: m, teeth, pitchDiameter: recomputedPitch, outerDiameter: recomputedOuter, error: outerError };
    }
  }
  return best;
}

export default function StudioBlueprintTab({ generating, onBuild }: Props) {
  const { lang } = useLang();
  const isRu = lang === 'ru';

  const [shapeType, setShapeType] = useState<BlueprintShape>('gear');
  const [gearInputMode, setGearInputMode] = useState<'params' | 'drawing'>('params');

  // Шестерня — режим "по параметрам"
  const [module, setModule] = useState(2);
  const [teeth, setTeeth] = useState(20);
  const [pressureAngle, setPressureAngle] = useState(20);
  const [bore, setBore] = useState(6);
  const [gearThickness, setGearThickness] = useState(5);

  // Шестерня — режим "по чертежу": пользователь вводит то, что подписано на чертеже
  const [drawingPitchD, setDrawingPitchD] = useState(41.25);
  const [drawingOuterD, setDrawingOuterD] = useState(48);
  const [drawingBore, setDrawingBore] = useState(8);
  const [drawingThickness, setDrawingThickness] = useState(8);

  const drawingFit = useMemo(
    () => fitGearFromDrawing(drawingPitchD, drawingOuterD),
    [drawingPitchD, drawingOuterD]
  );

  // Фото чертежа — только для визуального сравнения рядом с полями; не анализируется автоматически
  const [drawingPhoto, setDrawingPhoto] = useState<string | null>(null);
  const [photoZoomed, setPhotoZoomed] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setDrawingPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

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
      if (gearInputMode === 'drawing' && drawingFit) {
        onBuild({
          shape: 'gear',
          gear: {
            module: drawingFit.module,
            teeth: drawingFit.teeth,
            pressureAngleDeg: 20,
            boreDiameter: drawingBore,
            thickness: drawingThickness,
          },
          name: isRu
            ? `Шестерня (с чертежа) M${drawingFit.module} Z${drawingFit.teeth}`
            : `Gear (from drawing) M${drawingFit.module} Z${drawingFit.teeth}`,
        });
      } else {
        onBuild({
          shape: 'gear',
          gear: { module, teeth, pressureAngleDeg: pressureAngle, boreDiameter: bore, thickness: gearThickness },
          name: isRu ? `Шестерня M${module} Z${teeth}` : `Gear M${module} Z${teeth}`,
        });
      }
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

  // Расчётные величины для шестерни (режим "по параметрам") — показываем сразу, чтобы видеть итоговые мм
  const pitchD = module * teeth;
  const outerD = pitchD + 2 * module;

  const buildDisabled = generating || (shapeType === 'gear' && gearInputMode === 'drawing' && !drawingFit);

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
          {/* Переключатель: ввести параметры самому, или взять числа прямо с чертежа */}
          <div className="flex gap-1.5 p-1 bg-gray-900 rounded-xl border border-white/10">
            <button
              onClick={() => setGearInputMode('params')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${gearInputMode === 'params' ? 'bg-cyan-500/20 text-cyan-300' : 'text-gray-500'}`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />{isRu ? 'По параметрам' : 'By parameters'}
            </button>
            <button
              onClick={() => setGearInputMode('drawing')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${gearInputMode === 'drawing' ? 'bg-cyan-500/20 text-cyan-300' : 'text-gray-500'}`}
            >
              <Ruler className="w-3.5 h-3.5" />{isRu ? 'С чертежа' : 'From drawing'}
            </button>
          </div>

          {gearInputMode === 'params' ? (
            <>
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
            </>
          ) : (
            <>
              <p className="text-[11px] text-gray-500 leading-tight">
                {isRu
                  ? 'Введите два диаметра, подписанные на чертеже — модуль и число зубьев будут вычислены автоматически по стандартному ряду модулей (ГОСТ 9563 / ISO 54).'
                  : 'Enter the two diameters labeled on the drawing — module and tooth count are computed automatically from the standard module series (ISO 54).'}
              </p>

              {/* Фото чертежа — только для визуальной сверки рядом с полями, числа вводятся вручную */}
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
              {drawingPhoto ? (
                <div className="relative rounded-lg border border-white/10 overflow-hidden bg-gray-900">
                  <img
                    src={drawingPhoto}
                    alt={isRu ? 'Чертёж' : 'Drawing'}
                    onClick={() => setPhotoZoomed(true)}
                    className="w-full max-h-40 object-contain cursor-zoom-in bg-white"
                  />
                  <button
                    onClick={() => setPhotoZoomed(true)}
                    className="absolute bottom-1.5 right-1.5 p-1 bg-black/60 hover:bg-black/80 rounded-md text-white"
                    aria-label={isRu ? 'Увеличить' : 'Zoom in'}
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDrawingPhoto(null)}
                    className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-black/80 rounded-md text-white"
                    aria-label={isRu ? 'Удалить фото' : 'Remove photo'}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => photoInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-white/15 hover:border-cyan-500/40 rounded-lg text-xs text-gray-500 hover:text-cyan-400 transition-all"
                >
                  <ImagePlus className="w-4 h-4" />
                  {isRu ? 'Загрузить фото чертежа (для сверки)' : 'Upload drawing photo (for reference)'}
                </button>
              )}
              {drawingPhoto && (
                <p className="text-[10px] text-gray-600 leading-tight -mt-1">
                  {isRu
                    ? 'Фото показывается только для удобства — числа считываются и вводятся вручную, без автоматического распознавания.'
                    : 'Photo is shown for reference only — numbers are read and entered manually, no automatic recognition.'}
                </p>
              )}

              {photoZoomed && drawingPhoto && (
                <div
                  onClick={() => setPhotoZoomed(false)}
                  className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6 cursor-zoom-out"
                >
                  <img src={drawingPhoto} alt={isRu ? 'Чертёж' : 'Drawing'} className="max-w-full max-h-full object-contain bg-white rounded-lg" />
                  <button
                    onClick={() => setPhotoZoomed(false)}
                    className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white"
                    aria-label={isRu ? 'Закрыть' : 'Close'}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              {numberField(isRu ? 'Делительный Ø (с чертежа)' : 'Pitch Ø (from drawing)', drawingPitchD, setDrawingPitchD, { min: 1, step: 0.05, suffix: 'мм' })}
              {numberField(isRu ? 'Внешний Ø (с чертежа)' : 'Outer Ø (from drawing)', drawingOuterD, setDrawingOuterD, { min: 1, step: 0.05, suffix: 'мм' })}
              {numberField(isRu ? 'Диаметр отверстия' : 'Bore diameter', drawingBore, setDrawingBore, { min: 0, step: 0.5, suffix: 'мм' })}
              {numberField(isRu ? 'Толщина' : 'Thickness', drawingThickness, setDrawingThickness, { min: 1, step: 0.5, suffix: 'мм' })}

              {drawingFit ? (
                <div className="bg-gray-900/60 border border-white/10 rounded-lg p-2.5 text-xs">
                  <div className="flex justify-between py-0.5 text-gray-400">
                    <span>{isRu ? 'Модуль (подобран)' : 'Module (matched)'}</span>
                    <span className="text-cyan-300 font-medium">{drawingFit.module}</span>
                  </div>
                  <div className="flex justify-between py-0.5 text-gray-400">
                    <span>{isRu ? 'Число зубьев' : 'Tooth count'}</span>
                    <span className="text-cyan-300 font-medium">{drawingFit.teeth}</span>
                  </div>
                  <div className="flex justify-between py-0.5 text-gray-400 border-t border-white/5 mt-1 pt-1">
                    <span>{isRu ? 'Делительный Ø (расчёт)' : 'Pitch Ø (computed)'}</span>
                    <span className="text-gray-300">{drawingFit.pitchDiameter.toFixed(2)} мм</span>
                  </div>
                  <div className="flex justify-between py-0.5 text-gray-400">
                    <span>{isRu ? 'Внешний Ø (расчёт)' : 'Outer Ø (computed)'}</span>
                    <span className="text-gray-300">{drawingFit.outerDiameter.toFixed(2)} мм</span>
                  </div>
                  {drawingFit.error > 0.3 && (
                    <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-white/5">
                      <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-yellow-400 leading-tight">
                        {isRu
                          ? `Расчётный внешний Ø отличается от введённого на ${drawingFit.error.toFixed(2)} мм — проверьте, верно ли распознаны числа с чертежа.`
                          : `Computed outer Ø differs from the entered value by ${drawingFit.error.toFixed(2)} mm — double-check the numbers from the drawing.`}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-start gap-1.5 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-red-400 leading-tight">
                    {isRu
                      ? 'Не удалось подобрать целое число зубьев под стандартный модуль. Проверьте делительный диаметр.'
                      : 'Could not match a standard module with an integer tooth count. Check the pitch diameter.'}
                  </p>
                </div>
              )}
            </>
          )}
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
        disabled={buildDisabled}
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
