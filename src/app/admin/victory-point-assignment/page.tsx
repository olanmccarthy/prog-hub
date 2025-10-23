'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import {
  getVictoryPointStatus,
  assignVictoryPoint,
  VictoryPointStatusResult,
} from './actions';

export default function VictoryPointAssignmentPage() {
  const [status, setStatus] = useState<VictoryPointStatusResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentOfferIndex, setCurrentOfferIndex] = useState(0);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getVictoryPointStatus();
      setStatus(result);
      if (!result.success && result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load status');
    } finally {
      setLoading(false);
    }
  };

  const handleTakeVictoryPoint = async () => {
    if (!status || !status.rankedPlayers[currentOfferIndex]) return;

    try {
      setAssigning(true);
      setError(null);
      setSuccess(null);

      const selectedPlayer = status.rankedPlayers[currentOfferIndex];
      const result = await assignVictoryPoint(selectedPlayer.playerId, status.rankedPlayers);

      if (result.success) {
        setSuccess(result.message || 'Victory point assigned successfully!');
        await loadStatus();
        setCurrentOfferIndex(0);
      } else {
        setError(result.error || 'Failed to assign victory point');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign victory point');
    } finally {
      setAssigning(false);
    }
  };

  const handlePassVictoryPoint = () => {
    if (!status || !status.rankedPlayers) return;

    // If this is the last player, automatically assign to them
    if (currentOfferIndex === status.rankedPlayers.length - 1) {
      handleTakeVictoryPoint();
    } else {
      setCurrentOfferIndex(currentOfferIndex + 1);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 3, color: 'var(--text-bright)' }}>
        Victory Point Assignment
        {status?.activeSessionNumber && (
          <Typography component="span" variant="h6" sx={{ ml: 2, color: 'var(--text-secondary)' }}>
            Session #{status.activeSessionNumber}
          </Typography>
        )}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {!status?.canAssign && status?.reason && (
        <Alert severity="info" sx={{ mb: 3 }}>
          {status.reason}
        </Alert>
      )}

      {status?.alreadyAssigned && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Victory points have already been assigned for this session.
        </Alert>
      )}

      {/* Instructions */}
      {status?.canAssign && !status?.alreadyAssigned && (
        <Paper
          sx={{
            p: 3,
            mb: 3,
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--accent-primary)',
          }}
        >
          <Typography variant="h6" sx={{ color: 'var(--text-bright)', mb: 2 }}>
            Instructions
          </Typography>
          <Typography sx={{ color: 'var(--text-primary)', mb: 1 }}>
            Starting from 1st place, each player is offered the victory point. If they choose to take it:
          </Typography>
          <Box component="ul" sx={{ color: 'var(--text-primary)', pl: 3, mb: 1 }}>
            <li>They receive 1 victory point</li>
            <li>All other players (except last place) receive wallet points based on their placement</li>
          </Box>
          <Typography sx={{ color: 'var(--text-primary)' }}>
            If they pass, the offer moves to the next player in the rankings. If everyone passes, last place automatically receives the victory point.
          </Typography>
        </Paper>
      )}

      {/* Ranked Players Table */}
      {status?.rankedPlayers && status.rankedPlayers.length > 0 && (
        <Paper
          sx={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
          }}
        >
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }}>Rank</TableCell>
                  <TableCell sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }}>Player</TableCell>
                  <TableCell sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }} align="center">
                    Match Wins
                  </TableCell>
                  <TableCell sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }} align="center">
                    Game Wins
                  </TableCell>
                  <TableCell sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }} align="center">
                    OMW%
                  </TableCell>
                  {status.canAssign && !status.alreadyAssigned && (
                    <TableCell sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }} align="center">
                      Action
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {status.rankedPlayers.map((player, index) => {
                  const isCurrentOffer = status.canAssign && !status.alreadyAssigned && index === currentOfferIndex;
                  const isLastPlace = index === status.rankedPlayers.length - 1;

                  return (
                    <TableRow
                      key={player.playerId}
                      sx={{
                        backgroundColor: isCurrentOffer ? 'var(--bg-tertiary)' : 'transparent',
                        '&:hover': {
                          backgroundColor: 'var(--bg-tertiary)',
                        },
                      }}
                    >
                      <TableCell sx={{ color: 'var(--text-primary)' }}>
                        <Chip
                          label={player.rank}
                          size="small"
                          sx={{
                            backgroundColor: player.rank === 1
                              ? 'gold'
                              : player.rank === 2
                              ? 'silver'
                              : player.rank === 3
                              ? '#cd7f32'
                              : 'var(--grey-badge)',
                            color: player.rank <= 3 ? '#000000' : 'var(--text-primary)',
                            fontWeight: 'bold',
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }}>
                        {player.playerName}
                        {isLastPlace && (
                          <Chip
                            label="No Wallet Points"
                            size="small"
                            sx={{ ml: 1, backgroundColor: 'var(--grey-badge)', color: 'var(--text-secondary)' }}
                          />
                        )}
                      </TableCell>
                      <TableCell sx={{ color: 'var(--text-primary)' }} align="center">
                        {player.matchWins}
                      </TableCell>
                      <TableCell sx={{ color: 'var(--text-primary)' }} align="center">
                        {player.gameWins}
                      </TableCell>
                      <TableCell sx={{ color: 'var(--text-primary)' }} align="center">
                        {(player.opponentMatchWinRate * 100).toFixed(1)}%
                      </TableCell>
                      {status.canAssign && !status.alreadyAssigned && (
                        <TableCell align="center">
                          {isCurrentOffer ? (
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                              <Button
                                variant="contained"
                                size="small"
                                startIcon={assigning ? <CircularProgress size={16} /> : <EmojiEventsIcon />}
                                onClick={handleTakeVictoryPoint}
                                disabled={assigning}
                                sx={{
                                  backgroundColor: 'var(--accent-primary)',
                                  '&:hover': {
                                    backgroundColor: 'var(--accent-blue-hover)',
                                  },
                                }}
                              >
                                {isLastPlace ? 'Assign VP' : 'Take VP'}
                              </Button>
                              {!isLastPlace && (
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={handlePassVictoryPoint}
                                  disabled={assigning}
                                  sx={{
                                    borderColor: 'var(--text-secondary)',
                                    color: 'var(--text-secondary)',
                                    '&:hover': {
                                      borderColor: 'var(--text-primary)',
                                      color: 'var(--text-primary)',
                                      backgroundColor: 'var(--hover-light-grey)',
                                    },
                                  }}
                                >
                                  Pass
                                </Button>
                              )}
                            </Box>
                          ) : index < currentOfferIndex ? (
                            <Chip
                              label="Passed"
                              size="small"
                              sx={{ backgroundColor: 'var(--grey-badge)', color: 'var(--text-secondary)' }}
                            />
                          ) : (
                            <Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                              Waiting...
                            </Typography>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {status?.rankedPlayers && status.rankedPlayers.length === 0 && (
        <Paper
          sx={{
            p: 4,
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            textAlign: 'center',
          }}
        >
          <Typography sx={{ color: 'var(--text-secondary)' }}>
            No players found for the active session.
          </Typography>
        </Paper>
      )}
    </Box>
  );
}
