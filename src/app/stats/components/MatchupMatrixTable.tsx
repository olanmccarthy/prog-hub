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
  Box,
  Tooltip
} from '@mui/material';
import { useEffect, useState } from 'react';
import { getMatchupMatrix, type MatchupRecord } from '../actions';

export default function MatchupMatrixTable() {
  const [matrix, setMatrix] = useState<{ [playerId: number]: MatchupRecord[] }>({});
  const [players, setPlayers] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await getMatchupMatrix();
        if (result.success && result.matrix && result.allPlayers) {
          setMatrix(result.matrix);
          setPlayers(result.allPlayers);
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
  }, []);

  // Helper to get matchup record between two players
  const getMatchup = (playerId: number, opponentId: number): MatchupRecord | null => {
    if (playerId === opponentId) return null;
    const playerRecords = matrix[playerId];
    if (!playerRecords) return null;
    return playerRecords.find(r => r.opponentId === opponentId) || null;
  };

  // Helper to get cell color based on win rate
  const getCellColor = (winRate: number): string => {
    if (winRate >= 70) return 'rgba(78, 201, 176, 0.3)'; // Strong green
    if (winRate >= 55) return 'rgba(78, 201, 176, 0.15)'; // Light green
    if (winRate >= 45) return 'rgba(255, 255, 255, 0.05)'; // Neutral
    if (winRate >= 30) return 'rgba(244, 135, 113, 0.15)'; // Light red
    return 'rgba(244, 135, 113, 0.3)'; // Strong red
  };

  if (loading) {
    return (
      <Paper sx={{ p: 3, backgroundColor: 'var(--bg-elevated)' }}>
        <Typography variant="h6" gutterBottom>
          Player Matchup Matrix
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
        Player Matchup Matrix
      </Typography>
      <Typography variant="body2" color="var(--text-secondary)" sx={{ mb: 2 }}>
        Head-to-head win rates (hover for details)
      </Typography>

      {error ? (
        <Typography color="var(--text-secondary)">{error}</Typography>
      ) : players.length > 0 ? (
        <TableContainer sx={{ maxHeight: '70vh', overflowX: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    position: 'sticky',
                    left: 0,
                    backgroundColor: 'var(--bg-tertiary)',
                    zIndex: 3,
                    minWidth: 120
                  }}
                >
                  <strong>Player</strong>
                </TableCell>
                {players.map(opponent => (
                  <TableCell
                    key={opponent.id}
                    align="center"
                    sx={{
                      backgroundColor: 'var(--bg-tertiary)',
                      minWidth: 80,
                      writingMode: 'vertical-rl',
                      transform: 'rotate(180deg)',
                      padding: '8px 4px'
                    }}
                  >
                    <strong>{opponent.name}</strong>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {players.map(player => (
                <TableRow key={player.id}>
                  <TableCell
                    sx={{
                      position: 'sticky',
                      left: 0,
                      backgroundColor: 'var(--bg-elevated)',
                      zIndex: 2,
                      fontWeight: 'bold'
                    }}
                  >
                    {player.name}
                  </TableCell>
                  {players.map(opponent => {
                    if (player.id === opponent.id) {
                      return (
                        <TableCell
                          key={opponent.id}
                          align="center"
                          sx={{ backgroundColor: 'var(--bg-tertiary)' }}
                        >
                          —
                        </TableCell>
                      );
                    }

                    const matchup = getMatchup(player.id, opponent.id);

                    if (!matchup) {
                      return (
                        <TableCell key={opponent.id} align="center" sx={{ color: 'var(--text-secondary)' }}>
                          —
                        </TableCell>
                      );
                    }

                    return (
                      <Tooltip
                        key={opponent.id}
                        title={
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {player.name} vs {opponent.name}
                            </Typography>
                            <Typography variant="caption">
                              Record: {matchup.matchWins}-{matchup.matchLosses}-{matchup.matchDraws}
                            </Typography>
                            <br />
                            <Typography variant="caption">
                              Win Rate: {matchup.winRate}%
                            </Typography>
                          </Box>
                        }
                        arrow
                      >
                        <TableCell
                          align="center"
                          sx={{
                            backgroundColor: getCellColor(matchup.winRate),
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: 'var(--hover-light-grey)'
                            }
                          }}
                        >
                          {matchup.winRate}%
                        </TableCell>
                      </Tooltip>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography color="var(--text-secondary)">
          No matchup data available
        </Typography>
      )}

      <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Typography variant="caption" color="var(--text-secondary)">
          Legend:
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 16, height: 16, backgroundColor: 'rgba(78, 201, 176, 0.3)' }} />
          <Typography variant="caption">Strong (70%+)</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 16, height: 16, backgroundColor: 'rgba(78, 201, 176, 0.15)' }} />
          <Typography variant="caption">Good (55-69%)</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 16, height: 16, backgroundColor: 'rgba(255, 255, 255, 0.05)' }} />
          <Typography variant="caption">Even (45-54%)</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 16, height: 16, backgroundColor: 'rgba(244, 135, 113, 0.15)' }} />
          <Typography variant="caption">Poor (30-44%)</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 16, height: 16, backgroundColor: 'rgba(244, 135, 113, 0.3)' }} />
          <Typography variant="caption">Bad (&lt;30%)</Typography>
        </Box>
      </Box>
    </Paper>
  );
}
