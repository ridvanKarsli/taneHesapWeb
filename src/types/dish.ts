/** Backend `DishDto` ve ilişkili istekleri (TaneHesap.Application.Dishes.DishDtos) ile birebir eşleşir. */
export interface RecipeItemDto {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  lineCost: number;
}

export interface DishSizeDto {
  id: string;
  name: string;
  salePrice: number;
  isActive: boolean;
  cost: number;
  profitMargin: number;
  recipeItems: RecipeItemDto[];
}

export interface DishDto {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  sizes: DishSizeDto[];
}

export interface CreateDishRequest {
  name: string;
  description: string | null;
}

export interface UpdateDishRequest extends CreateDishRequest {
  isActive: boolean;
}

export interface RecipeItemRequest {
  ingredientId: string;
  quantity: number;
}

export interface CreateDishSizeRequest {
  name: string;
  salePrice: number;
  recipeItems: RecipeItemRequest[];
}

export interface UpdateDishSizeRequest extends CreateDishSizeRequest {
  isActive: boolean;
}
