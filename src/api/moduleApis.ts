import { createCrudApi, toQueryParams } from "./crudApi";
import { httpClient } from "./httpClient";
import type { AuditLogDto, AuditLogQuery } from "../types/auditLog";
import type {
  DailyActualEntryDto,
  DailyLossReportDto,
  SubmitDailyActualEntryRequest,
} from "../types/dailyClosing";
import type {
  DailySalesEntryDto,
  ExpectedDaySummaryDto,
  ImportDailySalesRequest,
  ImportDailySalesResult,
} from "../types/dailySales";
import type {
  CreateDishRequest,
  CreateDishSizeRequest,
  DishDto,
  DishSizeDto,
  UpdateDishSizeRequest,
} from "../types/dish";
import type { CreateEmployeeRequest, EmployeeDto, UpdateEmployeeRequest } from "../types/employee";
import type { CreateExpenseRequest, ExpenseDto, ExpenseListFilter } from "../types/expense";
import type { CreateExpenseTypeRequest, ExpenseTypeDto, UpdateExpenseTypeRequest } from "../types/expenseType";
import type { CreateIngredientRequest, IngredientDto, UpdateIngredientRequest } from "../types/ingredient";
import type { NotificationDto } from "../types/notification";
import type { CreatePlatformRequest, PlatformDto, UpdatePlatformRequest } from "../types/platform";
import type {
  CreateRecurringExpenseRequest,
  MarkPeriodPaidRequest,
  RecurringExpenseDto,
  UpdateRecurringExpenseRequest,
} from "../types/recurringExpense";
import type { PeriodReportDto } from "../types/report";
import type { CreateStockMovementRequest, StockMovementDto } from "../types/stock";
import type {
  CreateSupplierPaymentRequest,
  CreateSupplierPurchaseRequest,
  CreateSupplierRequest,
  SupplierDto,
  SupplierPurchaseDto,
  UpdateSupplierRequest,
} from "../types/supplier";

/**
 * İşletme (ADMIN/EMPLOYEE) modüllerinin backend istemcileri — her biri ilgili backend controller'ı
 * ile birebir eşleşir (bkz. proje raporu bölüm 10). Basit CRUD modülleri `createCrudApi`'yi kullanır.
 */

export const expenseTypeApi = createCrudApi<ExpenseTypeDto, CreateExpenseTypeRequest, UpdateExpenseTypeRequest>(
  "/api/expense-types",
);

export const ingredientApi = {
  ...createCrudApi<IngredientDto, CreateIngredientRequest, UpdateIngredientRequest>("/api/ingredients"),
  async getBelowThreshold(): Promise<IngredientDto[]> {
    return (await httpClient.get<IngredientDto[]>("/api/ingredients/below-threshold")).data;
  },
};

export const platformApi = createCrudApi<PlatformDto, CreatePlatformRequest, UpdatePlatformRequest>("/api/platforms");

export const employeeApi = createCrudApi<EmployeeDto, CreateEmployeeRequest, UpdateEmployeeRequest>("/api/employees");

export const expenseApi = {
  async getList(filter: ExpenseListFilter): Promise<ExpenseDto[]> {
    return (await httpClient.get<ExpenseDto[]>("/api/expenses", { params: toQueryParams(filter) })).data;
  },
  async create(request: CreateExpenseRequest): Promise<ExpenseDto> {
    return (await httpClient.post<ExpenseDto>("/api/expenses", request)).data;
  },
};

export const dishApi = {
  async getAll(): Promise<DishDto[]> {
    return (await httpClient.get<DishDto[]>("/api/dishes")).data;
  },
  async create(request: CreateDishRequest): Promise<DishDto> {
    return (await httpClient.post<DishDto>("/api/dishes", request)).data;
  },
  async addSize(dishId: string, request: CreateDishSizeRequest): Promise<DishSizeDto> {
    return (await httpClient.post<DishSizeDto>(`/api/dishes/${dishId}/sizes`, request)).data;
  },
  async updateSize(dishId: string, sizeId: string, request: UpdateDishSizeRequest): Promise<DishSizeDto> {
    return (await httpClient.put<DishSizeDto>(`/api/dishes/${dishId}/sizes/${sizeId}`, request)).data;
  },
};

export const stockMovementApi = {
  async getAll(ingredientId?: string): Promise<StockMovementDto[]> {
    return (await httpClient.get<StockMovementDto[]>("/api/stock-movements", { params: toQueryParams({ ingredientId }) }))
      .data;
  },
  async create(request: CreateStockMovementRequest): Promise<StockMovementDto> {
    return (await httpClient.post<StockMovementDto>("/api/stock-movements", request)).data;
  },
};

