import { httpClient } from "./httpClient";

/**
 * Backend'deki "liste + oluştur + güncelle" desenini (`GET /x`, `POST /x`, `PUT /x/{id}`) izleyen
 * modüller için ortak istemci. Her modül için aynı üç metodu tekrar yazmak yerine (DRY) bu fabrika
 * kullanılır; modüle özel ek uç noktalar ilgili api dosyasında bu nesneye eklenir (Open/Closed).
 */
export interface CrudApi<TDto, TCreate, TUpdate> {
  getAll(): Promise<TDto[]>;
  create(request: TCreate): Promise<TDto>;
  update(id: string, request: TUpdate): Promise<TDto>;
  remove(id: string): Promise<void>;
}

export function createCrudApi<TDto, TCreate, TUpdate>(basePath: string): CrudApi<TDto, TCreate, TUpdate> {
  return {
    async getAll() {
      return (await httpClient.get<TDto[]>(basePath)).data;
    },
    async create(request) {
      return (await httpClient.post<TDto>(basePath, request)).data;
    },
    async update(id, request) {
      return (await httpClient.put<TDto>(`${basePath}/${id}`, request)).data;
    },
    async remove(id) {
      await httpClient.delete(`${basePath}/${id}`);
    },
  };
}

/** Boş/undefined değerleri atarak query string parametresi üretir. */
export function toQueryParams(values: object): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  ) as Record<string, string>;
}
