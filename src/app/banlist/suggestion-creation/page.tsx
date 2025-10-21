'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
  Alert,
  Card,
  IconButton,
  Autocomplete,
  Snackbar,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { getMostRecentBanlist } from '@/src/app/banlist/actions';
import { createBanlistSuggestion, CreateSuggestionInput, canSubmitSuggestions, searchCardNames, CardOption, getExistingSuggestion, getCardEntriesFromIds } from './actions';

interface CardEntry {
  name: string;
  id: number | null; // null if not selected from suggestions
}

interface CategorySuggestionSectionProps {
  title: string;
  cards: CardEntry[];
  onAddCard: () => void;
  onRemoveCard: (index: number) => void;
  onUpdateCard: (index: number, entry: CardEntry) => void;
  loading: boolean;
}

function CategorySuggestionSection({
  title,
  cards,
  onAddCard,
  onRemoveCard,
  onUpdateCard,
  loading,
}: CategorySuggestionSectionProps) {
  const [cardOptions, setCardOptions] = useState<CardOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [currentSearchIndex, setCurrentSearchIndex] = useState<number | null>(null);

  // Debounced search for the current field
  useEffect(() => {
    if (currentSearchIndex === null) return;

    const currentCard = cards[currentSearchIndex];
    const searchQuery = currentCard?.name || '';

    const timeoutId = setTimeout(async () => {
      if (searchQuery.length >= 3) {
        setLoadingOptions(true);
        try {
          const result = await searchCardNames(searchQuery);
          if (result.success && result.cards) {
            setCardOptions(result.cards);
          }
        } finally {
          setLoadingOptions(false);
        }
      } else {
        setCardOptions([]);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [cards, currentSearchIndex]);

  return (
    <>
      <Typography
        variant="h5"
        component="h2"
        sx={{ mt: 2, mb: 1, color: 'var(--text-bright)' }}
      >
        {title}
      </Typography>
      {cards.map((cardEntry, index) => {
        const hasError = cardEntry.name.length > 0 && cardEntry.id === null;
        // Use index as key - it's stable as long as we don't reorder cards
        const stableKey = `${title}-card-${index}`;

        return (
          <Box key={stableKey} sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <Autocomplete
              fullWidth
              freeSolo
              options={cardOptions}
              getOptionLabel={(option) => {
                if (typeof option === 'string') return option;
                return option.name;
              }}
              inputValue={cardEntry.name}
              onInputChange={(event, newValue) => {
                // When user types, clear the ID until they select from suggestions
                onUpdateCard(index, { name: newValue ?? '', id: null });
                setCurrentSearchIndex(index);
              }}
              onChange={(event, newValue) => {
                // When user selects from suggestions
                if (newValue && typeof newValue !== 'string') {
                  onUpdateCard(index, { name: newValue.name, id: newValue.id });
                }
              }}
              onFocus={() => setCurrentSearchIndex(index)}
              disabled={loading}
              loading={loadingOptions && currentSearchIndex === index}
              filterOptions={(options) => options} // Don't filter, server already filtered
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="outlined"
                  placeholder="Card name (type 3+ characters)"
                  error={hasError}
                  helperText={hasError ? 'Please select a card from the suggestions' : ''}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingOptions && currentSearchIndex === index ? (
                          <CircularProgress color="inherit" size={20} />
                        ) : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                  sx={{
                    '& .MuiInputBase-input': { color: 'var(--text-primary)' },
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: hasError ? 'var(--error-color)' : 'var(--border-color)'
                      },
                      '&:hover fieldset': {
                        borderColor: hasError ? 'var(--error-color)' : 'var(--accent-primary)',
                      },
                    },
                    '& .MuiFormHelperText-root': {
                      color: 'var(--error-color)',
                    },
                  }}
                />
              )}
            />
            <IconButton
              onClick={() => onRemoveCard(index)}
              disabled={loading}
              color="error"
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        );
      })}
      <Button
        startIcon={<AddIcon />}
        onClick={onAddCard}
        disabled={loading}
        variant="outlined"
        sx={{ mb: 3 }}
      >
        Add {title} Card
      </Button>
    </>
  );
}

