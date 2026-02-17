"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  TrendingUp,
  Loader2,
  ShieldAlert,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import AppLayout from "@/components/app-layout";

interface KPIs {
  totalReports: number;
  bySeverity: { severity: string; _count: number }[];
  totalActions: number;
  openActions: number;
  inProgressActions: number;
  doneActions: number;
  overdueActions: number;
  closedOnTimePercent: number;
  avgFirstResponseHours: number;
}

interface Trends {
  byArea: { areaId: string; areaName: string; count: number }[];
  byRiskType: { riskTypeId: string; riskTypeName: string; count: number }[];
  monthly: { month: string; count: number }[];
}

interface Area {
  id: string;
  name: string;
}

const PIE_COLORS = ["#22c55e", "#f59e0b", "#ef4444", "#6366f1"];
const BAR_COLORS = ["#3b82f6", "#06b6d4", "#8b5cf6", "#ec4899", "#f97316", "#10b981"];

export default function DashboardPage() {
  const { data: session } = useSession();
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [trends, setTrends] = useState<Trends | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [areaId, setAreaId] = useState("all");

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (areaId !== "all") params.set("areaId", areaId);

      const qs = params.toString() ? `?${params}` : "";

      const [kpisRes, trendsRes] = await Promise.all([
        fetch(`/api/metrics/kpis${qs}`),
        fetch(`/api/metrics/trends${qs}`),
      ]);

      if (!kpisRes.ok || !trendsRes.ok) throw new Error();

      setKpis(await kpisRes.json());
      setTrends(await trendsRes.json());
    } catch {
      toast.error("Error al cargar métricas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch("/api/areas")
      .then((r) => r.json())
      .then(setAreas)
      .catch(() => {});
    fetchData();
  }, []);

  useEffect(() => {
    fetchData();
  }, [from, to, areaId]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (areaId !== "all") params.set("areaId", areaId);

      const res = await fetch(`/api/admin/export/csv?${params}`);
      if (!res.ok) throw new Error();

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reportes-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV descargado");
    } catch {
      toast.error("Error al exportar CSV");
    } finally {
      setExporting(false);
    }
  };

  const severityData =
    kpis?.bySeverity?.map((s) => ({
      name:
        s.severity === "HIGH"
          ? "Alto"
          : s.severity === "MEDIUM"
          ? "Medio"
          : "Bajo",
      value: s._count,
    })) || [];

  const canExport =
    session?.user?.role &&
    ["SUPERVISOR", "CSST", "ADMIN"].includes(session.user.role);

  if (loading && !kpis) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Panorama general de reportes y acciones
            </p>
          </div>
          {canExport && (
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={exporting}
              className="gap-2"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Exportar CSV
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="space-y-1 flex-1">
                <Label className="text-xs">Desde</Label>
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1 flex-1">
                <Label className="text-xs">Hasta</Label>
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
              <div className="space-y-1 flex-1">
                <Label className="text-xs">Área</Label>
                <Select value={areaId} onValueChange={setAreaId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las áreas</SelectItem>
                    {areas.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
          >
            <Card>
              <CardContent className="p-4 text-center">
                <FileText className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <p className="text-3xl font-bold">{kpis?.totalReports ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total Reportes</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent className="p-4 text-center">
                <ShieldAlert className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                <p className="text-3xl font-bold">{kpis?.openActions ?? 0}</p>
                <p className="text-xs text-muted-foreground">Acciones Abiertas</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardContent className="p-4 text-center">
                <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-3xl font-bold">
                  {kpis?.closedOnTimePercent ?? 0}%
                </p>
                <p className="text-xs text-muted-foreground">Cierre a Tiempo</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                <p className="text-3xl font-bold">
                  {kpis?.avgFirstResponseHours
                    ? `${Math.round(kpis.avgFirstResponseHours)}h`
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Resp. Promedio
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-yellow-600">
                {kpis?.overdueActions ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Vencidas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-blue-600">
                {kpis?.inProgressActions ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">En Progreso</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-green-600">
                {kpis?.doneActions ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Completadas</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Reports by Area */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Reportes por Área</CardTitle>
              </CardHeader>
              <CardContent>
                {trends?.byArea && trends.byArea.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={trends.byArea}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="areaName"
                        tick={{ fontSize: 11 }}
                        angle={-20}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" name="Reportes" radius={[4, 4, 0, 0]}>
                        {trends.byArea.map((_, i) => (
                          <Cell
                            key={i}
                            fill={BAR_COLORS[i % BAR_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Sin datos
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Severity Distribution */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Distribución por Severidad
                </CardTitle>
              </CardHeader>
              <CardContent>
                {severityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={severityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {severityData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={PIE_COLORS[i % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Sin datos
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Monthly Trend */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="md:col-span-2"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Tendencia Mensual
                </CardTitle>
              </CardHeader>
              <CardContent>
                {trends?.monthly && trends.monthly.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={trends.monthly}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="count"
                        name="Reportes"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ fill: "#3b82f6", r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Sin datos de tendencia
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Risk Types Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="md:col-span-2"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Reportes por Tipo de Riesgo</CardTitle>
              </CardHeader>
              <CardContent>
                {trends?.byRiskType && trends.byRiskType.length > 0 ? (
                  <div className="divide-y">
                    {trends.byRiskType.map((rt, i) => (
                      <div
                        key={rt.riskTypeId}
                        className="flex items-center justify-between py-2"
                      >
                        <span className="text-sm">{rt.riskTypeName}</span>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${Math.max(
                                20,
                                (rt.count /
                                  Math.max(
                                    ...trends.byRiskType.map((r) => r.count)
                                  )) *
                                  120
                              )}px`,
                              backgroundColor:
                                BAR_COLORS[i % BAR_COLORS.length],
                            }}
                          />
                          <Badge variant="secondary">{rt.count}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Sin datos
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
