"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
  Camera,
  Upload,
  Brain,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { severityLabel, severityColor } from "@/lib/utils";
import { analyzeDetections, type Detection, type RuleResult, type SeverityThresholds } from "@/lib/rules-engine";
import AppLayout from "@/components/app-layout";

const LottiePlayer = dynamic(() => import("lottie-react"), { ssr: false });
import analyzingData from "../../../public/lottie/analyzing.json";
import successData from "../../../public/lottie/success.json";

type Step = "area" | "photo" | "analyze" | "confirm" | "description" | "success";

interface Area {
  id: string;
  name: string;
}

interface RiskType {
  id: string;
  code: string;
  name: string;
  description: string;
  recommendationsJson: string;
}

export default function ReportPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [step, setStep] = useState<Step>("area");
  const [areas, setAreas] = useState<Area[]>([]);
  const [riskTypes, setRiskTypes] = useState<RiskType[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<RuleResult | null>(null);
  const [selectedRiskTypeId, setSelectedRiskTypeId] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<"HIGH" | "MEDIUM" | "LOW">("MEDIUM");
  const [description, setDescription] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/areas").then((r) => r.json()),
      fetch("/api/risk-types").then((r) => r.json()),
    ]).then(([areasData, riskTypesData]) => {
      setAreas(areasData);
      setRiskTypes(riskTypesData);
      setLoading(false);
    }).catch(() => {
      toast.error("Error al cargar datos");
      setLoading(false);
    });
  }, []);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "report-photos");

      const res = await fetch("/api/blob/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al subir foto");
      }

      const data = await res.json();
      setPhotoUrl(data.url);
      setStep("analyze");
      toast.success("Foto subida correctamente");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al subir foto");
      setPhotoPreview("");
    } finally {
      setUploading(false);
    }
  };

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      toast.error("No se pudo acceder a la cámara");
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
          handleFileUpload(file);
        }
      }, "image/jpeg", 0.9);
    }
    // Stop camera
    const stream = video.srcObject as MediaStream;
    stream?.getTracks().forEach((t) => t.stop());
    setShowCamera(false);
  };

  const runAIAnalysis = useCallback(async () => {
    setAnalyzing(true);
    try {
      // Load TensorFlow.js and coco-ssd
      const tf = await import("@tensorflow/tfjs");
      await tf.ready();
      const cocoSsd = await import("@tensorflow-models/coco-ssd");
      const model = await cocoSsd.load();

      // Create image element
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = photoPreview || photoUrl;
      });

      // Run detection
      const predictions = await model.detect(img);

      const detections: Detection[] = predictions.map((p) => ({
        class: p.class,
        score: p.score,
        bbox: p.bbox as [number, number, number, number],
      }));

      // Get rule config
      let thresholds: SeverityThresholds | undefined;
      let minConfidence = 0.5;
      try {
        const ruleRes = await fetch("/api/admin/rules");
        if (ruleRes.ok) {
          const ruleConfig = await ruleRes.json();
          if (ruleConfig) {
            thresholds = JSON.parse(ruleConfig.severityThresholdsJson);
            minConfidence = ruleConfig.minConfidenceForAutoSuggest;
          }
        }
      } catch {
        // Use defaults
      }

      const result = analyzeDetections(detections, thresholds, minConfidence);
      setAiResult(result);

      // Set suggested values
      if (result.riskTypeCode) {
        const rt = riskTypes.find((r) => r.code === result.riskTypeCode);
        if (rt) setSelectedRiskTypeId(rt.id);
      }
      if (result.suggestedSeverity) {
        setSelectedSeverity(result.suggestedSeverity);
      }

      setStep("confirm");
      toast.success("Análisis completado");
    } catch (error) {
      console.error("AI Analysis error:", error);
      toast.error("Error en análisis IA. Puede continuar manualmente.");
      setStep("confirm");
    } finally {
      setAnalyzing(false);
    }
  }, [photoPreview, photoUrl, riskTypes]);

  const handleSubmit = async () => {
    if (!selectedRiskTypeId) {
      toast.error("Seleccione un tipo de riesgo");
      return;
    }
    if (!description.trim()) {
      toast.error("Ingrese una descripción");
      return;
    }
    if (description.length > 250) {
      toast.error("La descripción no puede exceder 250 caracteres");
      return;
    }

    setSubmitting(true);
    try {
      const aiRiskType = aiResult?.riskTypeCode
        ? riskTypes.find((r) => r.code === aiResult.riskTypeCode)
        : null;

      const body = {
        areaId: selectedAreaId,
        description,
        photoUrl,
        isAnonymous,
        riskTypeIdFinal: selectedRiskTypeId,
        severityFinal: selectedSeverity,
        aiSuggestedRiskTypeId: aiRiskType?.id || null,
        aiSuggestedSeverity: aiResult?.suggestedSeverity || null,
        aiDetectionsJson: aiResult ? JSON.stringify(aiResult.detections) : null,
        aiExplanation: aiResult?.explanation || null,
        aiConfidenceScore: aiResult?.confidenceScore || null,
      };

      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al crear reporte");
      }

      setStep("success");
      toast.success("¡Reporte creado exitosamente!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear reporte");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Nuevo Reporte</span>
            <span>
              {step === "area" && "Paso 1/5"}
              {step === "photo" && "Paso 2/5"}
              {step === "analyze" && "Paso 3/5"}
              {step === "confirm" && "Paso 4/5"}
              {step === "description" && "Paso 5/5"}
              {step === "success" && "¡Completado!"}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: "0%" }}
              animate={{
                width:
                  step === "area"
                    ? "20%"
                    : step === "photo"
                    ? "40%"
                    : step === "analyze"
                    ? "50%"
                    : step === "confirm"
                    ? "70%"
                    : step === "description"
                    ? "90%"
                    : "100%",
              }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Area Selection */}
          {step === "area" && (
            <motion.div
              key="area"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Selecciona el Área</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select value={selectedAreaId} onValueChange={setSelectedAreaId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar área..." />
                    </SelectTrigger>
                    <SelectContent>
                      {areas.map((area) => (
                        <SelectItem key={area.id} value={area.id}>
                          {area.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex justify-end">
                    <Button
                      onClick={() => setStep("photo")}
                      disabled={!selectedAreaId}
                      className="gap-2"
                    >
                      Siguiente <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Photo */}
          {step === "photo" && (
            <motion.div
              key="photo"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Captura la Evidencia</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {showCamera ? (
                    <div className="space-y-4">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full rounded-lg border"
                      />
                      <canvas ref={canvasRef} className="hidden" />
                      <div className="flex gap-2">
                        <Button onClick={capturePhoto} className="flex-1 gap-2">
                          <Camera className="h-4 w-4" /> Tomar Foto
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const stream = videoRef.current?.srcObject as MediaStream;
                            stream?.getTracks().forEach((t) => t.stop());
                            setShowCamera(false);
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : photoPreview ? (
                    <div className="space-y-4">
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-full rounded-lg border max-h-80 object-cover"
                      />
                      {uploading && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Subiendo foto...
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={startCamera}
                        className="flex flex-col items-center gap-3 p-8 border-2 border-dashed rounded-xl hover:border-primary hover:bg-primary/5 transition-colors"
                      >
                        <Camera className="h-10 w-10 text-primary" />
                        <span className="text-sm font-medium">Tomar Foto</span>
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center gap-3 p-8 border-2 border-dashed rounded-xl hover:border-primary hover:bg-primary/5 transition-colors"
                      >
                        <Upload className="h-10 w-10 text-primary" />
                        <span className="text-sm font-medium">Subir Foto</span>
                      </button>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  />
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep("area")} className="gap-2">
                      <ArrowLeft className="h-4 w-4" /> Atrás
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Analyze with AI */}
          {step === "analyze" && (
            <motion.div
              key="analyze"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    Análisis con IA
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {photoPreview && (
                    <img
                      src={photoPreview}
                      alt="Foto del reporte"
                      className="w-full rounded-lg border max-h-60 object-cover"
                    />
                  )}
                  {analyzing ? (
                    <div className="flex flex-col items-center py-8">
                      <div className="w-40 h-40">
                        <LottiePlayer animationData={analyzingData} loop autoplay />
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Analizando imagen con inteligencia artificial...
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Button onClick={runAIAnalysis} className="w-full gap-2" size="lg">
                        <Brain className="h-5 w-5" />
                        Analizar con IA
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setStep("confirm")}
                        className="w-full"
                      >
                        Continuar sin análisis IA
                      </Button>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPhotoPreview("");
                        setPhotoUrl("");
                        setStep("photo");
                      }}
                      className="gap-2"
                    >
                      <ArrowLeft className="h-4 w-4" /> Cambiar foto
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 4: Confirm / Edit AI Result */}
          {step === "confirm" && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Confirmar Clasificación</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* AI Result */}
                  {aiResult && (
                    <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 space-y-3">
                      <div className="flex items-center gap-2 text-blue-800">
                        <Brain className="h-5 w-5" />
                        <span className="font-medium text-sm">Sugerencia de IA</span>
                        {aiResult.confidenceScore > 0 && (
                          <Badge variant="outline" className="text-xs">
                            Confianza: {Math.round(aiResult.confidenceScore * 100)}%
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-blue-700">{aiResult.explanation}</p>
                      {aiResult.detections.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {aiResult.detections.slice(0, 8).map((d, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {d.class} ({Math.round(d.score * 100)}%)
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Risk Type Selection */}
                  <div className="space-y-2">
                    <Label>Tipo de Riesgo</Label>
                    <Select value={selectedRiskTypeId} onValueChange={setSelectedRiskTypeId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo de riesgo..." />
                      </SelectTrigger>
                      <SelectContent>
                        {riskTypes.map((rt) => (
                          <SelectItem key={rt.id} value={rt.id}>
                            {rt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Severity */}
                  <div className="space-y-2">
                    <Label>Severidad</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["HIGH", "MEDIUM", "LOW"] as const).map((sev) => (
                        <button
                          key={sev}
                          onClick={() => setSelectedSeverity(sev)}
                          className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                            selectedSeverity === sev
                              ? severityColor(sev) + " border-current shadow-sm"
                              : "border-transparent bg-muted hover:bg-muted/80"
                          }`}
                        >
                          {severityLabel(sev)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  {selectedRiskTypeId && (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-medium text-amber-800">
                          Recomendaciones
                        </span>
                      </div>
                      <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
                        {JSON.parse(
                          riskTypes.find((r) => r.id === selectedRiskTypeId)
                            ?.recommendationsJson || "[]"
                        ).map((rec: string, i: number) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep("analyze")} className="gap-2">
                      <ArrowLeft className="h-4 w-4" /> Atrás
                    </Button>
                    <Button onClick={() => setStep("description")} disabled={!selectedRiskTypeId} className="gap-2">
                      Siguiente <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 5: Description */}
          {step === "description" && (
            <motion.div
              key="description"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Descripción del Riesgo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="description">
                      Descripción breve{" "}
                      <span className="text-muted-foreground">
                        ({description.length}/250)
                      </span>
                    </Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describa brevemente la situación de riesgo observada..."
                      maxLength={250}
                      rows={4}
                    />
                  </div>

                  {/* Anonymous toggle */}
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      {isAnonymous ? (
                        <EyeOff className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Eye className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="text-sm font-medium">Reporte anónimo</p>
                        <p className="text-xs text-muted-foreground">
                          Tu nombre no será visible en el reporte
                        </p>
                      </div>
                    </div>
                    <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep("confirm")} className="gap-2">
                      <ArrowLeft className="h-4 w-4" /> Atrás
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={submitting || !description.trim()}
                      className="gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" /> Enviar Reporte
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Success */}
          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <Card>
                <CardContent className="flex flex-col items-center py-12">
                  <div className="w-40 h-40">
                    <LottiePlayer animationData={successData} loop={false} autoplay />
                  </div>
                  <h2 className="text-xl font-bold mt-4 mb-2">
                    ¡Reporte Enviado!
                  </h2>
                  <p className="text-sm text-muted-foreground text-center mb-6">
                    Tu reporte ha sido registrado exitosamente y será revisado
                    por el equipo de seguridad.
                  </p>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => {
                        setStep("area");
                        setPhotoPreview("");
                        setPhotoUrl("");
                        setAiResult(null);
                        setDescription("");
                        setSelectedAreaId("");
                        setSelectedRiskTypeId("");
                        setSelectedSeverity("MEDIUM");
                        setIsAnonymous(false);
                      }}
                      className="gap-2"
                    >
                      Nuevo Reporte
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.push("/dashboard")}
                    >
                      Ir al Dashboard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
