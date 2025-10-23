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
} from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import EventWheel from '@components/EventWheel';
import EventResultModal from '@components/EventResultModal';
import { WheelConfigSection } from '@components/WheelConfigSection';
import { getEventWheelStatus, spinEventWheel, EventWheelStatusResult } from './actions';
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

  useEffect(() => {
    loadStatus();
    loadConfigEntries();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getEventWheelStatus();
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

  const handleReload = async () => {
    await loadConfigEntries();
    await loadStatus();
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

          {status?.alreadySpun ? (
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

      {/* Configuration Section */}
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
