"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  ClipboardList,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Filter,
  Camera,
  Upload,
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { toast } from "sonner";
import {
  formatDate,
  statusLabel,
  statusColor,
  severityLabel,
  severityColor,
} from "@/lib/utils";
import AppLayout from "@/components/app-layout";

interface Action {
  id: string;
  reportId: string;
  description: string;
  status: string;
  dueDate: string;
  createdAt: string;
  closedAt: string | null;
  closeComment: string | null;
  closePhotoUrl: string | null;
  report: {
    id: string;
    description: string;
    severityFinal: string;
    area: { name: string };
    riskTypeFinal: { name: string } | null;
  };
  assignedTo: { id: string; name: string; role: string };
  assignedBy: { id: string; name: string };
}

interface Report {
  id: string;
  description: string;
  severityFinal: string;
  area: { name: string };
}

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function ActionsPage() {
  const { data: session } = useSession();
  const [actions, setActions] = useState<Action[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [closeComment, setCloseComment] = useState("");
  const [closePhotoUrl, setClosePhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Create form state
  const [newAction, setNewAction] = useState({
    reportId: "",
    assignedToId: "",
    dueDate: "",
    description: "",
  });

  const loadActions = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/actions?${params}`);
      const data = await res.json();
      setActions(data);
    } catch {
      toast.error("Error al cargar acciones");
    }
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/actions").then((r) => r.json()),
      fetch("/api/reports").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
    ])
      .then(([actionsData, reportsData, usersData]) => {
        setActions(actionsData);
        setReports(reportsData);
        setUsers(usersData);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Error al cargar datos");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!loading) loadActions();
  }, [statusFilter]);

  const handleCreateAction = async () => {
    if (!newAction.reportId || !newAction.assignedToId || !newAction.dueDate || !newAction.description) {
      toast.error("Complete todos los campos");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAction),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al crear acción");
      }

      toast.success("Acción creada exitosamente");
      setShowCreate(false);
      setNewAction({ reportId: "", assignedToId: "", dueDate: "", description: "" });
      loadActions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear acción");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (newStatus === "DONE") {
      setClosingId(id);
      return;
    }

    try {
      const res = await fetch(`/api/actions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error();
      toast.success("Estado actualizado");
      loadActions();
    } catch {
      toast.error("Error al actualizar estado");
    }
  };

  const handleClose = async () => {
    if (!closingId) return;

    try {
      const res = await fetch(`/api/actions/${closingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "DONE",
          closeComment: closeComment || undefined,
          closePhotoUrl: closePhotoUrl || undefined,
        }),
      });

      if (!res.ok) throw new Error();
      toast.success("Acción cerrada exitosamente");
      setClosingId(null);
      setCloseComment("");
      setClosePhotoUrl("");
      loadActions();
    } catch {
      toast.error("Error al cerrar la acción");
    }
  };

  const handleClosePhotoUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "action-close-photos");

      const res = await fetch("/api/blob/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error();
      const data = await res.json();
      setClosePhotoUrl(data.url);
      toast.success("Foto de evidencia subida");
    } catch {
      toast.error("Error al subir foto");
    } finally {
      setUploading(false);
    }
  };

  const isOverdue = (action: Action) =>
    action.status !== "DONE" && new Date(action.dueDate) < new Date();

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </AppLayout>
    );
  }

  const canCreate = session?.user?.role && ["SUPERVISOR", "CSST", "ADMIN"].includes(session.user.role);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-primary" />
              Acciones Correctivas
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestiona las acciones asignadas a los reportes
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="OPEN">Abiertas</SelectItem>
                <SelectItem value="IN_PROGRESS">En progreso</SelectItem>
                <SelectItem value="DONE">Completadas</SelectItem>
              </SelectContent>
            </Select>
            {canCreate && (
              <Button onClick={() => setShowCreate(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Nueva
              </Button>
            )}
          </div>
        </div>

        {/* Create Form */}
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">Nueva Acción Correctiva</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Reporte</Label>
                    <Select
                      value={newAction.reportId}
                      onValueChange={(v) =>
                        setNewAction((prev) => ({ ...prev, reportId: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar reporte..." />
                      </SelectTrigger>
                      <SelectContent>
                        {reports.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.area?.name || "Sin área"} - {r.description?.slice(0, 40)}...
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Asignar a</Label>
                    <Select
                      value={newAction.assignedToId}
                      onValueChange={(v) =>
                        setNewAction((prev) => ({ ...prev, assignedToId: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar responsable..." />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name} ({u.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Fecha límite</Label>
                  <Input
                    type="date"
                    value={newAction.dueDate}
                    onChange={(e) =>
                      setNewAction((prev) => ({ ...prev, dueDate: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descripción de la acción</Label>
                  <Textarea
                    value={newAction.description}
                    onChange={(e) =>
                      setNewAction((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Describa la acción correctiva a realizar..."
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreate(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateAction} disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Creando...
                      </>
                    ) : (
                      "Crear Acción"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Close Action Modal */}
        {closingId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          >
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Cerrar Acción</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Comentario de cierre</Label>
                  <Textarea
                    value={closeComment}
                    onChange={(e) => setCloseComment(e.target.value)}
                    placeholder="Describa las acciones realizadas..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Evidencia fotográfica (opcional)</Label>
                  {closePhotoUrl ? (
                    <img
                      src={closePhotoUrl}
                      alt="Evidencia"
                      className="w-full rounded-lg border max-h-40 object-cover"
                    />
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full p-4 border-2 border-dashed rounded-lg hover:border-primary/50 flex items-center justify-center gap-2 text-sm text-muted-foreground"
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {uploading ? "Subiendo..." : "Subir foto de evidencia"}
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleClosePhotoUpload(file);
                    }}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setClosingId(null)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleClose}>Cerrar Acción</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Actions List */}
        {actions.length === 0 ? (
          <EmptyState
            title="No hay acciones"
            description="Las acciones correctivas aparecerán aquí cuando se creen desde los reportes."
          />
        ) : (
          <div className="space-y-3">
            {actions.map((action, i) => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className={isOverdue(action) ? "border-red-200 bg-red-50/30" : ""}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge className={statusColor(action.status)}>
                            {statusLabel(action.status)}
                          </Badge>
                          {action.report?.severityFinal && (
                            <Badge className={severityColor(action.report.severityFinal)}>
                              {severityLabel(action.report.severityFinal)}
                            </Badge>
                          )}
                          {isOverdue(action) && (
                            <Badge variant="destructive" className="gap-1">
                              <AlertCircle className="h-3 w-3" /> Vencida
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium">{action.description}</p>
                        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                          <p>
                            📍 {action.report?.area?.name} — {action.report?.riskTypeFinal?.name || "Sin tipo"}
                          </p>
                          <p>
                            👤 Asignada a: {action.assignedTo?.name || "—"} | Por: {action.assignedBy?.name || "—"}
                          </p>
                          <p className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Fecha límite: {formatDate(action.dueDate)}
                          </p>
                          {action.closedAt && (
                            <p className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="h-3 w-3" />
                              Cerrada: {formatDate(action.closedAt)}
                            </p>
                          )}
                          {action.closeComment && (
                            <p className="mt-1 italic">
                              &quot;{action.closeComment}&quot;
                            </p>
                          )}
                        </div>
                        {action.closePhotoUrl && (
                          <img
                            src={action.closePhotoUrl}
                            alt="Evidencia de cierre"
                            className="mt-2 rounded-lg border max-h-32 object-cover"
                          />
                        )}
                      </div>

                      {/* Status change buttons */}
                      {action.status !== "DONE" && canCreate && (
                        <div className="flex sm:flex-col gap-2 shrink-0">
                          {action.status === "OPEN" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(action.id, "IN_PROGRESS")}
                            >
                              Iniciar
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(action.id, "DONE")}
                          >
                            Cerrar
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
