import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

export const reportCreateSchema = z.object({
  areaId: z.string().min(1, "Selecciona un área"),
  description: z.string().min(1, "La descripción es requerida").max(500, "Máximo 500 caracteres"),
  photoUrl: z.string().min(1, "La foto es requerida"),
  isAnonymous: z.boolean().default(false),
  riskTypeIdFinal: z.string().min(1, "Selecciona un tipo de riesgo"),
  severityFinal: z.enum(["HIGH", "MEDIUM", "LOW"]),
  aiSuggestedRiskTypeId: z.string().optional().nullable(),
  aiSuggestedSeverity: z.enum(["HIGH", "MEDIUM", "LOW"]).optional().nullable(),
  aiDetectionsJson: z.string().optional().nullable(),
  aiExplanation: z.string().optional().nullable(),
  aiConfidenceScore: z.number().optional().nullable(),
});

export const actionCreateSchema = z.object({
  reportId: z.string().min(1),
  assignedToId: z.string().min(1, "Selecciona un responsable"),
  dueDate: z.string().min(1, "La fecha límite es requerida"),
  description: z.string().min(1, "La descripción es requerida").max(500),
});

export const actionUpdateSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "DONE"]).optional(),
  closeComment: z.string().max(500).optional(),
  closePhotoUrl: z.string().url().optional().nullable(),
});

export const ruleConfigUpdateSchema = z.object({
  isEnabled: z.boolean(),
  minConfidenceForAutoSuggest: z.number().min(0).max(1),
  severityThresholdsJson: z.string(),
});
