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
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import CancelIcon from '@mui/icons-material/Cancel';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import GroupsIcon from '@mui/icons-material/Groups';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { getSessionStatus, startSession, completeSession, generatePairings, autoVoteAllPlayers, autoCreateSuggestions, autoSubmitDecklists, autoModeratorVote, resetSession, resetEntireProg, SessionStatusResult } from './actions';

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

  useEffect(() => {
    loadStatus();
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
        <Paper
          sx={{
            p: 3,
            mb: 3,
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--accent-primary)',
            color: 'var(--text-bright)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography
                variant="h6"
                sx={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}
              >
                Active Session: #{status.activeSession.number}
              </Typography>
              {status.activeSession.setName && (
                <Typography
                  variant="body2"
                  sx={{ color: 'var(--text-secondary)' }}
                >
                  {status.activeSession.setName}
                </Typography>
              )}
            </Box>
            <Button
              variant="contained"
              startIcon={
                completing ? <CircularProgress size={20} /> : <StopCircleIcon />
              }
              onClick={handleCompleteSession}
              disabled={!status.canCompleteSession || completing}
              sx={{
                backgroundColor: status.canCompleteSession
                  ? '#f44336'
                  : 'var(--grey-300)',
                '&:hover': {
                  backgroundColor: status.canCompleteSession
                    ? '#d32f2f'
                    : 'var(--grey-300)',
                },
                '&:disabled': {
                  backgroundColor: 'var(--grey-300)',
                  color: 'var(--text-secondary)',
                },
              }}
            >
              {completing ? 'Completing...' : 'Complete Session'}
            </Button>
          </Box>

          <Typography
            variant="body2"
            sx={{ color: 'var(--text-secondary)', mb: 2 }}
          >
            This will mark the session as complete and allow the next session to
            start.
          </Typography>

          <Divider sx={{ my: 2, borderColor: 'var(--border-color)' }} />

          <Typography variant="h6" sx={{ color: 'var(--text-bright)', mb: 2 }}>
            Completion Requirements
          </Typography>

          {status.canCompleteSession && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CheckCircleIcon sx={{ color: '#4caf50' }} />
              <Typography sx={{ color: '#4caf50' }}>
                All requirements met. Ready to complete!
              </Typography>
            </Box>
          )}

          <List dense>
            {/* Step 2: Decklists submitted */}
            <ListItem>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {status.requirements.decklistsSubmitted.met ? (
                  <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                ) : (
                  <CancelIcon sx={{ color: '#f44336', fontSize: 20 }} />
                )}
              </ListItemIcon>
              <ListItemText
                primary={status.requirements.decklistsSubmitted.message}
                sx={{
                  color: status.requirements.decklistsSubmitted.met
                    ? '#4caf50'
                    : 'var(--text-primary)',
                }}
              />
            </ListItem>

            {/* Step 3: Event wheel spun */}
            <ListItem>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {status.requirements.eventWheelSpun.met ? (
                  <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                ) : (
                  <CancelIcon sx={{ color: '#f44336', fontSize: 20 }} />
                )}
              </ListItemIcon>
              <ListItemText
                primary={status.requirements.eventWheelSpun.message}
                sx={{
                  color: status.requirements.eventWheelSpun.met
                    ? '#4caf50'
                    : 'var(--text-primary)',
                }}
              />
            </ListItem>

            {/* Step 4: Pairings generated */}
            <ListItem>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {status.requirements.pairingsGenerated.met ? (
                  <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                ) : (
                  <CancelIcon sx={{ color: '#f44336', fontSize: 20 }} />
                )}
              </ListItemIcon>
              <ListItemText
                primary={status.requirements.pairingsGenerated.message}
                sx={{
                  color: status.requirements.pairingsGenerated.met
                    ? '#4caf50'
                    : 'var(--text-primary)',
                }}
              />
            </ListItem>

            {/* Step 7: Placements filled (standings finalized) */}
            <ListItem>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {status.requirements.placementsFilled.met ? (
                  <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                ) : (
                  <CancelIcon sx={{ color: '#f44336', fontSize: 20 }} />
                )}
              </ListItemIcon>
              <ListItemText
                primary={status.requirements.placementsFilled.message}
                sx={{
                  color: status.requirements.placementsFilled.met
                    ? '#4caf50'
                    : 'var(--text-primary)',
                }}
              />
            </ListItem>

            {/* Step 8: Victory points assigned */}
            <ListItem>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {status.requirements.victoryPointsAssigned.met ? (
                  <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                ) : (
                  <CancelIcon sx={{ color: '#f44336', fontSize: 20 }} />
                )}
              </ListItemIcon>
              <ListItemText
                primary={status.requirements.victoryPointsAssigned.message}
                sx={{
                  color: status.requirements.victoryPointsAssigned.met
                    ? '#4caf50'
                    : 'var(--text-primary)',
                }}
              />
            </ListItem>

            {/* Step 9: Wallet points assigned */}
            <ListItem>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {status.requirements.walletPointsAssigned.met ? (
                  <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                ) : (
                  <CancelIcon sx={{ color: '#f44336', fontSize: 20 }} />
                )}
              </ListItemIcon>
              <ListItemText
                primary={status.requirements.walletPointsAssigned.message}
                sx={{
                  color: status.requirements.walletPointsAssigned.met
                    ? '#4caf50'
                    : 'var(--text-primary)',
                }}
              />
            </ListItem>

            {/* Step 11: Banlist suggestions submitted */}
            <ListItem>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {status.requirements.suggestionsSubmitted.met ? (
                  <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                ) : (
                  <CancelIcon sx={{ color: '#f44336', fontSize: 20 }} />
                )}
              </ListItemIcon>
              <ListItemText
                primary={status.requirements.suggestionsSubmitted.message}
                sx={{
                  color: status.requirements.suggestionsSubmitted.met
                    ? '#4caf50'
                    : 'var(--text-primary)',
                }}
              />
            </ListItem>

            {/* Step 12: Players voted at least twice */}
            <ListItem>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {status.requirements.votesSubmitted.met ? (
                  <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                ) : (
                  <CancelIcon sx={{ color: '#f44336', fontSize: 20 }} />
                )}
              </ListItemIcon>
              <ListItemText
                primary={status.requirements.votesSubmitted.message}
                sx={{
                  color: status.requirements.votesSubmitted.met
                    ? '#4caf50'
                    : 'var(--text-primary)',
                }}
              />
            </ListItem>

            {/* Step 13: Moderator selected */}
            <ListItem>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {status.requirements.moderatorSelected.met ? (
                  <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                ) : (
                  <CancelIcon sx={{ color: '#f44336', fontSize: 20 }} />
                )}
              </ListItemIcon>
              <ListItemText
                primary={status.requirements.moderatorSelected.message}
                sx={{
                  color: status.requirements.moderatorSelected.met
                    ? '#4caf50'
                    : 'var(--text-primary)',
                }}
              />
            </ListItem>

            {/* Step 14: Moderator voted (chosen banlist) */}
            <ListItem>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {status.requirements.moderatorVoted.met ? (
                  <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                ) : (
                  <CancelIcon sx={{ color: '#f44336', fontSize: 20 }} />
                )}
              </ListItemIcon>
              <ListItemText
                primary={status.requirements.moderatorVoted.message}
                sx={{
                  color: status.requirements.moderatorVoted.met
                    ? '#4caf50'
                    : 'var(--text-primary)',
                }}
              />
            </ListItem>
          </List>
        </Paper>
      )}

      {/* Start Session Section */}
      {!status?.activeSession && (
        <Paper
          sx={{
            p: 3,
            mb: 3,
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-bright)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography
                variant="h6"
                sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }}
              >
                {status?.nextSession
                  ? `Start Session #${status.nextSession.number}`
                  : 'No Sessions Available'}
              </Typography>
              {status?.nextSession?.setName && (
                <Typography
                  variant="body2"
                  sx={{ color: 'var(--text-secondary)' }}
                >
                  {status.nextSession.setName}
                </Typography>
              )}
            </Box>
            {status?.nextSession && (
              <Button
                variant="contained"
                startIcon={
                  starting ? <CircularProgress size={20} /> : <PlayArrowIcon />
                }
                onClick={handleStartSession}
                disabled={!status.canStartSession || starting}
                sx={{
                  backgroundColor: status.canStartSession
                    ? 'var(--accent-primary)'
                    : 'var(--grey-300)',
                  '&:hover': {
                    backgroundColor: status.canStartSession
                      ? 'var(--accent-hover)'
                      : 'var(--grey-300)',
                  },
                  '&:disabled': {
                    backgroundColor: 'var(--grey-300)',
                    color: 'var(--text-secondary)',
                  },
                }}
              >
                {starting ? 'Starting...' : 'Start Session'}
              </Button>
            )}
          </Box>

          <Typography
            variant="body2"
            sx={{ color: 'var(--text-secondary)', mb: 2 }}
          >
            This will activate the session and set the date.
          </Typography>

          {status?.canStartSession ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleIcon sx={{ color: '#4caf50' }} />
              <Typography sx={{ color: '#4caf50' }}>Ready to start!</Typography>
            </Box>
          ) : (
            <>
              {status?.startReasons && status.startReasons.length > 0 && (
                <>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 2,
                    }}
                  >
                    <ErrorIcon sx={{ color: '#ff9800' }} />
                    <Typography sx={{ color: '#ff9800' }}>
                      Cannot start:
                    </Typography>
                  </Box>
                  <List dense>
                    {status.startReasons.map((reason, index) => (
                      <ListItem
                        key={`start-reason-${index}-${reason.slice(0, 20)}`}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <ErrorIcon sx={{ color: '#ff9800', fontSize: 20 }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={reason}
                          sx={{ color: 'var(--text-primary)' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
            </>
          )}
        </Paper>
      )}

      {/* Generate Pairings Section */}
      {status?.activeSession && (
        <Paper
          sx={{
            p: 3,
            mb: 3,
            backgroundColor: 'var(--bg-secondary)',
            border: status.pairingsGenerated
              ? '1px solid #4caf50'
              : '1px solid var(--border-color)',
            color: 'var(--text-bright)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography
                variant="h6"
                sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }}
              >
                Generate Pairings
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={
                generatingPairings ? (
                  <CircularProgress size={20} />
                ) : (
                  <GroupsIcon />
                )
              }
              onClick={handleGeneratePairings}
              disabled={!status.canGeneratePairings || generatingPairings}
              sx={{
                backgroundColor: status.canGeneratePairings
                  ? 'var(--accent-primary)'
                  : 'var(--grey-300)',
                '&:hover': {
                  backgroundColor: status.canGeneratePairings
                    ? 'var(--accent-hover)'
                    : 'var(--grey-300)',
                },
                '&:disabled': {
                  backgroundColor: 'var(--grey-300)',
                  color: 'var(--text-secondary)',
                },
              }}
            >
              {generatingPairings ? 'Generating...' : 'Generate Pairings'}
            </Button>
          </Box>

          <Typography
            variant="body2"
            sx={{ color: 'var(--text-secondary)', mb: 2 }}
          >
            Generate randomized round-robin pairings for all players and send
            Discord notification.
          </Typography>

          {status.pairingsGenerated ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleIcon sx={{ color: '#4caf50' }} />
              <Typography sx={{ color: '#4caf50' }}>
                Pairings have been generated!
              </Typography>
            </Box>
          ) : (
            <>
              {!status.canGeneratePairings && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ErrorIcon sx={{ color: '#ff9800' }} />
                  <Typography sx={{ color: '#ff9800' }}>
                    {status.pairingsGenerated
                      ? 'Pairings already exist for this session'
                      : 'Event wheel must be spun before generating pairings'}
                  </Typography>
                </Box>
              )}
              {status.canGeneratePairings && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon sx={{ color: '#4caf50' }} />
                  <Typography sx={{ color: '#4caf50' }}>
                    Ready to generate pairings!
                  </Typography>
                </Box>
              )}
            </>
          )}
        </Paper>
      )}

      {/* Test Controls */}
      <Paper
        sx={{
          p: 3,
          mt: 3,
          backgroundColor: 'var(--bg-secondary)',
          border: '2px solid #ff9800',
          color: 'var(--text-bright)',
        }}
      >
        <Typography
          variant="h6"
          sx={{ color: '#ff9800', mb: 2, fontWeight: 'bold' }}
        >
          Test Controls
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: 'var(--text-secondary)', mb: 2 }}
        >
          These are development/testing shortcuts and should only be used for
          testing purposes.
        </Typography>

        <Divider sx={{ my: 2, borderColor: 'var(--border-color)' }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={
                autoSubmitingDecklists ? <CircularProgress size={20} /> : <AssignmentIcon />
              }
              onClick={handleAutoSubmitDecklists}
              disabled={autoSubmitingDecklists}
              sx={{
                borderColor: '#ff9800',
                color: '#ff9800',
                '&:hover': {
                  borderColor: '#f57c00',
                  backgroundColor: 'rgba(255, 152, 0, 0.08)',
                },
              }}
            >
              {autoSubmitingDecklists ? 'Submitting Decklists...' : 'Auto-Submit Decklists'}
            </Button>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
              Automatically submits decklists from all players
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={
                autoCreating ? (
                  <CircularProgress size={20} />
                ) : (
                  <AddCircleIcon />
                )
              }
              onClick={handleAutoCreateSuggestions}
              disabled={autoCreating}
              sx={{
                borderColor: '#ff9800',
                color: '#ff9800',
                '&:hover': {
                  borderColor: '#f57c00',
                  backgroundColor: 'rgba(255, 152, 0, 0.08)',
                },
              }}
            >
              {autoCreating ? 'Creating...' : 'Auto-Create Suggestions'}
            </Button>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
              Automatically creates banlist suggestions for players who havent
              submitted yet
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={
                autoVoting ? <CircularProgress size={20} /> : <HowToVoteIcon />
              }
              onClick={handleAutoVote}
              disabled={autoVoting}
              sx={{
                borderColor: '#ff9800',
                color: '#ff9800',
                '&:hover': {
                  borderColor: '#f57c00',
                  backgroundColor: 'rgba(255, 152, 0, 0.08)',
                },
              }}
            >
              {autoVoting ? 'Creating Votes...' : 'Auto-Vote All Players'}
            </Button>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
              Automatically creates votes from all players to skip to moderator
              selection phase
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={
                autoModeratorVoting ? <CircularProgress size={20} /> : <HowToVoteIcon />
              }
              onClick={handleAutoModeratorVote}
              disabled={autoModeratorVoting}
              sx={{
                borderColor: '#ff9800',
                color: '#ff9800',
                '&:hover': {
                  borderColor: '#f57c00',
                  backgroundColor: 'rgba(255, 152, 0, 0.08)',
                },
              }}
            >
              {autoModeratorVoting ? 'Choosing...' : 'Auto-Choose Banlist (Moderator)'}
            </Button>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
              Automatically makes the moderator choose a random banlist suggestion
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Reset Session Section */}
      {status?.activeSession && (
        <Paper
          sx={{
            p: 3,
            mt: 3,
            backgroundColor: 'var(--bg-secondary)',
            border: '2px solid #f44336',
            color: 'var(--text-bright)',
          }}
        >
          <Typography
            variant="h6"
            sx={{ color: '#f44336', mb: 2, fontWeight: 'bold' }}
          >
            Danger Zone - Reset Session
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: 'var(--text-secondary)', mb: 2 }}
          >
            This action will completely reset the current session and delete all associated data.
          </Typography>

          <Divider sx={{ my: 2, borderColor: 'var(--border-color)' }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={
                resetting ? <CircularProgress size={20} /> : <RestartAltIcon />
              }
              onClick={handleResetSession}
              disabled={resetting}
              sx={{
                borderColor: '#f44336',
                color: '#f44336',
                '&:hover': {
                  borderColor: '#d32f2f',
                  backgroundColor: 'rgba(244, 67, 54, 0.08)',
                },
              }}
            >
              {resetting ? 'Resetting...' : 'Reset Session'}
            </Button>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
              Deletes all pairings, decklists, victory points, and standings. Marks session as incomplete and inactive.
            </Typography>
          </Box>
        </Paper>
      )}

      {/* Reset Entire Prog Section - Always visible */}
      <Paper
        sx={{
          p: 3,
          mt: 3,
          backgroundColor: 'var(--bg-secondary)',
          border: '3px solid #b71c1c',
          color: 'var(--text-bright)',
        }}
      >
        <Typography
          variant="h6"
          sx={{ color: '#d32f2f', mb: 2, fontWeight: 'bold' }}
        >
          ⚠️ EXTREME DANGER ZONE ⚠️
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: 'var(--text-secondary)', mb: 2 }}
        >
          This will reset the ENTIRE prog system back to initial state. Players remain but everything else is deleted.
        </Typography>

        <Divider sx={{ my: 2, borderColor: 'var(--border-color)' }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={
              resettingEntireProg ? <CircularProgress size={20} /> : <RestartAltIcon />
            }
            onClick={handleResetEntireProg}
            disabled={resettingEntireProg}
            sx={{
              borderColor: '#d32f2f',
              color: '#d32f2f',
              fontWeight: 'bold',
              '&:hover': {
                borderColor: '#b71c1c',
                backgroundColor: 'rgba(211, 47, 47, 0.12)',
              },
            }}
          >
            {resettingEntireProg ? 'Resetting Entire Prog...' : 'RESET ENTIRE PROG'}
          </Button>
          <Typography variant="body2" sx={{ color: '#f44336', fontWeight: 'bold' }}>
            Empties ALL wallets, deletes ALL data (decklists, pairings, votes, banlists), resets ALL sessions. CANNOT BE UNDONE!
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
