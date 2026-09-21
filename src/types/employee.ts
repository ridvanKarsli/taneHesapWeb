/** Backend `EmployeeDto` / `Create|UpdateEmployeeRequest` ile birebir eşleşir. */
export interface EmployeeDto {
  id: string;
  username: string;
  fullName: string;
  isActive: boolean;
}

export interface CreateEmployeeRequest {
  username: string;
  password: string;
  fullName: string;
}

/** `password` null ise şifre değişmez. */
export interface UpdateEmployeeRequest {
  username: string | null;
  password: string | null;
  fullName: string | null;
  isActive: boolean;
}
