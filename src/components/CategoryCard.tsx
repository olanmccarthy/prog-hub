import { Box, Typography } from '@mui/material';
import { CardImage } from './CardImage';

interface CardItem {
  id: number;
  name: string;
}

/** Pairs parallel arrays of card IDs and names into a single array of CardItems. */
export function zipCards(ids: number[], names: string[]): CardItem[] {
  return ids.map((id, i) => ({ id, name: names[i] }));
}

/**
 * Displays a titled section of card images in a 4-column grid.
 * Used by VotingBanlistCard to render each banlist category (Banned, Limited, etc.).
 */
export function CategoryCard({
  title,
  cards,
}: {
  title: string;
  cards: CardItem[];
}) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography
        variant="h6"
        sx={{ color: 'var(--text-bright)', fontWeight: 'bold', mb: 1 }}
      >
        {title} ({cards.length})
      </Typography>
      <Box
        sx={{ p: 2, backgroundColor: 'var(--bg-secondary)', borderRadius: 1 }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 1.5,
          }}
        >
          {cards.length > 0 ? (
            cards.map((card) => (
              <CardImage
                key={card.id}
                cardId={card.id}
                alt={card.name}
                width="100%"
              />
            ))
          ) : (
            /* Empty placeholder that matches card image aspect ratio via the same SVG fallback */
            <Box
              component="img"
              src="/card-placeholder.svg"
              sx={{ width: '100%', height: 'auto', visibility: 'hidden' }}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
}
