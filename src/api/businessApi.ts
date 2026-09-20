import { httpClient } from "./httpClient";
import type { BusinessDto, CreateBusinessRequest, UpdateBusinessRequest } from "../types/business";

/** Backend `BusinessesController` (bkz. proje raporu bölüm 2, 10) ile birebir eşleşir — sadece SUPER_ADMIN erişir. */
export const businessApi = {
  async getAll(): Promise<BusinessDto[]> {
    const response = await httpClient.get<BusinessDto[]>("/api/businesses");
    return response.data;
  },

  async create(request: CreateBusinessRequest): Promise<BusinessDto> {
    const response = await httpClient.post<BusinessDto>("/api/businesses", request);
    return response.data;
  },

  async update(id: string, request: UpdateBusinessRequest): Promise<BusinessDto> {
    const response = await httpClient.put<BusinessDto>(`/api/businesses/${id}`, request);
    return response.data;
  },
};
