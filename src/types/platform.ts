/** Backend `PlatformDto` / `Create|UpdatePlatformRequest` ile birebir eşleşir. */
export interface PlatformDto {
  id: string;
  name: string;
  commissionPercentage: number;
  isActive: boolean;
}

export interface CreatePlatformRequest {
  name: string;
  commissionPercentage: number;
}

export interface UpdatePlatformRequest extends CreatePlatformRequest {
  isActive: boolean;
}
