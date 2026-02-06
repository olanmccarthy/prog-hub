'use client';

import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Box
} from '@mui/material';
import { useEffect, useState } from 'react';
import { getCardSynergies, type CardSynergyPair } from '../actions';

interface CardSynergiesTableProps {
  minAppearances?: number;
  limit?: number;
}

export default function CardSynergiesTable({ minAppearances = 2, limit = 20 }: CardSynergiesTableProps) {
  const [data, setData] = useState<CardSynergyPair[]>([]);
  const [totalDecks, setTotalDecks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await getCardSynergies(minAppearances);
        if (result.success && result.synergies) {
          setData(result.synergies.slice(0, limit));
          setTotalDecks(result.totalDecksAnalyzed || 0);
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
  }, [minAppearances, limit]);

  if (loading) {
    return (
      <Paper sx={{ p: 3, backgroundColor: 'var(--bg-elevated)' }}>
        <Typography variant="h6" gutterBottom>
          Card Synergies (Top 3 Decks)
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress size={24} />
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, backgroundColor: 'var(--bg-elevated)' }}>
      <Typography variant="h6" gutterBottom>
        Card Synergies (Top 3 Decks)
      </Typography>
      <Typography variant="body2" color="var(--text-secondary)" sx={{ mb: 2 }}>
        Card pairs that frequently appear together in winning decks ({totalDecks} decks analyzed)
      </Typography>

      {error ? (
        <Typography color="var(--text-secondary)">{error}</Typography>
      ) : data.length > 0 ? (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <TableCell><strong>Rank</strong></TableCell>
                <TableCell><strong>Card 1</strong></TableCell>
                <TableCell><strong>Card 2</strong></TableCell>
                <TableCell align="right"><strong>Appearances</strong></TableCell>
                <TableCell align="right"><strong>% of Decks</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((pair, index) => (
                <TableRow key={`${pair.card1Id}-${pair.card2Id}`}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{pair.card1Name}</TableCell>
                  <TableCell>{pair.card2Name}</TableCell>
                  <TableCell align="right">{pair.appearanceCount}</TableCell>
                  <TableCell align="right">{pair.percentage}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography color="var(--text-secondary)">
          No synergies found. Need at least {minAppearances} co-appearances.
        </Typography>
      )}
    </Paper>
  );
}
