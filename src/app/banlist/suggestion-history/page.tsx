'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Alert,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
  getAllBanlistSuggestions,
  type BanlistSuggestionHistory,
} from './actions';

/*
 * TODO: Update this to fetch and display card names from the cards table
 * Currently displays card IDs directly.
 */
function CategoryCard({ title, cards }: { title: string; cards: number[] }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography
        variant="subtitle1"
        sx={{ color: 'var(--text-bright)', fontWeight: 'bold', mb: 1 }}
      >
        {title} ({cards.length})
      </Typography>
      {cards.length > 0 ? (
        <Box sx={{ pl: 2 }}>
          {cards.map((card, idx) => (
            <Typography
              key={idx}
              variant="body1"
              sx={{ color: 'var(--text-primary)', mb: 0.5 }}
            >
              {card}
            </Typography>
          ))}
        </Box>
      ) : (
        <Typography variant="body1" sx={{ color: 'var(--text-secondary)' }}>
          No cards
        </Typography>
      )}
    </Box>
  );
}

function SuggestedBanlistCard({
  suggestion,
}: {
  suggestion: BanlistSuggestionHistory;
}) {
  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          mb: 3,
        }}
      >
        <Typography variant="h5" sx={{ color: 'var(--text-bright)', flex: 1 }}>
          Session {suggestion.sessionNumber} - {suggestion.playerName}
        </Typography>
        {suggestion.chosen && (
          <Chip
            icon={<CheckCircleIcon />}
            label="Chosen"
            color="success"
            size="small"
          />
        )}
      </Box>
      <CategoryCard title="Banned" cards={suggestion.banned} />
      <CategoryCard title="Limited" cards={suggestion.limited} />
      <CategoryCard title="Semi-Limited" cards={suggestion.semilimited} />
      <CategoryCard title="Unlimited" cards={suggestion.unlimited} />
    </>
  );
}

export default function BanlistSuggestionHistoryPage() {
  const [suggestions, setSuggestions] = useState<BanlistSuggestionHistory[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<number | 'all'>('all');

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    setLoading(true);
    setError(null);
    const result = await getAllBanlistSuggestions();
    if (result.success && result.suggestions) {
      setSuggestions(result.suggestions);
    } else {
      setError(result.error || 'Failed to load suggestions');
    }
    setLoading(false);
  };

  const sessionList = useMemo(() => {
    const sessions = [...new Set(suggestions.map((s) => s.sessionNumber))];
    return sessions.sort((a, b) => b - a);
  }, [suggestions]);

  const filteredSuggestions = useMemo(() => {
    if (selectedSession === 'all') return suggestions;
    return suggestions.filter((s) => s.sessionNumber === selectedSession);
  }, [suggestions, selectedSession]);

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
          Banlist Suggestion History
        </Typography>
        <Typography variant="body1" sx={{ color: 'var(--text-secondary)' }}>
          View past banlist suggestions and voting results
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!loading && suggestions.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel
              sx={{
                color: 'var(--text-secondary)',
                '&.Mui-focused': { color: 'var(--accent-primary)' },
              }}
            >
              Filter by Session
            </InputLabel>
            <Select
              value={selectedSession}
              label="Filter by Session"
              onChange={(e) =>
                setSelectedSession(e.target.value as number | 'all')
              }
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
            >
              <MenuItem value="all">All Sessions</MenuItem>
              {sessionList.map((session) => (
                <MenuItem key={session} value={session}>
                  Session {session}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {loading ? (
        <Paper
          sx={{
            p: 3,
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <CircularProgress />
        </Paper>
      ) : filteredSuggestions.length === 0 ? (
        <Paper
          sx={{
            p: 3,
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
          }}
        >
          <Typography sx={{ color: 'var(--text-secondary)' }}>
            {selectedSession === 'all'
              ? 'No banlist suggestions found'
              : `No banlist suggestions found for Session ${selectedSession}`}
          </Typography>
        </Paper>
      ) : (
        filteredSuggestions.map((suggestion) => (
          <Paper
            key={suggestion.id}
            sx={{
              mb: 3,
              p: 3,
              backgroundColor: 'var(--bg-secondary)',
              border: suggestion.chosen
                ? '2px solid #4caf50'
                : '1px solid var(--border-color)',
            }}
          >
            <SuggestedBanlistCard suggestion={suggestion} />
          </Paper>
        ))
      )}
    </Container>
  );
}
