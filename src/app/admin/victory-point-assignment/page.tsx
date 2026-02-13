'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import {
  LoadingBox,
  ErrorAlert,
  SuccessAlert,
  InfoAlert,
  PrimaryButton,
  SecondaryButton,
} from '@/src/components';
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

      // Set initial offer index based on reverseVpOrder modifier
      if (result.success && result.rankedPlayers.length > 0) {
        if (result.reverseVpOrder) {
          // Start from last place (6th) when reversed
          setCurrentOfferIndex(result.rankedPlayers.length - 1);
        } else {
          // Start from 1st place normally
          setCurrentOfferIndex(0);
        }
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
        // currentOfferIndex will be reset by loadStatus based on reverseVpOrder
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

    const isReversed = status.reverseVpOrder;
    const isLastOffer = isReversed
      ? currentOfferIndex === 0 // Last offer is at index 0 when reversed (1st place)
      : currentOfferIndex === status.rankedPlayers.length - 1; // Last offer is at last index normally (6th place)

    // If this is the last player in the sequence, automatically assign to them
    if (isLastOffer) {
      handleTakeVictoryPoint();
    } else {
      // Move to next player in the sequence
      if (isReversed) {
        setCurrentOfferIndex(currentOfferIndex - 1); // Move up (6th -> 5th -> 4th...)
      } else {
        setCurrentOfferIndex(currentOfferIndex + 1); // Move down (1st -> 2nd -> 3rd...)
      }
    }
  };

  if (loading) {
    return <LoadingBox minHeight="400px" />;
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

      <ErrorAlert message={error} onClose={() => setError(null)} />
      <SuccessAlert message={success} onClose={() => setSuccess(null)} />

      {!status?.canAssign && status?.reason && (
        <InfoAlert message={status.reason} onClose={() => {}} />
      )}

      {status?.alreadyAssigned && (
        <SuccessAlert
          message="Victory points have already been assigned for this session."
          onClose={() => {}}
        />
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
            {status.reverseVpOrder && (
              <Chip
                label="TOPSY TURVY"
                size="small"
                sx={{ ml: 2, backgroundColor: 'var(--warning)', color: '#000' }}
              />
            )}
          </Typography>
          <Typography sx={{ color: 'var(--text-primary)', mb: 1 }}>
            {status.reverseVpOrder
              ? 'Starting from LAST PLACE (6th), each player is offered the victory point moving UP the rankings.'
              : 'Starting from 1st place, each player is offered the victory point.'
            } If they choose to take it:
          </Typography>
          <Box component="ul" sx={{ color: 'var(--text-primary)', pl: 3, mb: 1 }}>
            <li>They receive {status.awardTwoVictoryPoints ? '2 victory points' : '1 victory point'}</li>
            <li>All other players (except last place) receive wallet points based on their placement</li>
          </Box>
          <Typography sx={{ color: 'var(--text-primary)' }}>
            If they pass, the offer moves to the next player in the sequence. If everyone passes, {status.reverseVpOrder ? 'first' : 'last'} place automatically receives the victory point.
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
                    Current VP
                  </TableCell>
                  <TableCell sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }} align="center">
                    Current Wallet
                  </TableCell>
                  <TableCell sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }} align="center">
                    Earned This Session
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

                  // Determine who is forced to take VP (last in the sequence)
                  const isForcedToTake = status.reverseVpOrder
                    ? index === 0 // Reversed: 1st place is forced
                    : isLastPlace; // Normal: 6th place is forced

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
                        {player.currentVictoryPoints}
                      </TableCell>
                      <TableCell sx={{ color: 'var(--text-primary)' }} align="center">
                        {player.currentWalletPoints}
                      </TableCell>
                      <TableCell sx={{ color: 'var(--text-primary)' }} align="center">
                        {player.walletPointsThisSession}
                      </TableCell>
                      {status.canAssign && !status.alreadyAssigned && (
                        <TableCell align="center">
                          {isCurrentOffer ? (
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                              <PrimaryButton
                                size="small"
                                startIcon={<EmojiEventsIcon />}
                                onClick={handleTakeVictoryPoint}
                                disabled={assigning}
                              >
                                {isForcedToTake
                                  ? (status.awardTwoVictoryPoints ? 'Assign 2 VP' : 'Assign VP')
                                  : (status.awardTwoVictoryPoints ? 'Take 2 VP' : 'Take VP')
                                }
                              </PrimaryButton>
                              {!isForcedToTake && (
                                <SecondaryButton
                                  size="small"
                                  onClick={handlePassVictoryPoint}
                                  disabled={assigning}
                                >
                                  Pass
                                </SecondaryButton>
                              )}
                            </Box>
                          ) : (() => {
                              // Determine if this player has already passed
                              const hasPassed = status.reverseVpOrder
                                ? index > currentOfferIndex // Reversed: higher index = already passed
                                : index < currentOfferIndex; // Normal: lower index = already passed

                              return hasPassed ? (
                                <Chip
                                  label="Passed"
                                  size="small"
                                  sx={{ backgroundColor: 'var(--grey-badge)', color: 'var(--text-secondary)' }}
                                />
                              ) : (
                                <Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                  Waiting...
                                </Typography>
                              );
                            })()}
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
