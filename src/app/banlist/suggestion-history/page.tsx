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
import { CategoryCard } from '@components/CategoryCard';

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
      {suggestion.chosen && suggestion.moderatorName && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
            <strong>Chosen by:</strong> {suggestion.moderatorName}
          </Typography>
        </Box>
      )}
      {suggestion.voters.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
            <strong>Voted by:</strong> {suggestion.voters.join(', ')}
          </Typography>
        </Box>
      )}
      {suggestion.comment && (
        <Box sx={{ mb: 3, p: 2, backgroundColor: 'var(--bg-tertiary)', borderRadius: 1 }}>
          <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 0.5 }}>
            <strong>Reasoning:</strong>
          </Typography>
          <Typography variant="body1" sx={{ color: 'var(--text-primary)' }}>
            {suggestion.comment}
          </Typography>
        </Box>
      )}
      <CategoryCard title="Banned" cards={suggestion.bannedNames} />
      <CategoryCard title="Limited" cards={suggestion.limitedNames} />
      <CategoryCard title="Semi-Limited" cards={suggestion.semilimitedNames} />
      <CategoryCard title="Unlimited" cards={suggestion.unlimitedNames} />
    </>
  );
}

export default function BanlistSuggestionHistoryPage() {
  const [suggestions, setSuggestions] = useState<BanlistSuggestionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<number | 'all' | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string | 'all'>('all');

  useEffect(() => {
    const fetchSuggestions = async () => {
      setLoading(true);
      setError(null);
      const result = await getAllBanlistSuggestions();
      if (result.success && result.suggestions) {
        setSuggestions(result.suggestions);
        // Set default session to the most recent (highest session number)
        if (selectedSession === null && result.suggestions.length > 0) {
          const mostRecentSession = Math.max(...result.suggestions.map(s => s.sessionNumber));
          setSelectedSession(mostRecentSession);
        }
      } else {
        setError(result.error || 'Failed to load suggestions');
      }
      setLoading(false);
    };

    fetchSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sessionList = useMemo(() => {
    const sessions = [...new Set(suggestions.map((s) => s.sessionNumber))];
    return sessions.sort((a, b) => b - a);
  }, [suggestions]);

  const playerList = useMemo(() => {
    const players = [...new Set(suggestions.map((s) => s.playerName))];
    return players.sort();
  }, [suggestions]);

  const filteredSuggestions = useMemo(() => {
    let filtered = suggestions;

    // Filter by session
    if (selectedSession !== 'all' && selectedSession !== null) {
      filtered = filtered.filter((s) => s.sessionNumber === selectedSession);
    }

    // Filter by player
    if (selectedPlayer !== 'all') {
      filtered = filtered.filter((s) => s.playerName === selectedPlayer);
    }

    return filtered;
  }, [suggestions, selectedSession, selectedPlayer]);

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
        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
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
              value={selectedSession ?? 'all'}
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
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel
              sx={{
                color: 'var(--text-secondary)',
                '&.Mui-focused': { color: 'var(--accent-primary)' },
              }}
            >
              Filter by Player
            </InputLabel>
            <Select
              value={selectedPlayer}
              label="Filter by Player"
              onChange={(e) =>
                setSelectedPlayer(e.target.value as string)
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
              <MenuItem value="all">All Players</MenuItem>
              {playerList.map((player) => (
                <MenuItem key={player} value={player}>
                  {player}
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
            {selectedSession === 'all' && selectedPlayer === 'all'
              ? 'No banlist suggestions found'
              : selectedSession !== 'all' && selectedPlayer === 'all'
              ? `No banlist suggestions found for Session ${selectedSession}`
              : selectedSession === 'all' && selectedPlayer !== 'all'
              ? `No banlist suggestions found for ${selectedPlayer}`
              : `No banlist suggestions found for ${selectedPlayer} in Session ${selectedSession}`}
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
