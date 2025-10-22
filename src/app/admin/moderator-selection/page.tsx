'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Chip,
} from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import PersonIcon from '@mui/icons-material/Person';
import EventWheel from '@components/EventWheel';
import EventResultModal from '@components/EventResultModal';
import {
  getModeratorSelectionStatus,
  spinModeratorWheel,
  type ModeratorSelectionStatusResult,
} from './actions';

export default function ModeratorSelectionPage() {
  const [status, setStatus] = useState<ModeratorSelectionStatusResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [selectedResult, setSelectedResult] = useState<{
    name: string;
    description: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getModeratorSelectionStatus();
      setStatus(result);

      if (!result.success && result.error) {
        setError(result.error);
      }

      // Pre-select all players except last moderator
      if (result.success && result.players) {
        const eligible = new Set(
          result.players
            .filter((p) => !p.wasLastModerator)
            .map((p) => p.id)
        );
        setSelectedPlayers(eligible);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load status');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePlayer = (playerId: number) => {
    setSelectedPlayers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        newSet.add(playerId);
      }
      return newSet;
    });
  };

  const handleSpin = async () => {
    try {
      setError(null);
      setSuccess(null);
      setSpinning(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate spin');
      setSpinning(false);
    }
  };

  const handleSpinComplete = async () => {
    try {
      // Get the actual result from the server
      const result = await spinModeratorWheel(Array.from(selectedPlayers));

      if (result.success && result.selectedModerator) {
        setSelectedResult({
          name: result.selectedModerator.name,
          description: `${result.selectedModerator.name} has been selected as the moderator for this session`,
        });
        setShowResult(true);
        setSuccess('Moderator selected successfully!');
        await loadStatus();
      } else {
        setError(result.error || 'Failed to select moderator');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete spin');
    } finally {
      setSpinning(false);
    }
  };

  const handleCloseResult = () => {
    setShowResult(false);
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

  // Prepare wheel segments from eligible players
  const wheelSegments = status?.players && selectedPlayers.size > 0
    ? Array.from(selectedPlayers)
        .map((playerId) => status.players.find((p) => p.id === playerId))
        .filter((p) => p !== undefined)
        .map((player) => ({
          name: player!.name,
          description: `${player!.name} will moderate banlist selection`,
          weight: 100 / selectedPlayers.size, // Equal chance for all
          color: '',
        }))
    : [];

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 3, color: 'var(--text-bright)' }}>
        Moderator Selection
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

      {/* Already Selected State */}
      {status?.alreadySelected && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Moderator has already been selected for Session #{status.activeSessionNumber}
          {status.selectedModeratorName && (
            <Typography component="span" sx={{ fontWeight: 'bold', ml: 1 }}>
              - {status.selectedModeratorName}
            </Typography>
          )}
        </Alert>
      )}

      {/* Not Ready State */}
      {!status?.canSpin && !status?.alreadySelected && status?.reason && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {status.reason}
        </Alert>
      )}

      {/* Player Selection Section */}
      {!status?.alreadySelected && status?.players && status.players.length > 0 && (
        <Paper
          sx={{
            p: 3,
            mb: 3,
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-bright)',
          }}
        >
          <Typography variant="h6" sx={{ color: 'var(--text-bright)', mb: 2 }}>
            Eligible Players
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 3 }}>
            Select which players are eligible to be moderator. All selected players will have an
            equal chance of being chosen.
          </Typography>
          <FormGroup>
            {status.players.map((player) => (
              <FormControlLabel
                key={player.id}
                control={
                  <Checkbox
                    checked={selectedPlayers.has(player.id)}
                    onChange={() => handleTogglePlayer(player.id)}
                    sx={{
                      color: 'var(--text-secondary)',
                      '&.Mui-checked': {
                        color: 'var(--accent-primary)',
                      },
                    }}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ color: 'var(--text-primary)' }}>
                      {player.name}
                    </Typography>
                    {player.wasLastModerator && (
                      <Chip
                        label="Last Moderator"
                        size="small"
                        sx={{
                          backgroundColor: 'var(--grey-badge)',
                          color: 'var(--text-secondary)',
                        }}
                      />
                    )}
                  </Box>
                }
              />
            ))}
          </FormGroup>
          <Typography
            variant="body2"
            sx={{ color: 'var(--text-secondary)', mt: 2 }}
          >
            Selected: {selectedPlayers.size} player{selectedPlayers.size !== 1 ? 's' : ''}
          </Typography>
        </Paper>
      )}

      {/* Moderator Wheel Section */}
      {!status?.alreadySelected && (
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
              {status?.activeSessionNumber && `Session #${status.activeSessionNumber} Moderator Wheel`}
            </Typography>

            {/* Wheel Display */}
            {wheelSegments.length > 0 && (
              <EventWheel
                segments={wheelSegments}
                onSpinComplete={handleSpinComplete}
                spinning={spinning}
              />
            )}

            {/* Spin Button */}
            <Button
              variant="contained"
              size="large"
              startIcon={spinning ? <CircularProgress size={20} /> : <CasinoIcon />}
              onClick={handleSpin}
              disabled={!status?.canSpin || spinning || selectedPlayers.size === 0}
              sx={{
                backgroundColor:
                  status?.canSpin && selectedPlayers.size > 0
                    ? 'var(--accent-primary)'
                    : 'var(--grey-300)',
                '&:hover': {
                  backgroundColor:
                    status?.canSpin && selectedPlayers.size > 0
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
              {spinning
                ? 'Spinning...'
                : selectedPlayers.size === 0
                ? 'Select Players First'
                : 'Spin the Wheel'}
            </Button>
          </Box>
        </Paper>
      )}

      {/* Result Modal */}
      <EventResultModal
        open={showResult}
        onClose={handleCloseResult}
        onSpinAgain={() => {}} // Cannot spin again for moderator selection
        result={selectedResult}
        alreadySpun={true} // Hide spin again button
      />
    </Box>
  );
}
