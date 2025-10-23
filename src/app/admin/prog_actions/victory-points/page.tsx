'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  getVictoryPointEditorData,
  getSessionVictoryPoints,
  addVictoryPoint,
  removeVictoryPoint,
  VictoryPointEditorData,
  SessionVictoryPointData,
} from './actions';

export default function VictoryPointEditorPage() {
  const [data, setData] = useState<VictoryPointEditorData | null>(null);
  const [sessionData, setSessionData] = useState<SessionVictoryPointData | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSession, setLoadingSession] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getVictoryPointEditorData();

      if (result.success && result.data) {
        setData(result.data);
        // Auto-select active session if available
        if (result.data.activeSessionId) {
          setSelectedSessionId(result.data.activeSessionId);
          await loadSessionData(result.data.activeSessionId);
        }
      } else {
        setError(result.error || 'Failed to load data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const loadSessionData = async (sessionId: number) => {
    try {
      setLoadingSession(true);
      setError(null);
      const result = await getSessionVictoryPoints(sessionId);

      if (result.success && result.data) {
        setSessionData(result.data);
      } else {
        setError(result.error || 'Failed to load session data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoadingSession(false);
    }
  };

  const handleSessionChange = async (sessionId: number) => {
    setSelectedSessionId(sessionId);
    setSelectedPlayerId(null);
    await loadSessionData(sessionId);
  };

  const handleAddVictoryPoint = async () => {
    if (!selectedSessionId || !selectedPlayerId) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const result = await addVictoryPoint(selectedSessionId, selectedPlayerId);

      if (result.success) {
        setSuccess('Victory point added successfully');
        setSelectedPlayerId(null);
        await loadSessionData(selectedSessionId);
      } else {
        setError(result.error || 'Failed to add victory point');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveVictoryPoint = async (vpId: number) => {
    if (!selectedSessionId) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const result = await removeVictoryPoint(vpId);

      if (result.success) {
        setSuccess('Victory point removed successfully');
        await loadSessionData(selectedSessionId);
      } else {
        setError(result.error || 'Failed to remove victory point');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, color: 'var(--text-bright)' }}>
        Edit Victory Points
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Paper
        sx={{
          p: 3,
          mb: 3,
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, color: 'var(--text-bright)' }}>
          Select Session
        </Typography>

        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel
            sx={{
              color: 'var(--text-secondary)',
              '&.Mui-focused': {
                color: 'var(--accent-primary)',
              },
            }}
          >
            Session
          </InputLabel>
          <Select
            value={selectedSessionId || ''}
            onChange={(e) => handleSessionChange(e.target.value as number)}
            label="Session"
            sx={{
              color: 'var(--text-primary)',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'var(--border-color)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'var(--accent-primary)',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: 'var(--accent-primary)',
              },
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  backgroundColor: 'var(--bg-secondary)',
                  '& .MuiMenuItem-root': {
                    color: 'var(--text-primary)',
                    '&:hover': {
                      backgroundColor: 'var(--bg-tertiary)',
                    },
                    '&.Mui-selected': {
                      backgroundColor: 'var(--accent-primary)',
                      '&:hover': {
                        backgroundColor: 'var(--accent-blue-hover)',
                      },
                    },
                  },
                },
              },
            }}
          >
            {data?.allSessions.map((session) => (
              <MenuItem key={session.id} value={session.id}>
                Session {session.number}
                {session.id === data?.activeSessionId && (
                  <Chip
                    label="Active"
                    size="small"
                    sx={{
                      ml: 1,
                      height: '20px',
                      backgroundColor: 'var(--success)',
                      color: 'white',
                    }}
                  />
                )}
                {session.complete && (
                  <Chip
                    label="Complete"
                    size="small"
                    sx={{
                      ml: 1,
                      height: '20px',
                      backgroundColor: 'var(--text-secondary)',
                      color: 'white',
                    }}
                  />
                )}
                <Typography component="span" sx={{ ml: 1, color: 'var(--text-secondary)' }}>
                  ({session.vpCount} VP{session.vpCount !== 1 ? 's' : ''})
                </Typography>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedSessionId && (
          <>
            <Typography variant="h6" sx={{ mb: 2, color: 'var(--text-bright)' }}>
              Add Victory Point
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <FormControl sx={{ flex: 1 }}>
                <InputLabel
                  sx={{
                    color: 'var(--text-secondary)',
                    '&.Mui-focused': {
                      color: 'var(--accent-primary)',
                    },
                  }}
                >
                  Player
                </InputLabel>
                <Select
                  value={selectedPlayerId || ''}
                  onChange={(e) => setSelectedPlayerId(e.target.value as number)}
                  label="Player"
                  sx={{
                    color: 'var(--text-primary)',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'var(--border-color)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'var(--accent-primary)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'var(--accent-primary)',
                    },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        backgroundColor: 'var(--bg-secondary)',
                        '& .MuiMenuItem-root': {
                          color: 'var(--text-primary)',
                          '&:hover': {
                            backgroundColor: 'var(--bg-tertiary)',
                          },
                          '&.Mui-selected': {
                            backgroundColor: 'var(--accent-primary)',
                            '&:hover': {
                              backgroundColor: 'var(--accent-blue-hover)',
                            },
                          },
                        },
                      },
                    },
                  }}
                >
                  {data?.allPlayers.map((player) => (
                    <MenuItem key={player.id} value={player.id}>
                      {player.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddVictoryPoint}
                disabled={!selectedPlayerId || saving}
                sx={{
                  backgroundColor: 'var(--accent-primary)',
                  '&:hover': {
                    backgroundColor: 'var(--accent-blue-hover)',
                  },
                  '&:disabled': {
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                  },
                }}
              >
                {saving ? <CircularProgress size={24} /> : 'Add VP'}
              </Button>
            </Box>

            <Typography variant="h6" sx={{ mb: 2, color: 'var(--text-bright)' }}>
              Current Victory Points
            </Typography>

            {loadingSession ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : sessionData?.victoryPoints.length === 0 ? (
              <Typography sx={{ color: 'var(--text-secondary)', fontStyle: 'italic', p: 2 }}>
                No victory points assigned for this session yet.
              </Typography>
            ) : (
              <TableContainer
                component={Paper}
                sx={{
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }}>
                        Player
                      </TableCell>
                      <TableCell sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }} align="right">
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sessionData?.victoryPoints.map((vp) => (
                      <TableRow
                        key={vp.id}
                        sx={{
                          '&:hover': {
                            backgroundColor: 'var(--bg-secondary)',
                          },
                        }}
                      >
                        <TableCell sx={{ color: 'var(--text-primary)' }}>
                          {vp.playerName}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveVictoryPoint(vp.id)}
                            disabled={saving}
                            sx={{
                              color: 'var(--error)',
                              '&:hover': {
                                backgroundColor: 'var(--bg-secondary)',
                              },
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
}
