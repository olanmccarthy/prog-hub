'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Autocomplete,
  TextField,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  getCurrentBanlistData,
  updateCurrentBanlist,
  CurrentBanlistData,
  searchCardNames,
  getCardNames,
  CardOption,
} from './actions';

interface CardEntry {
  id: number;
  name: string;
}

interface CardListSectionProps {
  title: string;
  cards: CardEntry[];
  category: 'banned' | 'limited' | 'semilimited' | 'unlimited';
  color: string;
  onAddCard: (category: 'banned' | 'limited' | 'semilimited' | 'unlimited', card: CardEntry) => void;
  onRemoveCard: (category: 'banned' | 'limited' | 'semilimited' | 'unlimited', cardId: number) => void;
}

function CardListSection({ title, cards, category, color, onAddCard, onRemoveCard }: CardListSectionProps) {
  const [cardOptions, setCardOptions] = useState<CardOption[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [loadingOptions, setLoadingOptions] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchValue(query);

    if (query.length >= 3) {
      setLoadingOptions(true);
      try {
        const result = await searchCardNames(query);
        if (result.success && result.cards) {
          setCardOptions(result.cards);
        }
      } finally {
        setLoadingOptions(false);
      }
    } else {
      setCardOptions([]);
    }
  };

  const handleSelect = (option: CardOption | null) => {
    if (option) {
      onAddCard(category, { id: option.id, name: option.name });
      setSearchValue('');
      setCardOptions([]);
    }
  };

  return (
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
      </Box>

      <Autocomplete
        freeSolo
        options={cardOptions}
        loading={loadingOptions}
        inputValue={searchValue}
        onInputChange={(event, newValue) => {
          handleSearch(newValue);
        }}
        onChange={(event, newValue) => {
          if (typeof newValue !== 'string' && newValue) {
            handleSelect(newValue);
          }
        }}
        getOptionLabel={(option) => {
          if (typeof option === 'string') return option;
          return option.name;
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={`Search card names (min 3 characters)...`}
            size="small"
            sx={{
              mb: 2,
              '& input': {
                color: 'var(--text-primary)',
              },
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'var(--input-bg)',
                '& fieldset': {
                  borderColor: 'var(--input-border)',
                },
                '&:hover fieldset': {
                  borderColor: 'var(--text-secondary)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: color,
                },
              },
            }}
          />
        )}
        sx={{
          '& .MuiAutocomplete-option': {
            color: 'var(--text-primary)',
            backgroundColor: 'var(--bg-secondary)',
            '&:hover': {
              backgroundColor: 'var(--bg-tertiary)',
            },
          },
          '& .MuiAutocomplete-listbox': {
            backgroundColor: 'var(--bg-secondary)',
          },
          '& .MuiAutocomplete-paper': {
            backgroundColor: 'var(--bg-secondary)',
          },
        }}
      />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {cards.length === 0 ? (
          <Typography sx={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            No cards in this category
          </Typography>
        ) : (
          cards.map((card) => (
            <Chip
              key={card.id}
              label={card.name}
              onDelete={() => onRemoveCard(category, card.id)}
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
}

export default function CurrentBanlistEditorPage() {
  const [data, setData] = useState<CurrentBanlistData | null>(null);
  const [banned, setBanned] = useState<CardEntry[]>([]);
  const [limited, setLimited] = useState<CardEntry[]>([]);
  const [semilimited, setSemilimited] = useState<CardEntry[]>([]);
  const [unlimited, setUnlimited] = useState<CardEntry[]>([]);

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

        // Fetch card names for all IDs
        const allIds = [
          ...result.data.banned,
          ...result.data.limited,
          ...result.data.semilimited,
          ...result.data.unlimited,
        ];

        if (allIds.length > 0) {
          const namesResult = await getCardNames(allIds);
          if (namesResult.success && namesResult.cards) {
            const cardMap = new Map(namesResult.cards.map(c => [c.id, c.name]));

            setBanned(result.data.banned.map(id => ({
              id,
              name: cardMap.get(id) || `Unknown Card (${id})`
            })));
            setLimited(result.data.limited.map(id => ({
              id,
              name: cardMap.get(id) || `Unknown Card (${id})`
            })));
            setSemilimited(result.data.semilimited.map(id => ({
              id,
              name: cardMap.get(id) || `Unknown Card (${id})`
            })));
            setUnlimited(result.data.unlimited.map(id => ({
              id,
              name: cardMap.get(id) || `Unknown Card (${id})`
            })));
          }
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

  const addCard = (category: 'banned' | 'limited' | 'semilimited' | 'unlimited', card: CardEntry) => {
    // Remove from all other categories
    setBanned((prev) => prev.filter((c) => c.id !== card.id));
    setLimited((prev) => prev.filter((c) => c.id !== card.id));
    setSemilimited((prev) => prev.filter((c) => c.id !== card.id));
    setUnlimited((prev) => prev.filter((c) => c.id !== card.id));

    // Add to selected category
    if (category === 'banned') setBanned((prev) => [...prev, card]);
    else if (category === 'limited') setLimited((prev) => [...prev, card]);
    else if (category === 'semilimited') setSemilimited((prev) => [...prev, card]);
    else if (category === 'unlimited') setUnlimited((prev) => [...prev, card]);
  };

  const removeCard = (category: 'banned' | 'limited' | 'semilimited' | 'unlimited', cardId: number) => {
    if (category === 'banned') setBanned((prev) => prev.filter((c) => c.id !== cardId));
    else if (category === 'limited') setLimited((prev) => prev.filter((c) => c.id !== cardId));
    else if (category === 'semilimited') setSemilimited((prev) => prev.filter((c) => c.id !== cardId));
    else if (category === 'unlimited') setUnlimited((prev) => prev.filter((c) => c.id !== cardId));
  };

  const handleSave = async () => {
    if (!data?.activeSessionNumber) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const result = await updateCurrentBanlist(
        data.activeSessionNumber,
        banned.map(c => c.id),
        limited.map(c => c.id),
        semilimited.map(c => c.id),
        unlimited.map(c => c.id)
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

        <CardListSection
          title="Banned"
          cards={banned}
          category="banned"
          color="#f44336"
          onAddCard={addCard}
          onRemoveCard={removeCard}
        />
        <CardListSection
          title="Limited"
          cards={limited}
          category="limited"
          color="#ff9800"
          onAddCard={addCard}
          onRemoveCard={removeCard}
        />
        <CardListSection
          title="Semi-Limited"
          cards={semilimited}
          category="semilimited"
          color="#ffeb3b"
          onAddCard={addCard}
          onRemoveCard={removeCard}
        />
        <CardListSection
          title="Unlimited"
          cards={unlimited}
          category="unlimited"
          color="#4caf50"
          onAddCard={addCard}
          onRemoveCard={removeCard}
        />

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
