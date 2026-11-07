export interface Product {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  pieces: number;
  provisionalPrice: number;
  imageUrl: string;
}

export type BallFinish = 'anguila' | 'sin_salsa';
export type ToppingId = 'ajonjoli' | 'cebollin' | 'aguacate';
export type SideDipId = 'soya_jalapeno' | 'chipotle_mayo';

export interface CustomizationSelection {
  finish: BallFinish;
  toppings: ToppingId[];
  dip: SideDipId;
  notes: string;
}
