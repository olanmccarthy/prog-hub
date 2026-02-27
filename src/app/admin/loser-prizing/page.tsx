'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  LoadingBox,
  ErrorAlert,
  SuccessAlert,
  PrimaryButton,
} from '@/src/components';
import CasinoIcon from '@mui/icons-material/Casino';
import EventWheel from '@components/EventWheel';
import LoserPrizingResultModal from '@components/LoserPrizingResultModal';
import { WheelConfigSection } from '@components/WheelConfigSection';
import {
  getLoserPrizingEntries as getLoserPrizingStatus,
  getPublicLoserPrizingEntries,
  spinLoserPrizingWheel,
  applyLoserPrizingResult,
  getPlayers,
  getWalletBalance,
  type LoserPrizingStatusResult,
} from './actions';
import {
  getLoserPrizingEntries as getLoserPrizingConfigEntries,
  createLoserPrizingEntry,
  updateLoserPrizingEntry,
  deleteLoserPrizingEntry,
  massUpdateLoserPrizingChances,
  applyMultiplierToLoserPrizingEntries,
  type LoserPrizingEntry as ConfigEntry,
} from '../loser-prizing-config/actions';

interface Player {
  id: number;
  name: string;
}

export default function LoserPrizingPage() {
  const [status, setStatus] = useState<LoserPrizingStatusResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [selectedResult, setSelectedResult] = useState<{
    id: number;
    name: string;
    description: string;
    automationType: string | null;
    requiresPlayerSelection: boolean;
    requiresInput: boolean;
    allowsRespin: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [configEntries, setConfigEntries] = useState<ConfigEntry[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [selectedPlayerWalletBalance, setSelectedPlayerWalletBalance] = useState<number>(0);

  useEffect(() => {
    loadEntries();
    loadConfigEntries();
    loadPlayers();
  }, []);

  const loadEntries = async () => {
    try {
      setLoading(true);
      setError(null);

      const adminResult = await getLoserPrizingStatus();

      if (adminResult.success) {
        setIsAdmin(true);
        setStatus(adminResult);
      } else if (adminResult.error === 'Admin access required') {
        setIsAdmin(false);
        const publicResult = await getPublicLoserPrizingEntries();
        setStatus(publicResult);
        if (!publicResult.success && publicResult.error) {
          setError(publicResult.error);
        }
      } else {
        setError(adminResult.error || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load entries');
    } finally {
      setLoading(false);
    }
  };

  const loadConfigEntries = async () => {
    try {
      const result = await getLoserPrizingConfigEntries();
      if (result.success && result.entries) {
        setConfigEntries(result.entries);
      }
    } catch (err) {
      console.error('Failed to load config entries:', err);
    }
  };

  const loadPlayers = async () => {
    try {
      const result = await getPlayers();
      if (result.success && result.players) {
        setPlayers(result.players);
      }
    } catch (err) {
      console.error('Failed to load players:', err);
    }
  };

  const loadPlayerWalletBalance = async (playerId: number) => {
    try {
      const result = await getWalletBalance(playerId);
      if (result.success) {
        setSelectedPlayerWalletBalance(result.amount || 0);
      }
    } catch (err) {
      console.error('Failed to load player wallet balance:', err);
      setSelectedPlayerWalletBalance(0);
    }
  };

  const handleReload = async () => {
    await loadConfigEntries();
    await loadEntries();
  };

  const handleSpin = async () => {
    try {
      setError(null);
      setSuccess(null);

      const result = await spinLoserPrizingWheel();

      if (!result.success) {
        setError(result.error || 'Failed to spin loser prizing wheel');
        return;
      }

      setSelectedResult(result.selectedEntry || null);

      if (result.selectedEntry && result.selectedEntry.id !== -1) {
        const index = status?.entries.findIndex(
          (e) => e.id === result.selectedEntry!.id
        );
        if (index !== undefined && index >= 0) {
          setTargetIndex(index);
        } else {
          setError('Could not find selected entry in wheel segments');
          return;
        }
      } else {
        setTargetIndex(status?.entries.length || 0);
      }

      setSpinning(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate spin');
    }
  };

  const handleSpinComplete = async () => {
    if (selectedPlayerId) {
      await loadPlayerWalletBalance(selectedPlayerId);
    }
    setShowResult(true);
    setSpinning(false);
  };

  const handleCloseResult = () => {
    setShowResult(false);
    setSuccess(null);
  };

  const handleSpinAgain = () => {
    setShowResult(false);
    setSelectedResult(null);
    setTargetIndex(null);
    handleSpin();
  };

  const handleApplyResult = async (targetPlayerId?: number, investmentAmount?: number, vendorAction?: 'sell' | 'buyback') => {
    if (!selectedResult || selectedResult.id === -1) {
      setError('No result to apply');
      return;
    }

    if (!selectedPlayerId) {
      setError('Please select a player to receive the loser prizing');
      return;
    }

    const result = await applyLoserPrizingResult(
      selectedPlayerId,
      selectedResult.id,
      targetPlayerId,
      investmentAmount,
      vendorAction
    );

    if (result.success) {
      setSuccess(result.message || 'Result applied successfully');
      if (result.requiresRespin) {
        handleSpinAgain();
      }
    } else {
      setError(result.error || 'Failed to apply result');
    }
  };

  if (loading) {
    return <LoadingBox minHeight="400px" />;
  }

  const wheelSegments = status?.entries
    ? (() => {
        const totalChance = status.entries.reduce((sum, entry) => sum + entry.chance, 0);
        const segments = status.entries.map(entry => ({
          name: entry.name,
          description: entry.description,
          weight: totalChance >= 100 ? (entry.chance / totalChance) * 100 : entry.chance,
          color: '',
        }));

        if (totalChance < 100) {
          segments.push({
            name: 'Normal Prizing',
            description: 'Either get 1 dollarydoo or half a box of the main set.',
            weight: 100 - totalChance,
            color: '',
          });
        }

        return segments;
      })()
    : [];

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 3, color: 'var(--text-bright)' }}>
        Loser Prizing Wheel
      </Typography>

      <ErrorAlert message={error} onClose={() => setError(null)} />
      <SuccessAlert message={success} onClose={() => setSuccess(null)} />

      {/* Loser Prizing Wheel Section */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-bright)',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" sx={{ color: 'var(--text-bright)' }}>
            Spin for Consolation Prize
          </Typography>

          {isAdmin ? (
            <Typography
              variant="body2"
              sx={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 600 }}
            >
              The loser prizing wheel is a required step before completing a session. It can only be spun after the moderator has chosen the winning banlist.
            </Typography>
          ) : (
            <Typography
              variant="body2"
              sx={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 600 }}
            >
              View the possible consolation prizes below. Only admins can spin this wheel.
            </Typography>
          )}

          {isAdmin && (
            <FormControl fullWidth sx={{ maxWidth: 400, mb: 2 }}>
              <InputLabel sx={{ color: 'var(--text-secondary)' }}>
                Select Player for Loser Prizing
              </InputLabel>
              <Select
                value={selectedPlayerId || ''}
                onChange={(e) => setSelectedPlayerId(Number(e.target.value))}
                label="Select Player for Loser Prizing"
                sx={{
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-bright)',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'var(--input-border)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'var(--accent-primary)',
                  },
                }}
              >
                {players.map((player) => (
                  <MenuItem key={player.id} value={player.id}>
                    {player.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {wheelSegments.length > 0 && (
            <EventWheel
              segments={wheelSegments}
              onSpinComplete={handleSpinComplete}
              spinning={spinning}
              targetIndex={targetIndex}
            />
          )}

          {isAdmin && (
            <PrimaryButton
              size="large"
              startIcon={<CasinoIcon />}
              onClick={handleSpin}
              disabled={spinning || wheelSegments.length === 0 || !selectedPlayerId}
              sx={{ px: 4, py: 1.5 }}
            >
              {spinning ? 'Spinning...' : selectedPlayerId ? 'Spin the Wheel' : 'Select Player First'}
            </PrimaryButton>
          )}
        </Box>
      </Paper>

      {/* Wheel Entries List */}
      {status?.entries && status.entries.length > 0 && (
        <Paper
          sx={{
            p: 3,
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-bright)',
          }}
        >
          <Typography variant="h6" sx={{ color: 'var(--text-bright)', mb: 2 }}>
            Possible Prizes
          </Typography>
          <List>
            {status.entries.map((entry, index) => {
              const totalChance = status.entries.reduce((sum, e) => sum + e.chance, 0);
              const normalizedChance = totalChance >= 100
                ? ((entry.chance / totalChance) * 100).toFixed(1)
                : entry.chance.toFixed(1);

              return (
                <Box key={entry.id}>
                  {index > 0 && <Divider sx={{ borderColor: 'var(--border-color)', my: 1 }} />}
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }}>
                            {entry.name}
                            {entry.automationType && entry.automationType !== 'MANUAL' && (
                              <Typography
                                component="span"
                                sx={{
                                  ml: 1,
                                  fontSize: '0.75rem',
                                  color: 'var(--success)',
                                  backgroundColor: 'rgba(78, 201, 176, 0.1)',
                                  px: 1,
                                  py: 0.25,
                                  borderRadius: 1,
                                }}
                              >
                                AUTO
                              </Typography>
                            )}
                          </Typography>
                          <Typography
                            sx={{
                              color: 'var(--accent-primary)',
                              fontWeight: 'bold',
                              ml: 2,
                            }}
                          >
                            {normalizedChance}%
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Typography sx={{ color: 'var(--text-secondary)', mt: 0.5 }}>
                          {entry.description}
                        </Typography>
                      }
                    />
                  </ListItem>
                </Box>
              );
            })}

            {(() => {
              const totalChance = status.entries.reduce((sum, e) => sum + e.chance, 0);
              if (totalChance < 100) {
                return (
                  <>
                    <Divider sx={{ borderColor: 'var(--border-color)', my: 1 }} />
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }}>
                              Normal Prizing
                            </Typography>
                            <Typography
                              sx={{
                                color: 'var(--text-secondary)',
                                fontWeight: 'bold',
                                ml: 2,
                              }}
                            >
                              {(100 - totalChance).toFixed(1)}%
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Typography sx={{ color: 'var(--text-secondary)', mt: 0.5 }}>
                            Either get 1 dollarydoo or half a box of the main set.
                          </Typography>
                        }
                      />
                    </ListItem>
                  </>
                );
              }
              return null;
            })()}
          </List>
        </Paper>
      )}

      {/* Configuration Section (Admin Only) */}
      {isAdmin && (
        <WheelConfigSection
          entries={configEntries}
          onCreateEntry={createLoserPrizingEntry}
          onUpdateEntry={updateLoserPrizingEntry}
          onDeleteEntry={deleteLoserPrizingEntry}
          onMassUpdate={(updates) => massUpdateLoserPrizingChances({ updates })}
          onApplyMultiplier={(entryIds, multiplier) =>
            applyMultiplierToLoserPrizingEntries({ entryIds, multiplier })
          }
          onSuccess={setSuccess}
          onError={setError}
          onReload={handleReload}
        />
      )}

      {/* Result Modal with automation */}
      <LoserPrizingResultModal
        open={showResult}
        onClose={handleCloseResult}
        onSpinAgain={handleSpinAgain}
        onApply={handleApplyResult}
        result={selectedResult}
        players={players}
        playerWalletBalance={selectedPlayerWalletBalance}
      />
    </Box>
  );
}