export const supplierApi = {
  ...createCrudApi<SupplierDto, CreateSupplierRequest, UpdateSupplierRequest>("/api/suppliers"),
  async getTotalDebt(): Promise<number> {
    return (await httpClient.get<number>("/api/suppliers/debt-summary")).data;
  },
  async getPurchases(supplierId: string): Promise<SupplierPurchaseDto[]> {
    return (await httpClient.get<SupplierPurchaseDto[]>(`/api/suppliers/${supplierId}/purchases`)).data;
  },
  async addPurchase(supplierId: string, request: CreateSupplierPurchaseRequest): Promise<SupplierPurchaseDto> {
    return (await httpClient.post<SupplierPurchaseDto>(`/api/suppliers/${supplierId}/purchases`, request)).data;
  },
  async addPayment(purchaseId: string, request: CreateSupplierPaymentRequest): Promise<SupplierPurchaseDto> {
    return (await httpClient.post<SupplierPurchaseDto>(`/api/suppliers/purchases/${purchaseId}/payments`, request)).data;
  },
};

export const recurringExpenseApi = {
  ...createCrudApi<RecurringExpenseDto, CreateRecurringExpenseRequest, UpdateRecurringExpenseRequest>(
    "/api/recurring-expenses",
  ),
  async markPeriodPaid(id: string, request: MarkPeriodPaidRequest): Promise<RecurringExpenseDto> {
    return (await httpClient.post<RecurringExpenseDto>(`/api/recurring-expenses/${id}/mark-period-paid`, request)).data;
  },
  async getDueForReminder(): Promise<RecurringExpenseDto[]> {
    return (await httpClient.get<RecurringExpenseDto[]>("/api/recurring-expenses/due-for-reminder")).data;
  },
};

export const dailySalesApi = {
  async getByDate(date: string): Promise<DailySalesEntryDto[]> {
    return (await httpClient.get<DailySalesEntryDto[]>("/api/daily-sales/by-date", { params: { date } })).data;
  },
  async getExpectedSummary(date: string): Promise<ExpectedDaySummaryDto> {
    return (await httpClient.get<ExpectedDaySummaryDto>("/api/daily-sales/expected-summary", { params: { date } })).data;
  },
  async import(request: ImportDailySalesRequest): Promise<ImportDailySalesResult> {
    return (await httpClient.post<ImportDailySalesResult>("/api/daily-sales/import", request)).data;
  },
};

export const dailyClosingApi = {
  async getActualEntry(date: string): Promise<DailyActualEntryDto | null> {
    return (await httpClient.get<DailyActualEntryDto | null>("/api/daily-closing/actual-entry", { params: { date } }))
      .data || null;
  },
  async submitActualEntry(request: SubmitDailyActualEntryRequest): Promise<DailyLossReportDto> {
    return (await httpClient.post<DailyLossReportDto>("/api/daily-closing/actual-entry", request)).data;
  },
  async getLossReport(date: string): Promise<DailyLossReportDto | null> {
    return (await httpClient.get<DailyLossReportDto | null>("/api/daily-closing/loss-report", { params: { date } }))
      .data || null;
  },
  async getLossReports(fromDate: string, toDate: string): Promise<DailyLossReportDto[]> {
    return (await httpClient.get<DailyLossReportDto[]>("/api/daily-closing/loss-reports", { params: { fromDate, toDate } }))
      .data;
  },
};

export const reportApi = {
  async getPeriod(fromDate: string, toDate: string): Promise<PeriodReportDto> {
    return (await httpClient.get<PeriodReportDto>("/api/reports/period", { params: { fromDate, toDate } })).data;
  },
};

export const auditLogApi = {
  async getLogs(query: AuditLogQuery): Promise<AuditLogDto[]> {
    return (await httpClient.get<AuditLogDto[]>("/api/audit-logs", { params: toQueryParams(query) })).data;
  },
};

export const notificationApi = {
  async getAll(unreadOnly: boolean): Promise<NotificationDto[]> {
    return (await httpClient.get<NotificationDto[]>("/api/notifications", { params: { unreadOnly } })).data;
  },
  async markAsRead(id: string): Promise<NotificationDto> {
    return (await httpClient.post<NotificationDto>(`/api/notifications/${id}/mark-read`)).data;
  },
};
