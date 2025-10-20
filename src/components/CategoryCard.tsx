import { Box, Typography } from '@mui/material';

export function CategoryCard({ title, cards }: { title: string; cards: string[] | number[] }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography
        variant="subtitle1"
        sx={{ color: 'var(--text-bright)', fontWeight: 'bold', mb: 1 }}
      >
        {title} ({cards.length})
      </Typography>
      {cards.length > 0 ? (
        <Box sx={{ pl: 2 }}>
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
        <Typography variant="body1" sx={{ color: 'var(--text-secondary)' }}>
          No cards
        </Typography>
      )}
    </Box>
  );
}
