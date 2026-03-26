import { z } from "zod";

const baseStudentSchema = z.object({
  name: z.string().trim().min(1),
  email: z.email().transform((value) => value.toLowerCase()),
});

export const createStudentSchema = baseStudentSchema.extend({
  password: z.string().min(6),
});

export const updateStudentSchema = baseStudentSchema.extend({
  password: z.string().min(6).optional().or(z.literal("")),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
