'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  TextField,
  Autocomplete,
  IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  getExcludedCards,
  addExcludedCard,
  removeExcludedCard,
  searchCards,
  type ExcludedCard
} from './actions';

export default function SynergyExclusionsPage() {
  const [excludedCards, setExcludedCards] = useState<ExcludedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: number; name: string }>>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState<{ id: number; name: string } | null>(null);
  const [addingCard, setAddingCard] = useState(false);

  // Load excluded cards
  useEffect(() => {
    loadExcludedCards();
  }, []);

  const loadExcludedCards = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getExcludedCards();
      if (result.success && result.cards) {
        setExcludedCards(result.cards);
      } else {
        setError(result.error || 'Failed to load excluded cards');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Search for cards
  useEffect(() => {
    const search = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setSearchLoading(true);
      try {
        const result = await searchCards(searchQuery);
        if (result.success && result.cards) {
          setSearchResults(result.cards);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setSearchLoading(false);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleAddCard = async () => {
    if (!selectedCard) return;

    setAddingCard(true);
    setError(null);

    try {
      const result = await addExcludedCard(selectedCard.id);
      if (result.success) {
        await loadExcludedCards();
        setSelectedCard(null);
        setSearchQuery('');
        setSearchResults([]);
      } else {
        setError(result.error || 'Failed to add card');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setAddingCard(false);
    }
  };

  const handleRemoveCard = async (id: number) => {
    if (!confirm('Are you sure you want to remove this card from the exclusion list?')) {
      return;
    }

    setError(null);

    try {
      const result = await removeExcludedCard(id);
      if (result.success) {
        await loadExcludedCards();
      } else {
        setError(result.error || 'Failed to remove card');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
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
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Card Synergy Exclusions
      </Typography>
      <Typography variant="body1" color="var(--text-secondary)" sx={{ mb: 3 }}>
        Cards in this list will be excluded from synergy calculations. Use this for staple cards that appear in every deck.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Add Card Section */}
      <Paper sx={{ p: 3, mb: 3, backgroundColor: 'var(--bg-elevated)' }}>
        <Typography variant="h6" gutterBottom>
          Add Card to Exclusion List
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <Autocomplete
            sx={{ flexGrow: 1 }}
            options={searchResults}
            getOptionLabel={(option) => option.name}
            loading={searchLoading}
            value={selectedCard}
            onChange={(_, newValue) => setSelectedCard(newValue)}
            inputValue={searchQuery}
            onInputChange={(_, newValue) => setSearchQuery(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search for a card"
                placeholder="Type at least 2 characters..."
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {searchLoading ? <CircularProgress size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
          <Button
            variant="contained"
            onClick={handleAddCard}
            disabled={!selectedCard || addingCard}
            sx={{ minWidth: 120, height: 56 }}
          >
            {addingCard ? <CircularProgress size={24} /> : 'Add Card'}
          </Button>
        </Box>
      </Paper>

      {/* Excluded Cards Table */}
      <Paper sx={{ backgroundColor: 'var(--bg-elevated)' }}>
        <Box sx={{ p: 3, pb: 2 }}>
          <Typography variant="h6">
            Excluded Cards ({excludedCards.length})
          </Typography>
        </Box>
        {excludedCards.length > 0 ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <TableCell><strong>Card Name</strong></TableCell>
                  <TableCell><strong>Added At</strong></TableCell>
                  <TableCell align="right"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {excludedCards.map((card) => (
                  <TableRow key={card.id}>
                    <TableCell>{card.cardName}</TableCell>
                    <TableCell>{new Date(card.addedAt).toLocaleDateString()}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveCard(card.id)}
                        sx={{ color: 'var(--error)' }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ p: 3 }}>
            <Typography color="var(--text-secondary)">
              No cards are currently excluded from synergy calculations.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
