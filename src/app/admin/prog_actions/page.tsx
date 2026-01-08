'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { getSessionStatus, startSession, completeSession, generatePairings, autoVoteAllPlayers, autoCreateSuggestions, autoSubmitDecklists, autoModeratorVote, resetSession, resetEntireProg, uploadPlayerDecklist, getPlayersForUpload, SessionStatusResult } from './actions';
import { ActiveSessionSection } from './components/ActiveSessionSection';
import { StartSessionSection } from './components/StartSessionSection';
import { GeneratePairingsSection } from './components/GeneratePairingsSection';
import { TestControlsSection } from './components/TestControlsSection';
import { ResetSections } from './components/ResetSections';
import { UploadDecklistSection } from './components/UploadDecklistSection';

export default function ProgActionsPage() {
  const [status, setStatus] = useState<SessionStatusResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [generatingPairings, setGeneratingPairings] = useState(false);
  const [autoVoting, setAutoVoting] = useState(false);
  const [autoCreating, setAutoCreating] = useState(false);
  const [autoSubmitingDecklists, setAutoSubmitingDecklists] = useState(false);
  const [autoModeratorVoting, setAutoModeratorVoting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resettingEntireProg, setResettingEntireProg] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [players, setPlayers] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    loadStatus();
    loadPlayers();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getSessionStatus();
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

  const loadPlayers = async () => {
    try {
      const result = await getPlayersForUpload();
      if (result.success && result.players) {
        setPlayers(result.players);
      }
    } catch (err) {
      console.error('Failed to load players:', err);
    }
  };

  const handleStartSession = async () => {
    try {
      setStarting(true);
      setError(null);
      setSuccess(null);

      const result = await startSession();

      if (result.success) {
        setSuccess(`Session ${status?.nextSession?.number} started successfully!`);
        await loadStatus();
      } else {
        setError(result.error || 'Failed to start session');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session');
    } finally {
      setStarting(false);
    }
  };

  const handleGeneratePairings = async () => {
    try {
      setGeneratingPairings(true);
      setError(null);
      setSuccess(null);

      const result = await generatePairings();

      if (result.success) {
        setSuccess(`Successfully generated ${result.numPairings} pairings! Discord notification sent.`);
        await loadStatus();
      } else {
        setError(result.error || 'Failed to generate pairings');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate pairings');
    } finally {
      setGeneratingPairings(false);
    }
  };

  const handleCompleteSession = async () => {
    try {
      setCompleting(true);
      setError(null);
      setSuccess(null);

      const result = await completeSession();

      if (result.success) {
        setSuccess(`Session ${result.sessionNumber} completed successfully!`);
        await loadStatus();
      } else {
        setError(result.error || 'Failed to complete session');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete session');
    } finally {
      setCompleting(false);
    }
  };

  const handleAutoVote = async () => {
    try {
      setAutoVoting(true);
      setError(null);
      setSuccess(null);

      const result = await autoVoteAllPlayers();

      if (result.success) {
        setSuccess(`Successfully created ${result.votesCreated} votes from all players!`);
      } else {
        setError(result.error || 'Failed to auto-vote');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to auto-vote');
    } finally {
      setAutoVoting(false);
    }
  };

  const handleAutoCreateSuggestions = async () => {
    try {
      setAutoCreating(true);
      setError(null);
      setSuccess(null);

      const result = await autoCreateSuggestions();

      if (result.success) {
        setSuccess(`Successfully created ${result.suggestionsCreated} banlist suggestions!`);
      } else {
        setError(result.error || 'Failed to auto-create suggestions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to auto-create suggestions');
    } finally {
      setAutoCreating(false);
    }
  };

  const handleAutoSubmitDecklists = async () => {
    try {
      setAutoSubmitingDecklists(true);
      setError(null);
      setSuccess(null);

      const result = await autoSubmitDecklists();

      if (result.success) {
        setSuccess(`Successfully submitted ${result.decklistsSubmitted} decklists!`);
        await loadStatus();
      } else {
        setError(result.error || 'Failed to auto-submit decklists');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to auto-submit decklists');
    } finally {
      setAutoSubmitingDecklists(false);
    }
  };

  const handleAutoModeratorVote = async () => {
    try {
      setAutoModeratorVoting(true);
      setError(null);
      setSuccess(null);

      const result = await autoModeratorVote();

      if (result.success) {
        setSuccess(`${result.moderatorName} has chosen a random banlist suggestion!`);
        await loadStatus();
      } else {
        setError(result.error || 'Failed to auto-vote as moderator');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to auto-vote as moderator');
    } finally {
      setAutoModeratorVoting(false);
    }
  };

  const handleResetSession = async () => {
    if (!confirm('Are you sure you want to reset the current session? This will delete ALL session data including pairings, decklists, victory points, and standings. This action cannot be undone!')) {
      return;
    }

    try {
      setResetting(true);
      setError(null);
      setSuccess(null);

      const result = await resetSession();

      if (result.success) {
        setSuccess(`Session ${result.sessionNumber} has been reset successfully! All session data has been deleted.`);
        await loadStatus();
      } else {
        setError(result.error || 'Failed to reset session');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset session');
    } finally {
      setResetting(false);
    }
  };

  const handleResetEntireProg = async () => {
    if (!confirm('⚠️ EXTREME DANGER ⚠️\n\nAre you absolutely sure you want to RESET THE ENTIRE PROG?\n\nThis will:\n- Empty all wallets\n- Remove ALL victory points\n- Remove ALL transactions\n- Remove ALL decklists\n- Remove ALL pairings\n- Remove ALL banlist suggestions and votes\n- Remove ALL banlists (except empty one for session 1)\n- Reset ALL sessions to incomplete\n\nPlayers will remain but EVERYTHING else will be deleted!\n\nThis action CANNOT be undone!\n\nType "RESET PROG" in the next prompt if you want to proceed.')) {
      return;
    }

    const confirmation = prompt('Type "RESET PROG" (without quotes) to confirm:');
    if (confirmation !== 'RESET PROG') {
      setError('Reset cancelled - confirmation text did not match');
      return;
    }

    try {
      setResettingEntireProg(true);
      setError(null);
      setSuccess(null);

      const result = await resetEntireProg();

      if (result.success) {
        setSuccess('🔄 ENTIRE PROG HAS BEEN RESET! All data deleted, system returned to initial state.');
        await loadStatus();
      } else {
        setError(result.error || 'Failed to reset entire prog');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset entire prog');
    } finally {
      setResettingEntireProg(false);
    }
  };

  const handleUploadDeck = async (playerId: number, file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const result = await uploadPlayerDecklist(playerId, formData);

      if (result.success) {
        await loadStatus(); // Refresh status to update decklist counts
      }

      return result;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to upload deck',
      };
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
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 3, color: 'var(--text-bright)' }}>
        Session Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      {/* Active Session Section */}
      {status?.activeSession && (
        <ActiveSessionSection
          session={status.activeSession}
          canComplete={status.canCompleteSession}
          requirements={status.requirements}
          completing={completing}
          onComplete={handleCompleteSession}
        />
      )}

      {/* Start Session Section */}
      {!status?.activeSession && (
        <StartSessionSection
          nextSession={status?.nextSession || null}
          canStart={status?.canStartSession || false}
          startReasons={status?.startReasons}
          starting={starting}
          onStart={handleStartSession}
        />
      )}

      {/* Generate Pairings Section */}
      {status?.activeSession && (
        <GeneratePairingsSection
          canGenerate={status.canGeneratePairings}
          pairingsGenerated={status.pairingsGenerated}
          generating={generatingPairings}
          onGenerate={handleGeneratePairings}
        />
      )}

      {/* Upload Player Decklist Section */}
      {status?.activeSession && (
        <UploadDecklistSection
          players={players}
          onUpload={handleUploadDeck}
        />
      )}

      {/* Test Controls */}
      <TestControlsSection
        autoSubmitingDecklists={autoSubmitingDecklists}
        autoCreating={autoCreating}
        autoVoting={autoVoting}
        autoModeratorVoting={autoModeratorVoting}
        onAutoSubmitDecklists={handleAutoSubmitDecklists}
        onAutoCreateSuggestions={handleAutoCreateSuggestions}
        onAutoVote={handleAutoVote}
        onAutoModeratorVote={handleAutoModeratorVote}
      />

      {/* Reset Sections */}
      <ResetSections
        hasActiveSession={!!status?.activeSession}
        resetting={resetting}
        resettingEntireProg={resettingEntireProg}
        onResetSession={handleResetSession}
        onResetEntireProg={handleResetEntireProg}
      />
    </Box>
  );
}
