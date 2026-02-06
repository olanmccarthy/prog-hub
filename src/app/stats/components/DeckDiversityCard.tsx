'use client';

import { Box, Typography, Paper, CircularProgress, Tooltip } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useEffect, useState } from 'react';
import { getDeckDiversity, type DeckDiversityStat } from '../actions';

interface DeckDiversityCardProps {
  playerId?: number;
}

export default function DeckDiversityCard({ playerId }: DeckDiversityCardProps) {
  const [data, setData] = useState<DeckDiversityStat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await getDeckDiversity(playerId);
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
  if (data.interpretation === 'Deck Innovator') color = 'var(--success)';
  else if (data.interpretation === 'Archetype Specialist') color = 'var(--accent-primary)';

  return (
    <Paper
      sx={{
        p: 2,
        backgroundColor: 'var(--bg-secondary)',
        textAlign: 'center'
      }}
    >
      <Typography variant="h5" sx={{ color }}>
        {data.diversityScore}%
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
        <Typography variant="body2" color="var(--text-secondary)">
          Deck Diversity Score
        </Typography>
        <Tooltip
          title="Measures how varied YOUR deck building is across YOUR sessions. Calculated as (unique cards you've used ÷ total card slots in your decks) × 100. Higher scores mean you experiment with many different cards, while lower scores mean you stick to similar decks each session."
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
        {data.uniqueCards} unique cards across {data.totalDecks} decks
      </Typography>
    </Paper>
  );
}
