'use client';

import { Box, Typography, Paper, CircularProgress, Tooltip } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useEffect, useState } from 'react';
import { getAverageROI, type AverageROIStat } from '../actions';

interface AverageROICardProps {
  playerId?: number;
}

export default function AverageROICard({ playerId }: AverageROICardProps) {
  const [data, setData] = useState<AverageROIStat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await getAverageROI(playerId);
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
  if (data.interpretation === 'Profitable') color = 'var(--success)';
  else if (data.interpretation === 'Loss') color = 'var(--error)';

  return (
    <Paper
      sx={{
        p: 2,
        backgroundColor: 'var(--bg-secondary)',
        textAlign: 'center'
      }}
    >
      <Typography variant="h5" sx={{ color }}>
        {data.averageROI}%
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
        <Typography variant="body2" color="var(--text-secondary)">
          Average Immediate ROI
        </Typography>
        <Tooltip
          title="For each session where you spent points, this calculates your return on investment (wallet points earned ÷ points spent) in that same session, then averages across all spending sessions."
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
        {data.spendingSessions} spending sessions
      </Typography>
      <Typography variant="caption" color="var(--text-secondary)">
        Earned: {data.totalEarned} | Spent: {data.totalSpent}
      </Typography>
    </Paper>
  );
}
