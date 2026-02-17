/**
 * Motor de Reglas IA (Nivel 2) - Horizonte Vision
 *
 * Toma las detecciones de coco-ssd y aplica reglas para sugerir
 * tipo de riesgo y severidad con explicación.
 *
 * Funciona en cliente (browser) para evitar costos de servidor.
 */

export interface Detection {
  class: string;
  score: number;
  bbox: [number, number, number, number];
}

export interface RuleResult {
  riskTypeCode: string | null;
  suggestedSeverity: "HIGH" | "MEDIUM" | "LOW" | null;
  explanation: string;
  confidenceScore: number;
  detections: Detection[];
}

export interface SeverityThresholds {
  high: { minObjects: number; minAvgScore: number };
  medium: { minObjects: number; minAvgScore: number };
  low: { minObjects: number; minAvgScore: number };
}

// Objects commonly found as obstacles in coco-ssd
const OBSTACLE_CLASSES = new Set([
  "chair",
  "backpack",
  "suitcase",
  "handbag",
  "laptop",
  "tv",
  "bottle",
  "cup",
  "potted plant",
  "bench",
  "skateboard",
  "surfboard",
  "sports ball",
  "kite",
  "baseball bat",
  "tennis racket",
  "umbrella",
  "bicycle",
  "motorcycle",
  "car",
  "truck",
  "bus",
  "fire hydrant",
  "stop sign",
  "parking meter",
  "traffic light",
  "couch",
  "bed",
  "dining table",
  "refrigerator",
  "oven",
  "microwave",
  "toaster",
  "sink",
  "toilet",
  "book",
  "clock",
  "vase",
  "scissors",
  "teddy bear",
  "hair drier",
  "toothbrush",
]);

const CLASS_NAMES_ES: Record<string, string> = {
  person: "persona",
  chair: "silla",
  backpack: "mochila",
  suitcase: "maleta",
  handbag: "bolso",
  laptop: "laptop",
  tv: "televisor",
  bottle: "botella",
  cup: "taza/vaso",
  "potted plant": "planta",
  bench: "banca",
  bicycle: "bicicleta",
  motorcycle: "motocicleta",
  car: "auto",
  truck: "camión",
  bus: "bus",
  "fire hydrant": "hidrante",
  "stop sign": "señal de pare",
  couch: "sofá",
  bed: "cama",
  "dining table": "mesa",
  refrigerator: "refrigerador",
  book: "libro",
  clock: "reloj",
  umbrella: "paraguas",
  skateboard: "patineta",
  "sports ball": "pelota",
  knife: "cuchillo",
  fork: "tenedor",
  spoon: "cuchara",
  bowl: "tazón",
  banana: "banana",
  apple: "manzana",
  sandwich: "sandwich",
  orange: "naranja",
  broccoli: "brócoli",
  carrot: "zanahoria",
  "hot dog": "hot dog",
  pizza: "pizza",
  donut: "dona",
  cake: "pastel",
  cell_phone: "celular",
  "cell phone": "celular",
  mouse: "ratón",
  remote: "control remoto",
  keyboard: "teclado",
  dog: "perro",
  cat: "gato",
  horse: "caballo",
  sheep: "oveja",
  cow: "vaca",
  bird: "pájaro",
};

function translateClass(cls: string): string {
  return CLASS_NAMES_ES[cls] || cls;
}

const DEFAULT_THRESHOLDS: SeverityThresholds = {
  high: { minObjects: 5, minAvgScore: 0.7 },
  medium: { minObjects: 3, minAvgScore: 0.5 },
  low: { minObjects: 1, minAvgScore: 0.3 },
};

