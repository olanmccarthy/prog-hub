'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
  Button,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { getChosenSuggestionData, updateChosenSuggestion, ChosenSuggestionData } from './actions';

export default function ChosenSuggestionPage() {
  const [data, setData] = useState<ChosenSuggestionData | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
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
      const result = await getChosenSuggestionData();

      if (result.success && result.data) {
        setData(result.data);
        setSelectedId(result.data.currentChosenId);
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
    if (!data?.activeSessionId || selectedId === null) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const result = await updateChosenSuggestion(data.activeSessionId, selectedId);

      if (result.success) {
        setSuccess('Chosen suggestion updated successfully');
        await fetchData();
      } else {
        setError(result.error || 'Failed to update chosen suggestion');
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
          Change Chosen Suggestion
        </Typography>
        <Alert severity="warning">
          No active session found. Start a session first.
        </Alert>
      </Box>
    );
  }

  if (data.suggestions.length === 0) {
    return (
      <Box>
        <Typography variant="h4" sx={{ mb: 3, color: 'var(--text-bright)' }}>
          Change Chosen Suggestion
        </Typography>
        <Alert severity="info">
          No banlist suggestions have been submitted for this session yet.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, color: 'var(--text-bright)' }}>
        Change Chosen Suggestion
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
          Session {data.activeSessionNumber}
        </Typography>

        <RadioGroup
          value={selectedId || ''}
          onChange={(e) => setSelectedId(Number(e.target.value))}
        >
          {data.suggestions.map((suggestion) => (
            <Paper
              key={suggestion.id}
              sx={{
                p: 2,
                mb: 2,
                backgroundColor: suggestion.chosen ? 'rgba(76, 175, 80, 0.1)' : 'var(--bg-tertiary)',
                border: `1px solid ${suggestion.chosen ? 'var(--success)' : 'var(--border-color)'}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <FormControlLabel
                  value={suggestion.id}
                  control={
                    <Radio
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
                      <Typography sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }}>
                        {suggestion.playerName}&apos;s Suggestion
                      </Typography>
                      {suggestion.chosen && (
                        <Chip
                          icon={<CheckCircleIcon />}
                          label="Currently Chosen"
                          size="small"
                          sx={{
                            backgroundColor: 'var(--success)',
                            color: 'white',
                          }}
                        />
                      )}
                      <Chip
                        label={`${suggestion.voteCount} votes`}
                        size="small"
                        sx={{
                          backgroundColor: 'var(--bg-secondary)',
                          color: 'var(--text-secondary)',
                        }}
                      />
                    </Box>
                  }
                />
              </Box>
              <Box sx={{ ml: 4, color: 'var(--text-secondary)' }}>
                <Typography variant="body2">
                  Banned: {suggestion.banned.length} • Limited: {suggestion.limited.length} •
                  Semi-Limited: {suggestion.semilimited.length} • Unlimited: {suggestion.unlimited.length}
                </Typography>
              </Box>
            </Paper>
          ))}
        </RadioGroup>

        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || selectedId === data.currentChosenId}
          sx={{
            mt: 2,
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
