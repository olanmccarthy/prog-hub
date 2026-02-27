'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Chip,
} from '@mui/material';
import {
  LoadingBox,
  ErrorAlert,
  SuccessAlert,
  InfoAlert,
  WarningAlert,
  PrimaryButton,
} from '@/src/components';
import CasinoIcon from '@mui/icons-material/Casino';
import EventWheel from '@components/EventWheel';
import EventResultModal from '@components/EventResultModal';
import {
  getModeratorSelectionStatus,
  spinModeratorWheel,
  selectRandomBanlistSuggestion,
  selectMostVotedBanlistSuggestion,
  type ModeratorSelectionStatusResult,
} from './actions';

export default function ModeratorSelectionPage() {
  const [status, setStatus] = useState<ModeratorSelectionStatusResult | null>(null);
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

      // First, get the result from the server
      const result = await spinModeratorWheel(Array.from(selectedPlayers));

      if (!result.success || !result.selectedModerator) {
        setError(result.error || 'Failed to select moderator');
        return;
      }

      // Store the result
      setSelectedResult({
        name: result.selectedModerator.name,
        description: `${result.selectedModerator.name} has been selected as the moderator for this session`,
      });

      // Find the index of the selected moderator in the wheel segments
      const selectedPlayersList = Array.from(selectedPlayers)
        .map((playerId) => status?.players.find((p) => p.id === playerId))
        .filter((p) => p !== undefined);

      const index = selectedPlayersList.findIndex(
        (p) => p!.id === result.selectedModerator!.id
      );

      if (index >= 0) {
        setTargetIndex(index);
        setSpinning(true);
      } else {
        setError('Could not find selected moderator in wheel segments');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate spin');
    }
  };

  const handleSpinComplete = () => {
    // Animation complete, show the result modal
    setShowResult(true);
    setSuccess('Moderator selected successfully!');
    setSpinning(false);
    loadStatus();
  };

  const handleCloseResult = () => {
    setShowResult(false);
  };

  const handleRandomBanlist = async () => {
    try {
      setError(null);
      setSuccess(null);
      setLoading(true);

      const result = await selectRandomBanlistSuggestion();

      if (!result.success || !result.selectedSuggestion) {
        setError(result.error || 'Failed to select random banlist');
        setLoading(false);
        return;
      }

      setSuccess(
        `Random banlist selected! ${result.selectedSuggestion.playerName}'s suggestion will be used.`
      );
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select random banlist');
      setLoading(false);
    }
  };

  const handleTrueDemocracy = async () => {
    try {
      setError(null);
      setSuccess(null);
      setLoading(true);

      const result = await selectMostVotedBanlistSuggestion();

      if (!result.success || !result.selectedSuggestion) {
        setError(result.error || 'Failed to select most voted banlist');
        setLoading(false);
        return;
      }

      setSuccess(
        `Most voted banlist selected! ${result.selectedSuggestion.playerName}'s suggestion will be used.`
      );
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select most voted banlist');
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingBox minHeight="400px" />;
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

      <ErrorAlert message={error} onClose={() => setError(null)} />
      <SuccessAlert message={success} onClose={() => setSuccess(null)} />

      {/* Already Selected State */}
      {status?.alreadySelected && (
        <SuccessAlert
          message={`Moderator has already been selected for Session #${status.activeSessionNumber}${status.selectedModeratorName ? ` - ${status.selectedModeratorName}` : ''}`}
          onClose={() => {}}
        />
      )}

      {/* Not Ready State */}
      {!status?.canSpin && !status?.alreadySelected && status?.reason && (
        <WarningAlert message={status.reason} onClose={() => {}} />
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

      {/* RNG Moderation Mode: Random Banlist Selection */}
      {!status?.alreadySelected && status?.useRandomBanlist && (
        <Paper
          sx={{
            p: 3,
            mb: 3,
            backgroundColor: 'var(--bg-elevated)',
            border: '2px solid var(--warning)',
            color: 'var(--text-bright)',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6" sx={{ color: 'var(--warning)' }}>
              {status?.activeSessionNumber && `Session #${status.activeSessionNumber} - RNG Moderation`}
            </Typography>

            <InfoAlert
              message="RNG Moderation is active! No moderator will be selected. Instead, a random banlist suggestion with 2+ votes will be chosen automatically."
              onClose={() => {}}
              sx={{ width: '100%', maxWidth: 600 }}
            />

            <PrimaryButton
              size="large"
              startIcon={<CasinoIcon />}
              onClick={handleRandomBanlist}
              disabled={!status?.canSpin || loading}
              sx={{ px: 4, py: 1.5 }}
            >
              {loading ? 'Selecting...' : 'Choose Random Suggestion'}
            </PrimaryButton>
          </Box>
        </Paper>
      )}

      {/* True Democracy Mode: Most Voted Banlist Selection */}
      {!status?.alreadySelected && status?.useTrueDemocracy && (
        <Paper
          sx={{
            p: 3,
            mb: 3,
            backgroundColor: 'var(--bg-elevated)',
            border: '2px solid var(--success)',
            color: 'var(--text-bright)',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6" sx={{ color: 'var(--success)' }}>
              {status?.activeSessionNumber && `Session #${status.activeSessionNumber} - True Democracy`}
            </Typography>

            <InfoAlert
              message="True Democracy is active! No moderator will be selected. Instead, the banlist suggestion with the most votes will be chosen automatically. In case of a tie, one will be randomly selected."
              onClose={() => {}}
              sx={{ width: '100%', maxWidth: 600 }}
            />

            <PrimaryButton
              size="large"
              startIcon={<CasinoIcon />}
              onClick={handleTrueDemocracy}
              disabled={!status?.canSpin || loading}
              sx={{
                px: 4,
                py: 1.5,
                backgroundColor: status?.canSpin ? 'var(--success)' : undefined,
                '&:hover': {
                  backgroundColor: status?.canSpin ? 'var(--success)' : undefined,
                  filter: status?.canSpin ? 'brightness(1.2)' : 'none',
                },
              }}
            >
              {loading ? 'Selecting...' : 'Choose Most Voted Suggestion'}
            </PrimaryButton>
          </Box>
        </Paper>
      )}

      {/* Normal Mode: Moderator Wheel Section */}
      {!status?.alreadySelected && !status?.useRandomBanlist && !status?.useTrueDemocracy && (
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
                targetIndex={targetIndex}
              />
            )}

            {/* Spin Button */}
            <PrimaryButton
              size="large"
              startIcon={<CasinoIcon />}
              onClick={handleSpin}
              disabled={!status?.canSpin || spinning || selectedPlayers.size === 0}
              sx={{ px: 4, py: 1.5 }}
            >
              {spinning
                ? 'Spinning...'
                : selectedPlayers.size === 0
                ? 'Select Players First'
                : 'Spin the Wheel'}
            </PrimaryButton>
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
