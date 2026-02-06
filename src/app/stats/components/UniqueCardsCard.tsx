'use client';

import { Box, Typography, Paper, Tooltip } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

interface UniqueCardsCardProps {
  averageUniqueCards: number;
}

export default function UniqueCardsCard({ averageUniqueCards }: UniqueCardsCardProps) {
  // Determine interpretation based on value
  let interpretation = '';
  let color = 'var(--text-primary)';

  if (averageUniqueCards >= 15) {
    interpretation = 'Rogue Deck Builder';
    color = 'var(--success)';
  } else if (averageUniqueCards >= 8) {
    interpretation = 'Creative Brewer';
    color = 'var(--accent-primary)';
  } else if (averageUniqueCards >= 3) {
    interpretation = 'Meta Player';
    color = 'var(--text-primary)';
  } else {
    interpretation = 'Established Meta';
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
        {averageUniqueCards}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
        <Typography variant="body2" color="var(--text-secondary)">
          Avg Unique Cards/Session
        </Typography>
        <Tooltip
          title="Average number of cards that ONLY YOU used per session (no opponents played them). Higher values indicate you're playing cards others aren't, lower values suggest you're aligned with the meta. This measures how much of a rogue deck builder you are."
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