export function analyzeDetections(
  detections: Detection[],
  thresholds: SeverityThresholds = DEFAULT_THRESHOLDS,
  minConfidence: number = 0.5
): RuleResult {
  if (!detections || detections.length === 0) {
    return {
      riskTypeCode: null,
      suggestedSeverity: null,
      explanation:
        "No se detectaron objetos en la imagen. Puede ingresar el reporte manualmente.",
      confidenceScore: 0,
      detections: [],
    };
  }

  // Filter detections above minimum score
  const validDetections = detections.filter((d) => d.score >= 0.3);

  if (validDetections.length === 0) {
    return {
      riskTypeCode: null,
      suggestedSeverity: null,
      explanation:
        "Los objetos detectados tienen confianza muy baja. Puede ingresar el reporte manualmente.",
      confidenceScore: 0,
      detections,
    };
  }

  // Classify objects
  const obstacleDetections = validDetections.filter((d) =>
    OBSTACLE_CLASSES.has(d.class)
  );
  const uniqueClasses = new Set(validDetections.map((d) => d.class));
  const avgScore =
    validDetections.reduce((sum, d) => sum + d.score, 0) /
    validDetections.length;

  // Format detected objects for explanation
  const classCounts: Record<string, number> = {};
  validDetections.forEach((d) => {
    classCounts[d.class] = (classCounts[d.class] || 0) + 1;
  });

  const detectedList = Object.entries(classCounts)
    .map(
      ([cls, count]) =>
        `${count}x ${translateClass(cls)}` + (count > 1 ? "" : "")
    )
    .join(", ");

  // Rule A: Obstruction risk
  if (obstacleDetections.length >= 2) {
    const severity = determineSeverity(
      obstacleDetections.length,
      avgScore,
      thresholds
    );
    const confidence =
      Math.min(
        1,
        (obstacleDetections.length / thresholds.high.minObjects) * avgScore
      );

    const needsConfirmation = confidence < minConfidence;
    const confirmText = needsConfirmation ? " ⚠️ Requiere confirmación." : "";

    return {
      riskTypeCode: "RISK_OBSTRUCTION",
      suggestedSeverity: severity,
      explanation: `Se detectaron ${obstacleDetections.length} objeto(s) potencialmente obstructivos (${detectedList}). Regla aplicada: Obstrucción/Tropiezo — objetos que podrían bloquear vías de tránsito o salidas. Severidad sugerida: ${severity}.${confirmText}`,
      confidenceScore: Math.round(confidence * 100) / 100,
      detections: validDetections,
    };
  }

  // Rule B: Housekeeping risk
  if (validDetections.length >= 3 || uniqueClasses.size >= 3) {
    const severity = determineSeverity(
      validDetections.length,
      avgScore,
      thresholds
    );
    const confidence =
      Math.min(
        1,
        (validDetections.length / thresholds.high.minObjects) * avgScore
      );

    const needsConfirmation = confidence < minConfidence;
    const confirmText = needsConfirmation ? " ⚠️ Requiere confirmación." : "";

    return {
      riskTypeCode: "RISK_HOUSEKEEPING",
      suggestedSeverity: severity,
      explanation: `Se detectaron ${validDetections.length} objeto(s) de ${uniqueClasses.size} tipo(s) distinto(s) (${detectedList}). Regla aplicada: Orden y limpieza deficiente — alta cantidad o variedad de objetos dispersos. Severidad sugerida: ${severity}.${confirmText}`,
      confidenceScore: Math.round(confidence * 100) / 100,
      detections: validDetections,
    };
  }

  // Few objects detected - low risk
  return {
    riskTypeCode: "RISK_HOUSEKEEPING",
    suggestedSeverity: "LOW",
    explanation: `Se detectaron ${validDetections.length} objeto(s) (${detectedList}). Pocos elementos detectados. Se sugiere riesgo bajo. Confirme o ajuste según la situación real.`,
    confidenceScore: Math.round(avgScore * 50) / 100,
    detections: validDetections,
  };
}

function determineSeverity(
  objectCount: number,
  avgScore: number,
  thresholds: SeverityThresholds
): "HIGH" | "MEDIUM" | "LOW" {
  if (
    objectCount >= thresholds.high.minObjects &&
    avgScore >= thresholds.high.minAvgScore
  ) {
    return "HIGH";
  }
  if (
    objectCount >= thresholds.medium.minObjects &&
    avgScore >= thresholds.medium.minAvgScore
  ) {
    return "MEDIUM";
  }
  return "LOW";
}
