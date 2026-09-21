import { httpClient } from "./httpClient";
import type { AdminDto, CreateAdminRequest, UpdateAdminRequest } from "../types/admin";

/**
 * Backend `AdminsController` (`/api/businesses/{businessId}/admins`, bkz. proje raporu bölüm 2) ile
 * birebir eşleşir — sadece SUPER_ADMIN erişir. Bir işletmenin ADMIN (işletme sahibi) kullanıcılarını
 * yönetir; bkz. `businessApi.ts`'teki desen (aynı katman, aynı sorumluluk sınırı).
 */
export const adminApi = {
  async getAll(businessId: string): Promise<AdminDto[]> {
    const response = await httpClient.get<AdminDto[]>(`/api/businesses/${businessId}/admins`);
    return response.data;
  },

  async create(businessId: string, request: CreateAdminRequest): Promise<AdminDto> {
    const response = await httpClient.post<AdminDto>(`/api/businesses/${businessId}/admins`, request);
    return response.data;
  },

  async remove(businessId: string, adminId: string): Promise<void> {
    await httpClient.delete(`/api/businesses/${businessId}/admins/${adminId}`);
  },

  async update(businessId: string, adminId: string, request: UpdateAdminRequest): Promise<AdminDto> {
    const response = await httpClient.put<AdminDto>(`/api/businesses/${businessId}/admins/${adminId}`, request);
    return response.data;
  },
};
