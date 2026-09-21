/** Backend `SupplierDto` ve alış/ödeme DTO'ları (TaneHesap.Application.Suppliers) ile birebir eşleşir. */
export interface SupplierDto {
  id: string;
  name: string;
  contactInfo: string | null;
  isActive: boolean;
  totalOutstandingDebt: number;
}

export interface CreateSupplierRequest {
  name: string;
  contactInfo: string | null;
}

export interface UpdateSupplierRequest extends CreateSupplierRequest {
  isActive: boolean;
}

export interface SupplierPaymentDto {
  id: string;
  amount: number;
  paymentDate: string;
}

export interface SupplierPurchaseDto {
  id: string;
  supplierId: string;
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  purchaseDate: string;
  isFullyPaid: boolean;
  paidAmount: number;
  remainingAmount: number;
  payments: SupplierPaymentDto[];
}

export interface CreateSupplierPurchaseRequest {
  ingredientId: string;
  quantity: number;
  unitPrice: number;
  purchaseDate: string;
}

export interface CreateSupplierPaymentRequest {
  amount: number;
  paymentDate: string;
}
