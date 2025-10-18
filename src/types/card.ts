export interface Card {
  id: number;
  cardName: string;
  cardType: string | null;
  attribute: string | null;
  property: string | null;
  types: string | null;
  level: number | null;
  atk: number | null;
  def: number | null;
  link: number | null;
  pendulumScale: number | null;
}
