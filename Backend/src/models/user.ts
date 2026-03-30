export type UserRole = "free" | "pro" | "enterprise";

export type User = {
  id: string;
  email: string;
  role: UserRole;
  created_at?: string;
  updated_at?: string;
};
