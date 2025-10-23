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
} from '@mui/material';
import { getModeratorChangeData, updateModerator, ModeratorChangeData } from './actions';

export default function ModeratorChangePage() {
  const [data, setData] = useState<ModeratorChangeData | null>(null);
  const [selectedModeratorId, setSelectedModeratorId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getModeratorChangeData();

      if (result.success && result.data) {
        setData(result.data);
        setSelectedModeratorId(result.data.currentModeratorId);
      } else {
        setError(result.error || 'Failed to load data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!data?.activeSessionId || selectedModeratorId === null) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const result = await updateModerator(data.activeSessionId, selectedModeratorId);

      if (result.success) {
        setSuccess('Moderator updated successfully');
        await fetchData();
      } else {
        setError(result.error || 'Failed to update moderator');
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

  if (!data?.activeSessionId) {
    return (
      <Box>
        <Typography variant="h4" sx={{ mb: 3, color: 'var(--text-bright)' }}>
          Change Moderator
        </Typography>
        <Alert severity="warning">
          No active session found. Start a session first.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, color: 'var(--text-bright)' }}>
        Change Moderator
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
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, color: 'var(--text-bright)' }}>
          Session {data.activeSessionNumber}
        </Typography>

        <Typography variant="body2" sx={{ mb: 3, color: 'var(--text-secondary)' }}>
          Current Moderator: {data.currentModeratorName || 'Not set'}
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
            Select New Moderator
          </InputLabel>
          <Select
            value={selectedModeratorId || ''}
            onChange={(e) => setSelectedModeratorId(e.target.value as number)}
            label="Select New Moderator"
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
            {data.allPlayers.map((player) => (
              <MenuItem key={player.id} value={player.id}>
                {player.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || selectedModeratorId === data.currentModeratorId}
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
          {saving ? <CircularProgress size={24} /> : 'Save Changes'}
        </Button>
      </Paper>
    </Box>
  );
}
