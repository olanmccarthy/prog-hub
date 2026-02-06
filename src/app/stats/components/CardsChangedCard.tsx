'use client';

import { Box, Typography, Paper, Tooltip } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

interface CardsChangedCardProps {
  averageCardsChanged: number;
}

export default function CardsChangedCard({ averageCardsChanged }: CardsChangedCardProps) {
  // Determine interpretation based on value
  let interpretation = '';
  let color = 'var(--text-primary)';

  if (averageCardsChanged >= 30) {
    interpretation = 'Radical Innovator';
    color = 'var(--success)';
  } else if (averageCardsChanged >= 15) {
    interpretation = 'Active Tweaker';
    color = 'var(--accent-primary)';
  } else if (averageCardsChanged >= 5) {
    interpretation = 'Modest Adjuster';
    color = 'var(--text-primary)';
  } else {
    interpretation = 'Deck Loyalist';
    color = 'var(--text-secondary)';
  }

  return (
    <Paper
      sx={{
        p: 2,
        backgroundColor: 'var(--bg-secondary)',
        textAlign: 'center'
      }}
    >
      <Typography variant="h5" sx={{ color }}>
        {averageCardsChanged}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
        <Typography variant="body2" color="var(--text-secondary)">
          Avg Cards Changed/Session
        </Typography>
        <Tooltip
          title="Average number of cards changed (added + removed) between consecutive sessions. Counts all cards added to next deck plus all cards removed from previous deck. Higher values show frequent iteration, lower values indicate deck consistency."
          placement="top"
          arrow
        >
          <HelpOutlineIcon
            sx={{
              fontSize: 16,
              color: 'var(--text-secondary)',
              cursor: 'help',
              '&:hover': { color: 'var(--accent-primary)' }
            }}
          />
        </Tooltip>
      </Box>
      <Typography variant="caption" sx={{ color, fontWeight: 'bold', mt: 0.5, display: 'block' }}>
        {interpretation}
      </Typography>
    </Paper>
  );
}
