'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Stack,
} from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import ScienceIcon from '@mui/icons-material/Science';
import RefreshIcon from '@mui/icons-material/Refresh';
import EventWheel from '@components/EventWheel';
import EventResultModal from '@components/EventResultModal';
import { WheelConfigSection } from '@components/WheelConfigSection';
import {
  getEventWheelStatus,
  getPublicEventWheelEntries,
  spinEventWheel,
  getActiveSessionModifiers,
  manuallyApplyEventEntry,
  resetSessionModifiers,
  EventWheelStatusResult,
  SessionModifiers,
} from './actions';
import {
  getEventWheelEntries,
  createEventWheelEntry,
  updateEventWheelEntry,
  deleteEventWheelEntry,
  massUpdateEventWheelChances,
  applyMultiplierToEventWheelEntries,
  type EventWheelEntry as ConfigEntry,
} from '../event-wheel-config/actions';

export default function EventWheelPage() {
  const [status, setStatus] = useState<EventWheelStatusResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [selectedResult, setSelectedResult] = useState<{
    name: string;
    description: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [configEntries, setConfigEntries] = useState<ConfigEntry[]>([]);
  const [activeModifiers, setActiveModifiers] = useState<SessionModifiers | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadStatus();
    loadConfigEntries();
    loadActiveModifiers();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try admin action first
      const adminResult = await getEventWheelStatus();

      if (adminResult.success) {
        // User is admin
        setIsAdmin(true);
        setStatus(adminResult);
      } else if (adminResult.error === 'Admin access required') {
        // User is not admin, use public action
        setIsAdmin(false);
        const publicResult = await getPublicEventWheelEntries();
        setStatus(publicResult);
        if (!publicResult.success && publicResult.error) {
          setError(publicResult.error);
        }
      } else {
        // Other error
        setError(adminResult.error || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load status');
    } finally {
      setLoading(false);
    }
  };

  const loadConfigEntries = async () => {
    try {
      const result = await getEventWheelEntries();
      if (result.success && result.entries) {
        setConfigEntries(result.entries);
      } else {
        setError(result.error || 'Failed to load config entries');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load config entries');
    }
  };

  const loadActiveModifiers = async () => {
    try {
      const result = await getActiveSessionModifiers();
      if (result.success) {
        setActiveModifiers(result.modifiers || null);
        setSelectedEvents(result.selectedEvents || []);
      }
    } catch (err) {
      console.error('Failed to load active modifiers:', err);
    }
  };

  const handleReload = async () => {
    await loadConfigEntries();
    await loadStatus();
    await loadActiveModifiers();
  };

  const handleSpin = async () => {
    try {
      setError(null);
      setSuccess(null);

      const result = await spinEventWheel();

      if (!result.success) {
        setError(result.error || 'Failed to spin event wheel');
        return;
      }

      setSelectedResult(result.selectedEntry || null);

      if (result.selectedEntry) {
        const index = status?.entries.findIndex(
          (e) => e.name === result.selectedEntry!.name
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

  const handleSpinComplete = () => {
    setShowResult(true);
    setSuccess('Event wheel spun successfully!');
    setSpinning(false);
    loadStatus();
    loadActiveModifiers();
  };

  const handleCloseResult = () => {
    setShowResult(false);
  };

  const handleSpinAgain = () => {
    setShowResult(false);
    setSelectedResult(null);
    setTargetIndex(null);
    handleSpin();
  };

  const handleManualApply = async (entryId: number) => {
    try {
      setError(null);
      setSuccess(null);

      const result = await manuallyApplyEventEntry(entryId);

      if (!result.success) {
        setError(result.error || 'Failed to apply event entry');
        return;
      }

      setSuccess(`Event "${result.selectedEntry?.name}" applied successfully!`);
      await loadStatus();
      await loadActiveModifiers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply event entry');
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all modifiers and event wheel state? This cannot be undone.')) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      const result = await resetSessionModifiers();

      if (!result.success) {
        setError(result.error || 'Failed to reset modifiers');
        return;
      }

      setSuccess('Session modifiers and event wheel state reset successfully!');
      await loadStatus();
      await loadActiveModifiers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset modifiers');
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
            name: 'No Event',
            description: 'No event occurs',
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
        Event Wheel
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

      {/* Active Modifiers Section */}
      {isAdmin && activeModifiers && (
        <Paper
          sx={{
            p: 3,
            mb: 3,
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ color: 'var(--text-bright)' }}>
            Active Session Modifiers
          </Typography>

          {selectedEvents.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 1 }}>
                Selected Events:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {selectedEvents.map((event, idx) => (
                  <Chip
                    key={idx}
                    label={event}
                    sx={{
                      backgroundColor: 'var(--accent-primary)',
                      color: 'var(--text-bright)',
                    }}
                  />
                ))}
              </Stack>
            </Box>
          )}

          <Alert severity="info" sx={{ mb: 2 }}>
            These modifiers were applied by the spun event(s) and will affect this session.
          </Alert>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {activeModifiers.doubleWalletPoints && (
              <Chip label="Double Wallet Points" color="primary" />
            )}
            {activeModifiers.awardTwoVictoryPoints && (
              <Chip label="Award 2 VP" color="primary" />
            )}
            {activeModifiers.oddPlacementBonus && (
              <Chip label="Odd Placement Bonus" color="primary" />
            )}
            {activeModifiers.evenPlacementBonus && (
              <Chip label="Even Placement Bonus" color="primary" />
            )}
            {activeModifiers.reverseVpOrder && (
              <Chip label="Reverse VP Order" color="primary" />
            )}
            {activeModifiers.matchWinBonus && (
              <Chip label="Match Win Bonus" color="primary" />
            )}
            {activeModifiers.adminHalveWallet && (
              <Chip label="Admin Halve Wallet" color="primary" />
            )}
            {activeModifiers.equalSplitWallet && (
              <Chip label="Equal Split Wallet" color="primary" />
            )}
            {activeModifiers.halveAllWalletPoints && (
              <Chip label="Halve All Wallet Points" color="primary" />
            )}
            {activeModifiers.bountyHunter && (
              <Chip label="Bounty Hunter" color="primary" />
            )}
            {activeModifiers.earlyDecklistPublic && (
              <Chip label="Early Decklist Public" color="success" />
            )}
            {activeModifiers.allowMultipleEventSpins && (
              <Chip label="Allow Multiple Spins" color="secondary" />
            )}
            {activeModifiers.skipModeratorRandomBanlist && (
              <Chip label="Skip Moderator (Random Banlist)" color="secondary" />
            )}
            {activeModifiers.trueDemocracyBanlist && (
              <Chip label="True Democracy (Most Votes)" color="secondary" />
            )}
          </Stack>
        </Paper>
      )}

      {/* Testing Controls Section (Non-Production Only) */}
      {isAdmin && process.env.NODE_ENV !== 'production' && (
        <Paper
          sx={{
            p: 3,
            mb: 3,
            backgroundColor: 'var(--bg-elevated)',
            border: '2px solid var(--warning)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <ScienceIcon sx={{ color: 'var(--warning)' }} />
            <Typography variant="h6" sx={{ color: 'var(--warning)' }}>
              Testing Controls (Non-Production Only)
            </Typography>
          </Box>

          <Alert severity="warning" sx={{ mb: 2 }}>
            These controls allow you to manually apply event modifiers for testing. This section is
            only visible in non-production environments.
          </Alert>

          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={handleReset}
              sx={{
                backgroundColor: 'var(--error)',
                '&:hover': {
                  backgroundColor: 'var(--error)',
                  filter: 'brightness(1.2)',
                },
              }}
            >
              Reset All Modifiers
            </Button>
          </Box>

          <Divider sx={{ borderColor: 'var(--border-color)', mb: 2 }} />

          <Typography variant="subtitle1" sx={{ color: 'var(--text-bright)', mb: 2 }}>
            Click an event to manually apply its modifiers:
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
            {configEntries.map((entry) => {
              // Count active modifiers
              const modifierCount = [
                entry.doubleWalletPoints,
                entry.awardTwoVictoryPoints,
                entry.oddPlacementBonus,
                entry.evenPlacementBonus,
                entry.reverseVpOrder,
                entry.matchWinBonus,
                entry.adminHalveWallet,
                entry.equalSplitWallet,
                entry.halveAllWalletPoints,
                entry.bountyHunter,
                entry.earlyDecklistPublic,
                entry.allowMultipleEventSpins,
                entry.skipModeratorRandomBanlist,
                entry.trueDemocracyBanlist,
              ].filter(Boolean).length;

              return (
                <Paper
                  key={entry.id}
                  sx={{
                    p: 2,
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      backgroundColor: 'var(--bg-tertiary)',
                      borderColor: 'var(--accent-primary)',
                    },
                  }}
                  onClick={() => handleManualApply(entry.id)}
                >
                  <Typography variant="h6" sx={{ color: 'var(--text-bright)', mb: 1 }}>
                    {entry.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 2 }}>
                    {entry.description}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip
                      label={`${entry.chance}% chance`}
                      size="small"
                      sx={{
                        backgroundColor: 'var(--accent-primary)',
                        color: 'var(--text-bright)',
                      }}
                    />
                    {modifierCount > 0 && (
                      <Chip
                        label={`${modifierCount} modifier${modifierCount !== 1 ? 's' : ''}`}
                        size="small"
                        sx={{
                          backgroundColor: 'var(--success)',
                          color: 'var(--text-bright)',
                        }}
                      />
                    )}
                  </Box>

                  {modifierCount > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block', mb: 0.5 }}>
                        Active Modifiers:
                      </Typography>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {entry.doubleWalletPoints && <Chip label="2x Wallet" size="small" />}
                        {entry.awardTwoVictoryPoints && <Chip label="2 VP" size="small" />}
                        {entry.oddPlacementBonus && <Chip label="Odd Bonus" size="small" />}
                        {entry.evenPlacementBonus && <Chip label="Even Bonus" size="small" />}
                        {entry.reverseVpOrder && <Chip label="Reverse" size="small" />}
                        {entry.matchWinBonus && <Chip label="Match Wins" size="small" />}
                        {entry.adminHalveWallet && <Chip label="Halve" size="small" />}
                        {entry.equalSplitWallet && <Chip label="Equal Split" size="small" />}
                        {entry.halveAllWalletPoints && <Chip label="Halve All" size="small" />}
                        {entry.bountyHunter && <Chip label="Bounty Hunter" size="small" />}
                        {entry.earlyDecklistPublic && <Chip label="Early Public" size="small" color="success" />}
                        {entry.allowMultipleEventSpins && <Chip label="Multi-Spin" size="small" color="secondary" />}
                        {entry.skipModeratorRandomBanlist && <Chip label="Random Banlist" size="small" color="secondary" />}
                        {entry.trueDemocracyBanlist && <Chip label="True Democracy" size="small" color="secondary" />}
                      </Stack>
                    </Box>
                  )}
                </Paper>
              );
            })}
          </Box>

          {configEntries.length === 0 && (
            <Typography sx={{ color: 'var(--text-secondary)', textAlign: 'center', py: 3 }}>
              No event entries configured. Create entries in the Wheel Configuration section below.
            </Typography>
          )}
        </Paper>
      )}

      {/* Event Wheel Section */}
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
            {status?.activeSessionNumber && `Session #${status.activeSessionNumber} Event Wheel`}
          </Typography>

          {!isAdmin ? (
            <Alert severity="info" sx={{ width: '100%', maxWidth: 600 }}>
              View the possible events below. Only admins can spin this wheel.
            </Alert>
          ) : status?.alreadySpun ? (
            <Alert severity="info" sx={{ width: '100%', maxWidth: 600 }}>
              The event wheel has already been spun for this session.
            </Alert>
          ) : status?.canSpin ? (
            <Alert severity="success" sx={{ width: '100%', maxWidth: 600 }}>
              All players have submitted their decklists. Ready to spin!
            </Alert>
          ) : status?.reason ? (
            <Alert severity="warning" sx={{ width: '100%', maxWidth: 600 }}>
              {status.reason}
            </Alert>
          ) : null}

          {wheelSegments.length > 0 && (
            <EventWheel
              segments={wheelSegments}
              onSpinComplete={handleSpinComplete}
              spinning={spinning}
              targetIndex={targetIndex}
            />
          )}

          {isAdmin && (
            <Button
              variant="contained"
              size="large"
              startIcon={spinning ? <CircularProgress size={20} /> : <CasinoIcon />}
              onClick={handleSpin}
              disabled={!status?.canSpin || spinning || status?.alreadySpun}
              sx={{
                backgroundColor: status?.canSpin && !status?.alreadySpun
                  ? 'var(--accent-primary)'
                  : 'var(--grey-300)',
                '&:hover': {
                  backgroundColor: status?.canSpin && !status?.alreadySpun
                    ? 'var(--accent-blue-hover)'
                    : 'var(--grey-300)',
                },
                '&:disabled': {
                  backgroundColor: 'var(--grey-300)',
                  color: 'var(--text-secondary)',
                },
                px: 4,
                py: 1.5,
              }}
            >
              {spinning ? 'Spinning...' : status?.alreadySpun ? 'Already Spun' : 'Spin the Wheel'}
            </Button>
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
            Possible Events
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
                              No Event
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
                            No event occurs, tournament proceeds normally
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
          onCreateEntry={createEventWheelEntry}
          onUpdateEntry={updateEventWheelEntry}
          onDeleteEntry={deleteEventWheelEntry}
          onMassUpdate={(updates) => massUpdateEventWheelChances({ updates })}
          onApplyMultiplier={(entryIds, multiplier) =>
            applyMultiplierToEventWheelEntries({ entryIds, multiplier })
          }
          onSuccess={setSuccess}
          onError={setError}
          onReload={handleReload}
        />
      )}

      {/* Result Modal */}
      <EventResultModal
        open={showResult}
        onClose={handleCloseResult}
        onSpinAgain={handleSpinAgain}
        result={selectedResult}
        alreadySpun={status?.alreadySpun || false}
      />
    </Box>
  );
}
