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
import { getLoserPrizingEntries as getLoserPrizingStatus, spinLoserPrizingWheel, LoserPrizingStatusResult } from './actions';
import {
  getLoserPrizingEntries as getLoserPrizingConfigEntries,
  createLoserPrizingEntry,
  updateLoserPrizingEntry,
  deleteLoserPrizingEntry,
  massUpdateLoserPrizingChances,
  applyMultiplierToLoserPrizingEntries,
  type LoserPrizingEntry as ConfigEntry,
} from '../loser-prizing-config/actions';

export default function LoserPrizingPage() {
  const [status, setStatus] = useState<LoserPrizingStatusResult | null>(null);
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
    loadEntries();
    loadConfigEntries();
  }, []);

  const loadEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getLoserPrizingStatus();
      setStatus(result);
      if (!result.success && result.error) {
        setError(result.error);
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
      } else {
        setError(result.error || 'Failed to load config entries');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load config entries');
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
    setSuccess('Loser prizing wheel spun successfully!');
    setSpinning(false);
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

          <Typography
            variant="body2"
            sx={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 600 }}
          >
            This wheel can be spun multiple times. Award prizes to players who didn&apos;t make top placements.
          </Typography>

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
            disabled={spinning || wheelSegments.length === 0}
            sx={{
              backgroundColor: wheelSegments.length > 0
                ? 'var(--accent-primary)'
                : 'var(--grey-300)',
              '&:hover': {
                backgroundColor: wheelSegments.length > 0
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
            {spinning ? 'Spinning...' : 'Spin the Wheel'}
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

      {/* Configuration Section */}
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

      {/* Result Modal - always allow respin for loser prizing */}
      <EventResultModal
        open={showResult}
        onClose={handleCloseResult}
        onSpinAgain={handleSpinAgain}
        result={selectedResult}
        alreadySpun={false}
      />
    </Box>
  );
}
