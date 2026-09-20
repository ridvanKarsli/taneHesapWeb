/** Backend `BusinessDto` (TaneHesap.Application.Businesses.BusinessDtos) ile birebir eşleşir. */
export interface BusinessDto {
  id: string;
  name: string;
  address: string | null;
  isActive: boolean;
  createdAtUtc: string;
}

/** Backend `CreateBusinessRequest` ile birebir eşleşir. */
export interface CreateBusinessRequest {
  name: string;
  address: string | null;
}

/** Backend `UpdateBusinessRequest` ile birebir eşleşir. */
export interface UpdateBusinessRequest {
  name: string;
  address: string | null;
  isActive: boolean;
}
