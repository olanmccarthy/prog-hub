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
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import CancelIcon from '@mui/icons-material/Cancel';
import { validateProgStart, startProg, ValidationResult } from './actions';

export default function ProgActionsPage() {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    checkValidation();
  }, []);

  const checkValidation = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await validateProgStart();
      setValidation(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate');
    } finally {
      setLoading(false);
    }
  };

  const handleStartProg = async () => {
    try {
      setStarting(true);
      setError(null);
      setSuccess(null);

      const result = await startProg();

      if (result.success) {
        setSuccess(`Prog session ${result.sessionId} started successfully! Pairings have been generated.`);
        // Refresh validation after starting
        await checkValidation();
      } else {
        setError(result.error || 'Failed to start prog');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start prog');
    } finally {
      setStarting(false);
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
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 3, color: 'var(--text-bright)' }}>
        Prog Actions
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

      <Paper
        sx={{
          p: 3,
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ color: 'var(--text-bright)', flexGrow: 1 }}>
            Start New Prog Session
          </Typography>
          <Button
            variant="contained"
            startIcon={starting ? <CircularProgress size={20} /> : <PlayArrowIcon />}
            onClick={handleStartProg}
            disabled={!validation?.canStartProg || starting}
            sx={{
              backgroundColor: validation?.canStartProg
                ? 'var(--accent-primary)'
                : 'var(--grey-300)',
              '&:hover': {
                backgroundColor: validation?.canStartProg
                  ? 'var(--accent-hover)'
                  : 'var(--grey-300)',
              },
              '&:disabled': {
                backgroundColor: 'var(--grey-300)',
                color: 'var(--text-secondary)',
              },
            }}
          >
            {starting ? 'Starting...' : 'Start Prog'}
          </Button>
        </Box>

        <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 2 }}>
          This will create a new session with randomized round-robin pairings for all players.
        </Typography>

        {validation && (
          <>
            {validation.canStartProg ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CheckCircleIcon sx={{ color: '#4caf50' }} />
                <Typography sx={{ color: '#4caf50' }}>
                  All requirements met. Ready to start!
                </Typography>
              </Box>
            ) : (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <ErrorIcon sx={{ color: '#ff9800' }} />
                  <Typography sx={{ color: '#ff9800' }}>
                    Requirements not met:
                  </Typography>
                </Box>
                <List dense>
                  {validation.reasons.map((reason, index) => (
                    <ListItem key={index}>
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

        <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid var(--border-color)' }}>
          <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 1 }}>
            <strong>Requirements to start a new prog:</strong>
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {validation?.requirements.placementsFilled.met ? (
                  <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                ) : (
                  <CancelIcon sx={{ color: '#f44336', fontSize: 20 }} />
                )}
              </ListItemIcon>
              <ListItemText
                primary={
                  validation?.requirements.placementsFilled.met
                    ? validation.requirements.placementsFilled.message
                    : 'All current session placements (1st-6th) must be filled'
                }
                sx={{
                  color: validation?.requirements.placementsFilled.met
                    ? '#4caf50'
                    : 'var(--text-secondary)',
                }}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {validation?.requirements.decklistsSubmitted.met ? (
                  <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                ) : (
                  <CancelIcon sx={{ color: '#f44336', fontSize: 20 }} />
                )}
              </ListItemIcon>
              <ListItemText
                primary={
                  validation?.requirements.decklistsSubmitted.met
                    ? validation.requirements.decklistsSubmitted.message
                    : 'All players must have submitted decklists for the current session'
                }
                sx={{
                  color: validation?.requirements.decklistsSubmitted.met
                    ? '#4caf50'
                    : 'var(--text-secondary)',
                }}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {validation?.requirements.suggestionsSubmitted.met ? (
                  <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                ) : (
                  <CancelIcon sx={{ color: '#f44336', fontSize: 20 }} />
                )}
              </ListItemIcon>
              <ListItemText
                primary={
                  validation?.requirements.suggestionsSubmitted.met
                    ? validation.requirements.suggestionsSubmitted.message
                    : 'All players must have submitted banlist suggestions for the current session'
                }
                sx={{
                  color: validation?.requirements.suggestionsSubmitted.met
                    ? '#4caf50'
                    : 'var(--text-secondary)',
                }}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {validation?.requirements.nextBanlistExists.met ? (
                  <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                ) : (
                  <CancelIcon sx={{ color: '#f44336', fontSize: 20 }} />
                )}
              </ListItemIcon>
              <ListItemText
                primary={
                  validation?.requirements.nextBanlistExists.met
                    ? validation.requirements.nextBanlistExists.message
                    : 'A banlist must be chosen for the new session'
                }
                sx={{
                  color: validation?.requirements.nextBanlistExists.met
                    ? '#4caf50'
                    : 'var(--text-secondary)',
                }}
              />
            </ListItem>
          </List>
        </Box>
      </Paper>
    </Box>
  );
}
