'use client';

import { useEffect, useState } from 'react';
import { Paper, Typography, Box, Chip, Alert, CircularProgress, IconButton, Button } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import DeleteIcon from '@mui/icons-material/Delete';
import { getUpcomingSession, deleteSession, type UpcomingSessionData } from '@/src/app/actions';
import { getCurrentUser } from '@lib/auth';

export default function UpcomingSession() {
  const [data, setData] = useState<UpcomingSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [sessionResult, user] = await Promise.all([
          getUpcomingSession(),
          getCurrentUser(),
        ]);

        if (sessionResult.success && sessionResult.data) {
          setData(sessionResult.data);
        } else {
          setError(sessionResult.error || 'Failed to load upcoming session');
        }

        if (user?.isAdmin) {
          setIsAdmin(true);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (data && currentIndex < data.sessions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleDelete = async (sessionNumber: number) => {
    const confirmed = confirm(
      `Are you sure you want to delete Session #${sessionNumber}?\n\n` +
      'This will permanently delete:\n' +
      '- The session itself\n' +
      '- All decklists for this session\n' +
      '- All pairings for this session\n' +
      '- All banlist suggestions and votes\n' +
      '- The banlist for this session\n' +
      '- All victory points for this session\n' +
      '- All wallet transactions for this session\n\n' +
      'This action cannot be undone!'
    );

    if (!confirmed) return;

    try {
      setDeleting(true);
      setError(null);
      const result = await deleteSession(sessionNumber);

      if (result.success) {
        // Refresh the data
        const sessionResult = await getUpcomingSession();
        if (sessionResult.success && sessionResult.data) {
          setData(sessionResult.data);
          // Adjust currentIndex if needed
          if (currentIndex > 0 && currentIndex >= sessionResult.data.sessions.length) {
            setCurrentIndex(sessionResult.data.sessions.length - 1);
          }
        }
      } else {
        setError(result.error || 'Failed to delete session');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <Paper
        sx={{
          p: 3,
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 2 }}>
          <CircularProgress size={30} />
        </Box>
      </Paper>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  if (!data || data.sessions.length === 0) {
    return (
      <Paper
        sx={{
          p: 3,
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
        }}
      >
        <Typography variant="h6" sx={{ color: 'var(--text-bright)', mb: 1 }}>
          Upcoming Session
        </Typography>
        <Typography sx={{ color: 'var(--text-secondary)' }}>
          No upcoming sessions scheduled. Check back later!
        </Typography>
      </Paper>
    );
  }

  const currentSession = data.sessions[currentIndex];
  const isFirstSession = currentIndex === 0;
  const isLastSession = currentIndex === data.sessions.length - 1;

  return (
    <Paper
      sx={{
        p: 3,
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        color: 'var(--text-bright)',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography
          variant="h6"
          sx={{
            color: 'var(--text-bright)',
            fontWeight: 'bold',
          }}
        >
          {isFirstSession ? `This Session #${currentSession.sessionNumber}` : `Upcoming Session #${currentSession.sessionNumber}`}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            onClick={handlePrevious}
            disabled={isFirstSession}
            sx={{
              color: isFirstSession ? 'var(--text-secondary)' : 'var(--text-bright)',
              '&:hover': {
                backgroundColor: 'var(--bg-tertiary)',
              },
              '&:disabled': {
                color: 'var(--text-secondary)',
                opacity: 0.3,
              },
            }}
            size="small"
          >
            <ArrowBackIosNewIcon fontSize="small" />
          </IconButton>

          <Typography variant="body2" sx={{ color: 'var(--text-secondary)', minWidth: '50px', textAlign: 'center' }}>
            {currentIndex + 1} / {data.sessions.length}
          </Typography>

          <IconButton
            onClick={handleNext}
            disabled={isLastSession}
            sx={{
              color: isLastSession ? 'var(--text-secondary)' : 'var(--text-bright)',
              '&:hover': {
                backgroundColor: 'var(--bg-tertiary)',
              },
              '&:disabled': {
                color: 'var(--text-secondary)',
                opacity: 0.3,
              },
            }}
            size="small"
          >
            <ArrowForwardIosIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Box
        sx={{
          mb: 3,
          p: 2,
          backgroundColor: 'var(--bg-tertiary)',
          borderRadius: 1,
          border: '1px solid var(--accent-primary)',
        }}
      >
        <Typography
          variant="h5"
          sx={{
            color: 'var(--accent-primary)',
            fontWeight: 'bold',
            mb: 1,
          }}
        >
          {currentSession.sessionSet.setName}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Chip
            label={currentSession.sessionSet.setCode}
            size="small"
            sx={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--text-bright)',
              fontWeight: 'bold',
            }}
          />
          <Typography sx={{ color: 'var(--text-secondary)' }}>
            {formatDate(currentSession.sessionSet.tcgDate)}
          </Typography>
        </Box>
      </Box>

      {currentSession.setsBetween.length > 0 && (
        <Box>
          <Typography
            variant="body2"
            sx={{
              color: 'var(--text-secondary)',
              mb: 1.5,
              fontWeight: 'bold',
            }}
          >
            {isFirstSession ? 'Sets released this session' : 'Sets being released this session:'}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {currentSession.setsBetween.map((set) => (
              <Box
                key={set.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: 1.5,
                  backgroundColor: 'var(--bg-elevated)',
                  borderRadius: 1,
                  border: '1px solid var(--border-color)',
                }}
              >
                <Chip
                  label={set.setCode}
                  size="small"
                  sx={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-bright)',
                    fontFamily: 'monospace',
                    minWidth: '60px',
                  }}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{ color: 'var(--text-primary)', fontWeight: 500 }}
                  >
                    {set.setName}
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  sx={{ color: 'var(--text-secondary)', minWidth: '90px', textAlign: 'right' }}
                >
                  {formatDate(set.tcgDate)}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {currentSession.setsBetween.length === 0 && (
        <Typography sx={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
          No sets being released before this session.
        </Typography>
      )}

      {isAdmin && (
        <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid var(--border-color)' }}>
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => handleDelete(currentSession.sessionNumber)}
            disabled={deleting}
            sx={{
              backgroundColor: 'var(--error)',
              '&:hover': {
                backgroundColor: '#d66e5d',
              },
            }}
          >
            {deleting ? 'Deleting...' : 'Delete Session'}
          </Button>
        </Box>
      )}
    </Paper>
  );
}
