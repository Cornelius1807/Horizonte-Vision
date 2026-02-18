"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Save,
  Loader2,
  Shield,
  Gauge,
  AlertTriangle,
  History,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import AppLayout from "@/components/app-layout";

interface RuleConfig {
  id: string;
  isEnabled: boolean;
  minConfidenceForAutoSuggest: number;
  severityThresholdsJson: {
    HIGH: number;
    MEDIUM: number;
  };
  updatedAt: string;
}

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  payloadJson: string | null;
  createdAt: string;
  actor: { name: string; email: string } | null;
}

export default function AdminRulesPage() {
  const [config, setConfig] = useState<RuleConfig | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [isEnabled, setIsEnabled] = useState(true);
  const [minConfidence, setMinConfidence] = useState(50);
  const [highThreshold, setHighThreshold] = useState(5);
  const [mediumThreshold, setMediumThreshold] = useState(3);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/rules").then((r) => r.json()),
      fetch("/api/admin/audit?entityType=RuleConfig").then((r) => r.json()),
    ])
      .then(([ruleData, auditData]) => {
        setConfig(ruleData);
        setIsEnabled(ruleData.isEnabled);
        setMinConfidence(Math.round(ruleData.minConfidenceForAutoSuggest * 100));

        const thresholds =
          typeof ruleData.severityThresholdsJson === "string"
            ? JSON.parse(ruleData.severityThresholdsJson)
            : ruleData.severityThresholdsJson;
        setHighThreshold(thresholds.HIGH ?? 5);
        setMediumThreshold(thresholds.MEDIUM ?? 3);

        setAuditLogs(auditData);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Error al cargar configuración");
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    if (mediumThreshold >= highThreshold) {
      toast.error("El umbral MEDIO debe ser menor que el umbral ALTO");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isEnabled,
          minConfidenceForAutoSuggest: minConfidence / 100,
          severityThresholdsJson: JSON.stringify({
            HIGH: highThreshold,
            MEDIUM: mediumThreshold,
          }),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al guardar");
      }

      const updated = await res.json();
      setConfig(updated);
      toast.success("Configuración guardada exitosamente");

      // Refresh audit log
      const auditRes = await fetch("/api/admin/audit?entityType=RuleConfig");
      const auditData = await auditRes.json();
      setAuditLogs(auditData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setIsEnabled(true);
    setMinConfidence(50);
    setHighThreshold(5);
    setMediumThreshold(3);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Reglas del Motor IA
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configura los umbrales y parámetros del análisis automático
          </p>
        </div>

        {/* Main Config */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5" /> Configuración General
              </CardTitle>
              <CardDescription>
                Estos parámetros controlan el comportamiento del motor de análisis
                de riesgo basado en DETR (Transformers.js).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Motor IA Activo</Label>
                  <p className="text-xs text-muted-foreground">
                    Habilita o deshabilita el análisis automático de imágenes
                  </p>
                </div>
                <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
              </div>

              {/* Min Confidence */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Gauge className="h-4 w-4" />
                      Confianza Mínima
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Porcentaje mínimo de confianza para sugerir automáticamente
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-lg font-mono">
                    {minConfidence}%
                  </Badge>
                </div>
                <input
                  type="range"
                  min={10}
                  max={95}
                  step={5}
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>10% (más sugerencias)</span>
                  <span>95% (más precisión)</span>
                </div>
              </div>

              {/* Severity Thresholds */}
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Umbrales de Severidad
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Cantidad de objetos detectados para clasificar por severidad
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-red-600">
                      ALTO (≥ objetos)
                    </Label>
                    <Input
                      type="number"
                      min={2}
                      max={20}
                      value={highThreshold}
                      onChange={(e) => setHighThreshold(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-yellow-600">
                      MEDIO (≥ objetos)
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={19}
                      value={mediumThreshold}
                      onChange={(e) => setMediumThreshold(Number(e.target.value))}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground italic">
                  Detecciones por debajo de {mediumThreshold} objetos se
                  clasificarán como severidad BAJA.
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-between pt-4 border-t">
                <Button variant="ghost" onClick={handleReset} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Restablecer
                </Button>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Guardar Cambios
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Audit History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5" /> Historial de Cambios
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay cambios registrados
                </p>
              ) : (
                <div className="divide-y">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="py-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{log.actor?.name || "Sistema"}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(log.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {log.action} — {log.payloadJson || "Sin detalles"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
}
