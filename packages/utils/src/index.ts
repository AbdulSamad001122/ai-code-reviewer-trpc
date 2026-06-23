import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 chars"),
  email: z.email("Invalid email address"),

  password: z.string().min(8, "password must be at least 8 char long"),
});

export type CreateUserSchemaType = z.infer<typeof createUserSchema>;
