import type { PaymentMethod } from "./enums";

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
  paymentMethod: PaymentMethod | null;
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
  /** Alış anında ödenen tutar; 0/null ise borç kalır. Doluysa ödeme şekli zorunlu. */
  paidAmount?: number | null;
  paymentMethod?: PaymentMethod | null;
  paymentCardId?: string | null;
}

/** Ödeme, ödeme şekline göre kasadan/karttan düşen otomatik bir Malzeme gideri olarak da işlenir (bkz. proje raporu 3.12, 3.15). */
export interface CreateSupplierPaymentRequest {
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  paymentCardId: string | null;
}
