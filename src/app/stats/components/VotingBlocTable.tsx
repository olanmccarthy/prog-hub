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
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import { useEffect, useState } from 'react';
import { getVotingBlocs, type VotingBloc } from '../actions';

type ViewMode = 'list' | 'matrix';

export default function VotingBlocTable() {
  const [blocs, setBlocs] = useState<VotingBloc[]>([]);
  const [matrix, setMatrix] = useState<{ [playerId: number]: { [otherPlayerId: number]: number } }>({});
  const [playerNames, setPlayerNames] = useState<{ [playerId: number]: string }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await getVotingBlocs();
        if (result.success && result.blocs && result.matrix) {
          setBlocs(result.blocs);
          setMatrix(result.matrix);

          // Build player names map
          const names: { [playerId: number]: string } = {};
          result.blocs.forEach(bloc => {
            names[bloc.player1Id] = bloc.player1Name;
            names[bloc.player2Id] = bloc.player2Name;
          });
          setPlayerNames(names);
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

  const handleViewModeChange = (event: SelectChangeEvent<ViewMode>) => {
    setViewMode(event.target.value as ViewMode);
  };

  const handleLimitChange = (event: SelectChangeEvent<number>) => {
    setLimit(Number(event.target.value));
  };

  // Helper to get cell color based on overlap percentage
  const getCellColor = (overlap: number): string => {
    if (overlap >= 70) return 'rgba(78, 201, 176, 0.4)'; // Very high similarity
    if (overlap >= 50) return 'rgba(78, 201, 176, 0.25)'; // High similarity
    if (overlap >= 30) return 'rgba(78, 201, 176, 0.1)'; // Moderate similarity
    return 'rgba(255, 255, 255, 0.05)'; // Low similarity
  };

  if (loading) {
    return (
      <Paper sx={{ p: 3, backgroundColor: 'var(--bg-elevated)' }}>
        <Typography variant="h6" gutterBottom>
          Voting Bloc Detection
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress size={24} />
        </Box>
      </Paper>
    );
  }

  const players = Object.entries(playerNames).map(([id, name]) => ({
    id: Number(id),
    name
  }));

  return (
    <Paper sx={{ p: 3, backgroundColor: 'var(--bg-elevated)' }}>
      <Typography variant="h6" gutterBottom>
        Voting Bloc Detection
      </Typography>
      <Typography variant="body2" color="var(--text-secondary)" sx={{ mb: 2 }}>
        Voting overlap percentage between players (potential alliances)
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>View Mode</InputLabel>
          <Select value={viewMode} onChange={handleViewModeChange} label="View Mode" size="small">
            <MenuItem value="list">List View</MenuItem>
            <MenuItem value="matrix">Matrix View</MenuItem>
          </Select>
        </FormControl>

        {viewMode === 'list' && (
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Limit</InputLabel>
            <Select value={limit} onChange={handleLimitChange} label="Limit" size="small">
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={20}>20</MenuItem>
              <MenuItem value={50}>50</MenuItem>
            </Select>
          </FormControl>
        )}
      </Box>

      {error ? (
        <Typography color="var(--text-secondary)">{error}</Typography>
      ) : viewMode === 'list' ? (
        // List View
        blocs.length > 0 ? (
          <TableContainer sx={{ maxHeight: '60vh' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <TableCell><strong>Rank</strong></TableCell>
                  <TableCell><strong>Player 1</strong></TableCell>
                  <TableCell><strong>Player 2</strong></TableCell>
                  <TableCell align="right"><strong>Shared Votes</strong></TableCell>
                  <TableCell align="right"><strong>Overlap %</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {blocs.slice(0, limit).map((bloc, index) => (
                  <TableRow key={`${bloc.player1Id}-${bloc.player2Id}`}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{bloc.player1Name}</TableCell>
                    <TableCell>{bloc.player2Name}</TableCell>
                    <TableCell align="right">{bloc.sharedVotes}</TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color: bloc.overlapPercentage >= 50 ? 'var(--success)' : 'var(--text-primary)'
                      }}
                    >
                      {bloc.overlapPercentage}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography color="var(--text-secondary)">
            No voting data available
          </Typography>
        )
      ) : (
        // Matrix View
        players.length > 0 ? (
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
                  {players.map(player => (
                    <TableCell
                      key={player.id}
                      align="center"
                      sx={{
                        backgroundColor: 'var(--bg-tertiary)',
                        minWidth: 80,
                        writingMode: 'vertical-rl',
                        transform: 'rotate(180deg)',
                        padding: '8px 4px'
                      }}
                    >
                      <strong>{player.name}</strong>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {players.map(player1 => (
                  <TableRow key={player1.id}>
                    <TableCell
                      sx={{
                        position: 'sticky',
                        left: 0,
                        backgroundColor: 'var(--bg-elevated)',
                        zIndex: 2,
                        fontWeight: 'bold'
                      }}
                    >
                      {player1.name}
                    </TableCell>
                    {players.map(player2 => {
                      if (player1.id === player2.id) {
                        return (
                          <TableCell
                            key={player2.id}
                            align="center"
                            sx={{ backgroundColor: 'var(--bg-tertiary)' }}
                          >
                            —
                          </TableCell>
                        );
                      }

                      const overlap = matrix[player1.id]?.[player2.id] || 0;

                      return (
                        <Tooltip
                          key={player2.id}
                          title={
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {player1.name} & {player2.name}
                              </Typography>
                              <Typography variant="caption">
                                Voting Overlap: {overlap}%
                              </Typography>
                            </Box>
                          }
                          arrow
                        >
                          <TableCell
                            align="center"
                            sx={{
                              backgroundColor: getCellColor(overlap),
                              cursor: 'pointer',
                              '&:hover': {
                                backgroundColor: 'var(--hover-light-grey)'
                              }
                            }}
                          >
                            {overlap}%
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
            No voting data available
          </Typography>
        )
      )}

      {viewMode === 'matrix' && (
        <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
          <Typography variant="caption" color="var(--text-secondary)">
            Legend:
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 16, height: 16, backgroundColor: 'rgba(78, 201, 176, 0.4)' }} />
            <Typography variant="caption">Very High (70%+)</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 16, height: 16, backgroundColor: 'rgba(78, 201, 176, 0.25)' }} />
            <Typography variant="caption">High (50-69%)</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 16, height: 16, backgroundColor: 'rgba(78, 201, 176, 0.1)' }} />
            <Typography variant="caption">Moderate (30-49%)</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 16, height: 16, backgroundColor: 'rgba(255, 255, 255, 0.05)' }} />
            <Typography variant="caption">Low (&lt;30%)</Typography>
          </Box>
        </Box>
      )}
    </Paper>
  );
}
