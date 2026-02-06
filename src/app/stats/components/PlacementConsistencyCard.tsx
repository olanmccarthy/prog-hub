'use client';

import { Box, Typography, Paper, CircularProgress, Tooltip } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useEffect, useState } from 'react';
import { getPlacementConsistency, type PlacementConsistencyStat } from '../actions';

interface PlacementConsistencyCardProps {
  playerId?: number;
}

export default function PlacementConsistencyCard({ playerId }: PlacementConsistencyCardProps) {
  const [data, setData] = useState<PlacementConsistencyStat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await getPlacementConsistency(playerId);
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
  if (data.interpretation === 'Highly Consistent') color = 'var(--success)';
  else if (data.interpretation === 'Volatile') color = 'var(--warning)';

  return (
    <Paper
      sx={{
        p: 2,
        backgroundColor: 'var(--bg-secondary)',
        textAlign: 'center'
      }}
    >
      <Typography variant="h5" sx={{ color }}>
        {data.standardDeviation}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
        <Typography variant="body2" color="var(--text-secondary)">
          Placement Consistency (σ)
        </Typography>
        <Tooltip
          title="Measures how consistently you place across sessions using standard deviation (σ). Lower values mean you consistently place at similar ranks, while higher values mean your placements vary widely. <1.0 = Highly Consistent, 1.0-1.8 = Moderately Consistent, >1.8 = Volatile."
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
        Avg: {data.averagePlacement} ({data.sessionsPlayed} sessions)
      </Typography>
    </Paper>
  );
}
