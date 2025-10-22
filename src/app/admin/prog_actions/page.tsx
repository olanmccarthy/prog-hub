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
import { getSessionStatus, startSession, completeSession, autoVoteAllPlayers, autoCreateSuggestions, resetSession, SessionStatusResult } from './actions';

export default function ProgActionsPage() {
  const [status, setStatus] = useState<SessionStatusResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [autoVoting, setAutoVoting] = useState(false);
  const [autoCreating, setAutoCreating] = useState(false);
  const [resetting, setResetting] = useState(false);
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
        setSuccess(`Session ${status?.nextSession?.number} started successfully! Pairings have been generated.`);
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

          {status.canCompleteSession ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleIcon sx={{ color: '#4caf50' }} />
              <Typography sx={{ color: '#4caf50' }}>
                All requirements met. Ready to complete!
              </Typography>
            </Box>
          ) : (
            <>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}
              >
                <ErrorIcon sx={{ color: '#ff9800' }} />
                <Typography sx={{ color: '#ff9800' }}>
                  Requirements not met:
                </Typography>
              </Box>
              <List dense>
                {status.completeReasons.map((reason, index) => (
                  <ListItem
                    key={`complete-reason-${index}-${reason.slice(0, 20)}`}
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
            This will activate the session and generate randomized round-robin
            pairings for all players.
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

      {/* Requirements Checklist */}
      {status?.activeSession && (
        <Paper
          sx={{
            p: 3,
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-bright)',
          }}
        >
          <Typography variant="h6" sx={{ color: 'var(--text-bright)', mb: 2 }}>
            Completion Requirements
          </Typography>
          <List dense>
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
                    : 'var(--text-secondary)',
                }}
              />
            </ListItem>
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
                    : 'var(--text-secondary)',
                }}
              />
            </ListItem>
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
                    : 'var(--text-secondary)',
                }}
              />
            </ListItem>
          </List>
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
            Danger Zone
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
    </Box>
  );
}
