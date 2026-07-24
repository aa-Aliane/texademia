export interface User {
  id: string;
  email: string;
  isActive: boolean;
  isSuperuser: boolean;
  isVerified: boolean;
  firstName?: string | null;
  lastName?: string | null;
}
