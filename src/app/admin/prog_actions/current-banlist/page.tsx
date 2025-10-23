'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { getCurrentBanlistData, updateCurrentBanlist, CurrentBanlistData } from './actions';

export default function CurrentBanlistEditorPage() {
  const [data, setData] = useState<CurrentBanlistData | null>(null);
  const [banned, setBanned] = useState<number[]>([]);
  const [limited, setLimited] = useState<number[]>([]);
  const [semilimited, setSemilimited] = useState<number[]>([]);
  const [unlimited, setUnlimited] = useState<number[]>([]);
  const [newCardId, setNewCardId] = useState<string>('');
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
      const result = await getCurrentBanlistData();

      if (result.success && result.data) {
        setData(result.data);
        setBanned(result.data.banned);
        setLimited(result.data.limited);
        setSemilimited(result.data.semilimited);
        setUnlimited(result.data.unlimited);
      } else {
        setError(result.error || 'Failed to load data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const addCard = (category: 'banned' | 'limited' | 'semilimited' | 'unlimited') => {
    const cardId = parseInt(newCardId);
    if (isNaN(cardId)) {
      setError('Please enter a valid card ID');
      return;
    }

    // Remove from all other categories
    setBanned((prev) => prev.filter((id) => id !== cardId));
    setLimited((prev) => prev.filter((id) => id !== cardId));
    setSemilimited((prev) => prev.filter((id) => id !== cardId));
    setUnlimited((prev) => prev.filter((id) => id !== cardId));

    // Add to selected category
    if (category === 'banned') setBanned((prev) => [...prev, cardId]);
    else if (category === 'limited') setLimited((prev) => [...prev, cardId]);
    else if (category === 'semilimited') setSemilimited((prev) => [...prev, cardId]);
    else if (category === 'unlimited') setUnlimited((prev) => [...prev, cardId]);

    setNewCardId('');
  };

  const removeCard = (category: 'banned' | 'limited' | 'semilimited' | 'unlimited', cardId: number) => {
    if (category === 'banned') setBanned((prev) => prev.filter((id) => id !== cardId));
    else if (category === 'limited') setLimited((prev) => prev.filter((id) => id !== cardId));
    else if (category === 'semilimited') setSemilimited((prev) => prev.filter((id) => id !== cardId));
    else if (category === 'unlimited') setUnlimited((prev) => prev.filter((id) => id !== cardId));
  };

  const handleSave = async () => {
    if (!data?.activeSessionNumber) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const result = await updateCurrentBanlist(
        data.activeSessionNumber,
        banned,
        limited,
        semilimited,
        unlimited
      );

      if (result.success) {
        setSuccess('Banlist updated successfully');
        await fetchData();
      } else {
        setError(result.error || 'Failed to update banlist');
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
          Edit Current Banlist
        </Typography>
        <Alert severity="warning">
          No active session found. Start a session first.
        </Alert>
      </Box>
    );
  }

  const renderCardList = (
    title: string,
    cards: number[],
    category: 'banned' | 'limited' | 'semilimited' | 'unlimited',
    color: string
  ) => (
    <Paper
      sx={{
        p: 2,
        mb: 2,
        backgroundColor: 'var(--bg-tertiary)',
        border: '1px solid var(--border-color)',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ color: 'var(--text-bright)' }}>
          {title} ({cards.length})
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            type="number"
            placeholder="Card ID"
            value={newCardId}
            onChange={(e) => setNewCardId(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                addCard(category);
              }
            }}
            sx={{
              width: '120px',
              '& input': {
                color: 'var(--text-primary)',
              },
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'var(--input-bg)',
                '& fieldset': {
                  borderColor: 'var(--input-border)',
                },
              },
            }}
          />
          <Button
            variant="contained"
            size="small"
            onClick={() => addCard(category)}
            startIcon={<AddIcon />}
            sx={{
              backgroundColor: color,
              '&:hover': {
                backgroundColor: color,
                filter: 'brightness(1.2)',
              },
            }}
          >
            Add
          </Button>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {cards.length === 0 ? (
          <Typography sx={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            No cards in this category
          </Typography>
        ) : (
          cards.map((cardId) => (
            <Chip
              key={cardId}
              label={`ID: ${cardId}`}
              onDelete={() => removeCard(category, cardId)}
              deleteIcon={<DeleteIcon />}
              sx={{
                backgroundColor: color,
                color: 'white',
                '& .MuiChip-deleteIcon': {
                  color: 'white',
                  '&:hover': {
                    color: 'rgba(255, 255, 255, 0.7)',
                  },
                },
              }}
            />
          ))
        )}
      </Box>
    </Paper>
  );

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, color: 'var(--text-bright)' }}>
        Edit Current Banlist
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
        <Typography variant="h6" sx={{ mb: 3, color: 'var(--text-bright)' }}>
          Session {data.activeSessionNumber}
        </Typography>

        {renderCardList('Banned', banned, 'banned', '#f44336')}
        {renderCardList('Limited', limited, 'limited', '#ff9800')}
        {renderCardList('Semi-Limited', semilimited, 'semilimited', '#ffeb3b')}
        {renderCardList('Unlimited', unlimited, 'unlimited', '#4caf50')}

        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          fullWidth
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
          {saving ? <CircularProgress size={24} /> : 'Save Banlist'}
        </Button>
      </Paper>
    </Box>
  );
}
