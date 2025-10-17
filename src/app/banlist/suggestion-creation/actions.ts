'use server';

 import { getDataSource } from '@lib/data-source';
 import { BanlistSuggestion } from '@entities/BanlistSuggestion';
 import { getCurrentUser } from '@lib/auth';

 export interface CreateSuggestionInput {
   banlistId: number;
   banned: string[];
   limited: string[];
   semilimited: string[];
   unlimited: string[];
 }

 export async function createBanlistSuggestion(input: CreateSuggestionInput) {
   try {
     const user = await getCurrentUser();
     if (!user?.playerId) {
       return { success: false, error: 'Not authenticated' };
     }

     const dataSource = await getDataSource();
     const repo = dataSource.getRepository(BanlistSuggestion);

     const suggestion = repo.create({
       player: { id: user.playerId },
       banlist: { id: input.banlistId },
       banned: input.banned,
       limited: input.limited,
       semilimited: input.semilimited,
       unlimited: input.unlimited,
       chosen: false,
     });

     await repo.save(suggestion);

     return { success: true, id: suggestion.id }; // Database assigns the ID
   } catch (error) {
     return {
       success: false,
       error:
         error instanceof Error ? error.message : 'Failed to create suggestion',
     };
   }
 }
