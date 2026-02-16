import { Box, Typography } from '@mui/material';

export function CategoryCard({ title, cards }: { title: string; cards: string[] | number[] }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography
        variant="h6"
        sx={{ color: 'var(--text-bright)', fontWeight: 'bold', mb: 1 }}
      >
        {title} ({cards.length})
      </Typography>
      {cards.length > 0 ? (
        <Box>
          {cards.map((card, idx) => (
            <Typography
              key={idx}
              variant="body1"
              sx={{ color: 'var(--text-primary)', mb: 0.5 }}
            >
              {card}
            </Typography>
          ))}
        </Box>
      ) : (
        <Typography variant="body1" sx={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
          No cards
        </Typography>
      )}
    </Box>
  );
}