function useSuggestionFields(initialValue: CardEntry[] = []) {
  const [cards, setCards] = useState<CardEntry[]>(initialValue);

  const addCard = () => {
    setCards([...cards, { name: '', id: null }]);
  };

  const removeCard = (index: number) => {
    setCards(cards.filter((_, i) => i !== index));
  };

  const updateCard = (index: number, entry: CardEntry) => {
    setCards(cards.map((card, i) => (i === index ? entry : card)));
  };

  const hasErrors = () => {
    return cards.some(card => card.name.length > 0 && card.id === null);
  };

  const getCardIds = () => {
    return cards.filter(card => card.id !== null && card.id > 0).map(card => card.id as number);
  };

  return { cards, addCard, removeCard, updateCard, hasErrors, getCardIds, setCards };
}

export default function BanlistSuggestionCreationPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [banlistId, setBanlistId] = useState<number | null>(null);
  const [existingSuggestionId, setExistingSuggestionId] = useState<number | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [canSubmit, setCanSubmit] = useState(true);

  const banned = useSuggestionFields();
  const limited = useSuggestionFields();
  const semilimited = useSuggestionFields();
  const unlimited = useSuggestionFields();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError('');
      const banlistResult = await getMostRecentBanlist();
      if (banlistResult.success && banlistResult.banlist && banlistResult.banlist.id) {
        setBanlistId(banlistResult.banlist.id);

        // Check if suggestions can be submitted
        const canSubmitResult = await canSubmitSuggestions(banlistResult.banlist.id);
        if (canSubmitResult.success) {
          setCanSubmit(canSubmitResult.canSubmit);
          if (!canSubmitResult.canSubmit) {
            setError('Banlist suggestions cannot be submitted until the current session standings are finalized');
          }
        }

        // Load existing suggestion if any
        const existingResult = await getExistingSuggestion(banlistResult.banlist.id);
        if (existingResult.success && existingResult.suggestion) {
          setExistingSuggestionId(existingResult.suggestion.id);

          // Convert card IDs to CardEntry objects with names
          const [bannedEntries, limitedEntries, semilimitedEntries, unlimitedEntries] = await Promise.all([
            getCardEntriesFromIds(existingResult.suggestion.banned),
            getCardEntriesFromIds(existingResult.suggestion.limited),
            getCardEntriesFromIds(existingResult.suggestion.semilimited),
            getCardEntriesFromIds(existingResult.suggestion.unlimited),
          ]);

          // Set the cards with their IDs and names
          banned.setCards(bannedEntries);
          limited.setCards(limitedEntries);
          semilimited.setCards(semilimitedEntries);
          unlimited.setCards(unlimitedEntries);
        }
      } else {
        setError(banlistResult.error || 'Failed to fetch most recent banlist');
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load most recent banlist',
      );
    } finally {
      setLoading(false);
    }
  };

  const validateBanlistSuggestion = (
    banlist: CreateSuggestionInput,
  ): { isValid: boolean; error?: string } => {
    const cardToList = new Map<number, string>();

    const lists = {
      banned: banlist.banned,
      limited: banlist.limited,
      'semi-limited': banlist.semilimited,
      unlimited: banlist.unlimited,
    };

    for (const [listName, cardIds] of Object.entries(lists)) {
      const seenInList = new Set<number>();

      for (const cardId of cardIds) {
        // Check for invalid IDs
        if (!cardId || cardId <= 0) {
          return {
            isValid: false,
            error: `Invalid card ID in ${listName}`,
          };
        }
        // Check duplicate in same list
        if (seenInList.has(cardId)) {
          return {
            isValid: false,
            error: `Duplicate card in ${listName}`,
          };
        }

        // Check duplicate across lists
        const otherList = cardToList.get(cardId);
        if (otherList) {
          return {
            isValid: false,
            error: `Card appears in both ${otherList} and ${listName}`,
          };
        }

        seenInList.add(cardId);
        cardToList.set(cardId, listName);
      }
    }

    return { isValid: true };
  };

  const hasAnyErrors = () => {
    return banned.hasErrors() || limited.hasErrors() || semilimited.hasErrors() || unlimited.hasErrors();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for validation errors first
    if (hasAnyErrors()) {
      setError('Please select valid cards from the suggestions for all entries');
      return;
    }

    setSubmitting(true);
    try {
      const banlistSuggestion: CreateSuggestionInput = {
        banlistId: banlistId!,
        banned: banned.getCardIds(),
        limited: limited.getCardIds(),
        semilimited: semilimited.getCardIds(),
        unlimited: unlimited.getCardIds(),
        existingSuggestionId: existingSuggestionId ?? undefined,
      };

      const validation = validateBanlistSuggestion(banlistSuggestion);
      if (validation.isValid) {
        const result = await createBanlistSuggestion(banlistSuggestion);
        if (result.success) {
          setSnackbarOpen(true);
          setError('');

          // If we created a new suggestion, store the ID for future updates
          if (!existingSuggestionId && result.id) {
            setExistingSuggestionId(result.id);
          }
        } else {
          setError(result.error || 'Failed to submit suggestion');
        }
      } else {
        setError(validation.error || 'Invalid banlist suggestion!');
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An error submitting your banlist suggestion. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h3"
          component="h1"
          sx={{
            color: 'var(--text-bright)',
            mb: 2,
            fontWeight: 'bold',
          }}
        >
          {existingSuggestionId ? 'Edit' : 'Create'} Banlist Suggestion
        </Typography>
        <Typography variant="body1" sx={{ color: 'var(--text-secondary)' }}>
          {existingSuggestionId
            ? 'Update your banlist suggestion. Changes will be saved to your existing submission.'
            : 'Submit your suggested changes to the banlist.'}
        </Typography>
      </Box>

      {existingSuggestionId && (
        <Alert severity="info" sx={{ mb: 3 }}>
          You are editing your existing suggestion for this session.
        </Alert>
      )}

      {error && !canSubmit && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {error && canSubmit && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper
        sx={{
          p: 3,
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
        }}
      >
        <form onSubmit={handleSubmit}>
          <CategorySuggestionSection
            title="Banned"
            cards={banned.cards}
            onAddCard={banned.addCard}
            onRemoveCard={banned.removeCard}
            onUpdateCard={banned.updateCard}
            loading={loading || !canSubmit}
          />

          <CategorySuggestionSection
            title="Limited"
            cards={limited.cards}
            onAddCard={limited.addCard}
            onRemoveCard={limited.removeCard}
            onUpdateCard={limited.updateCard}
            loading={loading || !canSubmit}
          />

          <CategorySuggestionSection
            title="Semi-Limited"
            cards={semilimited.cards}
            onAddCard={semilimited.addCard}
            onRemoveCard={semilimited.removeCard}
            onUpdateCard={semilimited.updateCard}
            loading={loading || !canSubmit}
          />

          <CategorySuggestionSection
            title="Unlimited"
            cards={unlimited.cards}
            onAddCard={unlimited.addCard}
            onRemoveCard={unlimited.removeCard}
            onUpdateCard={unlimited.updateCard}
            loading={loading || !canSubmit}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            sx={{ mt: 3 }}
            disabled={loading || !canSubmit || hasAnyErrors()}
          >
            {submitting
              ? existingSuggestionId ? 'Updating...' : 'Submitting...'
              : existingSuggestionId ? 'Update Suggestion' : 'Submit Suggestion'}
          </Button>
        </form>
      </Paper>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={'success'}
          sx={{ width: '100%' }}
        >
          {existingSuggestionId
            ? 'Banlist suggestion updated successfully!'
            : 'Banlist suggestion submitted successfully!'}
        </Alert>
      </Snackbar>

      <Card
        sx={{
          mt: 3,
          p: 2,
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
        }}
      >
        <Typography variant="h6" sx={{ color: 'var(--text-bright)', mb: 1 }}>
          Debugging Info
        </Typography>
        <pre style={{ color: 'var(--text-primary)' }}>
          {JSON.stringify({ banned, limited, semilimited, unlimited }, null, 1)}
        </pre>
      </Card>
    </Container>
  );
}
