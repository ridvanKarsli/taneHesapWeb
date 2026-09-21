import type { StockMovementType } from "./enums";

/** Backend `StockMovementDto` / `CreateStockMovementRequest` ile birebir eşleşir. */
export interface StockMovementDto {
  id: string;
  ingredientId: string;
  ingredientName: string;
  quantityChange: number;
  movementType: StockMovementType;
  movementDateUtc: string;
  sourceReferenceType: string | null;
  sourceReferenceId: string | null;
  note: string | null;
  resultingStockQuantity: number;
}

export interface CreateStockMovementRequest {
  ingredientId: string;
  quantityChange: number;
  movementType: StockMovementType;
  note: string | null;
}
