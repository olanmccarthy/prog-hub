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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { getMostRecentBanlist, getPlayerId } from '@/src/app/banlist/actions';
import { BanlistSuggestion } from '@/src/types';

const mockCardSuggestions = [
  'Dark Magician',
  'Blue-Eyes White Dragon',
  'Elemental HERO Stratos',
  'Green Baboon, Defender of the Forest',
  'Spirit Reaper',
];

interface CategorySuggestionSectionProps {
  title: string;
  cards: string[];
  onAddCard: (cardName: string) => void;
  onRemoveCard: (index: number) => void;
  onUpdateCard: (index: number, cardName: string) => void;
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
  return (
    <>
      <Typography
        variant="h5"
        component="h2"
        sx={{ mt: 2, mb: 1, color: 'var(--text-bright)' }}
      >
        {title}
      </Typography>
      {cards.map((card, index) => (
        <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <Autocomplete
            fullWidth
            freeSolo // remove this when we have real data
            options={mockCardSuggestions} // replace with real data
            inputValue={card}
            onInputChange={(event, newValue) =>
              onUpdateCard(index, newValue ?? '')
            }
            disabled={loading}
            filterOptions={(options, state) => {
              // Only show suggestions if input is 3+ characters
              if (state.inputValue.length < 3) {
                return [];
              }
              // Use default filtering for 3+ characters
              return options.filter((option) =>
                option.toLowerCase().includes(state.inputValue.toLowerCase()),
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                placeholder="Card name"
                sx={{
                  '& .MuiInputBase-input': { color: 'var(--text-primary)' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: 'var(--border-color)' },
                    '&:hover fieldset': {
                      borderColor: 'var(--accent-primary)',
                    },
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
      ))}
      <Button
        startIcon={<AddIcon />}
        onClick={() => onAddCard('')}
        disabled={loading}
        variant="outlined"
        sx={{ mb: 3 }}
      >
        Add {title} Card
      </Button>
    </>
  );
}

function useSuggestionFields(initialValue: string[] = []) {
  const [cards, setCards] = useState<string[]>(initialValue);

  const addCard = (cardName: string) => {
    setCards([...cards, cardName]);
  };

  const removeCard = (index: number) => {
    setCards(cards.filter((_, i) => i !== index));
  };

  const updateCard = (index: number, cardName: string) => {
    setCards(cards.map((card, i) => (i === index ? cardName : card)));
  };

  return { cards, addCard, removeCard, updateCard };
}

export default function BanlistSuggestionCreationPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [banlistId, setBanlistId] = useState<number | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError('');

      const [user, banlistResult] = await Promise.all([
        getPlayerId(),
        getMostRecentBanlist(),
      ]);

      if (!user?.playerId) {
        setError('Not authenticated');
        return;
      }

      if (!banlistResult.success || !banlistResult.banlist) {
        setError(banlistResult.error || 'Failed to fetch banlist');
        return;
      }

      setPlayerId(user.playerId);
      setBanlistId(banlistResult.banlist.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load initial data',
      );
    } finally {
      setLoading(false);
    }
  };

  const banned = useSuggestionFields();
  const limited = useSuggestionFields();
  const semilimited = useSuggestionFields();
  const unlimited = useSuggestionFields();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('Submitting suggestion:', {
      banned: banned.cards,
      limited: limited.cards,
      semilimited: semilimited.cards,
      unlimited: unlimited.cards,
    });

    // TODO: Validation
    // ensure no list has duplicate cards
    // ensure that no card appears in multiple lists

    const banlistSuggestion: BanlistSuggestion = {
      playerId: playerId!,
      banlistId: banlistId!,
      banned: banned.cards,
      limited: limited.cards,
      semilimited: semilimited.cards,
      unlimited: unlimited.cards,
      chosen: false,
      id: 0,
    };

    console.log(JSON.stringify(banlistSuggestion));

    try {
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Submission error:', err);
    } finally {
      setLoading(false);
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
          Create Banlist Suggestion
        </Typography>
        <Typography variant="body1" sx={{ color: 'var(--text-secondary)' }}>
          Submit your suggested changes to the banlist.
        </Typography>
      </Box>

      {error && (
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
            loading={loading}
          />

          <CategorySuggestionSection
            title="Limited"
            cards={limited.cards}
            onAddCard={limited.addCard}
            onRemoveCard={limited.removeCard}
            onUpdateCard={limited.updateCard}
            loading={loading}
          />

          <CategorySuggestionSection
            title="Semi-Limited"
            cards={semilimited.cards}
            onAddCard={semilimited.addCard}
            onRemoveCard={semilimited.removeCard}
            onUpdateCard={semilimited.updateCard}
            loading={loading}
          />

          <CategorySuggestionSection
            title="Unlimited"
            cards={unlimited.cards}
            onAddCard={unlimited.addCard}
            onRemoveCard={unlimited.removeCard}
            onUpdateCard={unlimited.updateCard}
            loading={loading}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            sx={{ mt: 3 }}
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Submit'}
          </Button>
        </form>
      </Paper>

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
