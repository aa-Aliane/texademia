import { z } from "zod";

// login schema
export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// register schema
export const registerSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

// profile schema
export const profileSchema = z.object({
  firstName: z.string().max(100).optional().or(z.literal("")),
  lastName: z.string().max(100).optional().or(z.literal("")),
});
export type ProfileInput = z.infer<typeof profileSchema>;

// email verification schemas
export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Missing verification token"),
});
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const resendVerificationSchema = z.object({
  email: z.string().email("Enter a valid email"),
});
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
