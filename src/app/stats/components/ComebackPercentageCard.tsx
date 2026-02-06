'use client';

import { Box, Typography, Paper, CircularProgress, Tooltip } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useEffect, useState } from 'react';
import { getComebackPercentage, type ComebackStat } from '../actions';

interface ComebackPercentageCardProps {
  playerId?: number;
}

export default function ComebackPercentageCard({ playerId }: ComebackPercentageCardProps) {
  const [data, setData] = useState<ComebackStat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await getComebackPercentage(playerId);
        if (result.success && result.playerStats) {
          setData(result.playerStats);
        } else {
          setError(result.error || 'Failed to load data');
        }
      } catch (err) {
        setError('An unexpected error occurred');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [playerId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Typography color="var(--text-secondary)" sx={{ p: 2 }}>
        {error || 'No data available'}
      </Typography>
    );
  }

  // Color code based on interpretation
  let color = 'var(--text-primary)';
  if (data.interpretation === 'Clutch Player') color = 'var(--success)';
  else if (data.interpretation === 'Dominant Player') color = 'var(--accent-primary)';

  return (
    <Paper
      sx={{
        p: 2,
        backgroundColor: 'var(--bg-secondary)',
        textAlign: 'center'
      }}
    >
      <Typography variant="h5" sx={{ color }}>
        {data.comebackPercentage}%
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
        <Typography variant="body2" color="var(--text-secondary)">
          Close Game Win Rate
        </Typography>
        <Tooltip
          title="Percentage of your match wins that were 2-1 (comeback victories) vs 2-0 (dominant victories). Calculated as (2-1 wins ÷ total match wins) × 100. >60% = Clutch Player (wins close games), <40% = Dominant Player (wins decisively), 40-60% = Balanced."
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
        {data.interpretation}
      </Typography>
      <Typography variant="caption" color="var(--text-secondary)" sx={{ mt: 0.5, display: 'block' }}>
        2-0 Wins: {data.twoZeroWins} | 2-1 Wins: {data.twoOneWins}
      </Typography>
    </Paper>
  );
}
