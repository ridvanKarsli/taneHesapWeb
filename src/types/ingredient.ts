/** Backend `IngredientDto` / `Create|UpdateIngredientRequest` ile birebir eşleşir. */
export interface IngredientDto {
  id: string;
  name: string;
  unit: string;
  currentUnitPrice: number;
  minimumStockThreshold: number;
  currentStockQuantity: number;
  isActive: boolean;
}

export interface CreateIngredientRequest {
  name: string;
  unit: string;
  currentUnitPrice: number;
  minimumStockThreshold: number;
}

export interface UpdateIngredientRequest extends CreateIngredientRequest {
  isActive: boolean;
}
