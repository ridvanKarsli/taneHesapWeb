/** Backend `AdminDto` (TaneHesap.Application.Admins.AdminDtos) ile birebir eşleşir. */
export interface AdminDto {
  id: string;
  username: string;
  fullName: string;
  isActive: boolean;
}

/** Backend `CreateAdminRequest` ile birebir eşleşir. */
export interface CreateAdminRequest {
  username: string;
  password: string;
  fullName: string;
}

/** Backend `UpdateAdminRequest` ile birebir eşleşir. */
export interface UpdateAdminRequest {
  username: string | null;
  password: string | null;
  fullName: string | null;
  isActive: boolean;
}
