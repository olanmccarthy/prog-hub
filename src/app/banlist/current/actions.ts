'use server';

export interface CardOption {
  id: number;
  name: string;
}

export interface BanlistWithNames {
  banned: CardOption[];
  limited: CardOption[];
  semilimited: CardOption[];
  unlimited: CardOption[];
}
