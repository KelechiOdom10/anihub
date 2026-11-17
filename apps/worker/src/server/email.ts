import { z } from "zod";

export const normalizedEmail = z.string().trim().toLowerCase().pipe(z.email());
