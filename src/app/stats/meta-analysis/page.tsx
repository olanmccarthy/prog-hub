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
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress
} from '@mui/material';
import {
  getCurrentPlayerId,
  getAllPlayersCardUsage,
  getCompletedSessions,
  type CardUsage
} from '../actions';
import CardSynergiesTable from '../components/CardSynergiesTable';
import CardSuccessTable from '../components/CardSuccessTable';
import VotingBlocTable from '../components/VotingBlocTable';
import MatchupMatrixTable from '../components/MatchupMatrixTable';
import SessionDiversityGraph from '../components/SessionDiversityGraph';

export default function MetaAnalysisPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostPlayedCards, setMostPlayedCards] = useState<CardUsage[]>([]);
  const [completedSessions, setCompletedSessions] = useState<Array<{ id: number; number: number; setCode: string }>>([]);
  const [cardStartSession, setCardStartSession] = useState<number | null>(null);
  const [cardEndSession, setCardEndSession] = useState<number | null>(null);
  const [cardLimit, setCardLimit] = useState<number>(50);
  const [cardFilter, setCardFilter] = useState<string>('');

  // Load initial data
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const [currentPlayerResult, sessionsResult] = await Promise.all([
          getCurrentPlayerId(),
          getCompletedSessions()
        ]);

        if (!currentPlayerResult.success || !currentPlayerResult.playerId) {
          setError(currentPlayerResult.error || 'Not authenticated');
          return;
        }

        if (sessionsResult.success && sessionsResult.sessions) {
          setCompletedSessions(sessionsResult.sessions);
          // Set default range: first to last completed session
          if (sessionsResult.sessions.length > 0) {
            const firstSession = sessionsResult.sessions[0].id;
            const lastSession = sessionsResult.sessions[sessionsResult.sessions.length - 1].id;
            setCardStartSession(firstSession);
            setCardEndSession(lastSession);
          }
        }
      } catch (err) {
        console.error('Error initializing:', err);
        setError('Failed to initialize');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // Load most played cards when session range changes
  useEffect(() => {
    const loadCards = async () => {
      if (cardStartSession === null || cardEndSession === null) return;

      try {
        const result = await getAllPlayersCardUsage(
          cardLimit,
          cardStartSession,
          cardEndSession
        );

        if (result.success && result.cards) {
          setMostPlayedCards(result.cards);
        }
      } catch (err) {
        console.error('Error loading cards:', err);
      }
    };

    loadCards();
  }, [cardStartSession, cardEndSession, cardLimit]);

  // Filter cards based on search
  const filteredCards = mostPlayedCards
    .filter(card =>
      cardFilter === '' ||
      card.cardName.toLowerCase().includes(cardFilter.toLowerCase())
    )
    .slice(0, cardLimit);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Meta Analysis
      </Typography>
      <Typography variant="body1" color="var(--text-secondary)" sx={{ mb: 4 }}>
        Analyze card usage, synergies, and success rates across all players and sessions
      </Typography>

      {/* Session Diversity Graph */}
      <Box sx={{ mb: 4 }}>
        <SessionDiversityGraph />
      </Box>

      {/* Most Played Cards */}
      <Paper sx={{ p: 3, mb: 4, backgroundColor: 'var(--bg-elevated)' }}>
        <Typography variant="h6" gutterBottom>
          Most Played Cards
        </Typography>
        <Typography variant="body2" color="var(--text-secondary)" sx={{ mb: 2 }}>
          Card usage statistics across all players and sessions
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Start Session</InputLabel>
            <Select
              value={cardStartSession ?? ''}
              onChange={(e) => setCardStartSession(Number(e.target.value))}
              label="Start Session"
              size="small"
            >
              {completedSessions.map(session => (
                <MenuItem key={session.id} value={session.id}>
                  #{session.number} {session.setCode}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>End Session</InputLabel>
            <Select
              value={cardEndSession ?? ''}
              onChange={(e) => setCardEndSession(Number(e.target.value))}
              label="End Session"
              size="small"
            >
              {completedSessions.map(session => (
                <MenuItem key={session.id} value={session.id}>
                  #{session.number} {session.setCode}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Limit</InputLabel>
            <Select
              value={cardLimit}
              onChange={(e) => setCardLimit(Number(e.target.value))}
              label="Limit"
              size="small"
            >
              <MenuItem value={25}>25</MenuItem>
              <MenuItem value={50}>50</MenuItem>
              <MenuItem value={75}>75</MenuItem>
              <MenuItem value={100}>100</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Filter by card name"
            value={cardFilter}
            onChange={(e) => setCardFilter(e.target.value)}
            size="small"
            sx={{ flexGrow: 1, maxWidth: 400 }}
          />
        </Box>
        {filteredCards.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <TableCell><strong>Card Name</strong></TableCell>
                  <TableCell align="right"><strong>Times Played</strong></TableCell>
                  <TableCell align="right"><strong>Decklists %</strong></TableCell>
                  <TableCell align="right"><strong>Avg Copies</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCards.map(card => (
                  <TableRow key={card.cardId}>
                    <TableCell>{card.cardName}</TableCell>
                    <TableCell align="right">{card.timesPlayed}</TableCell>
                    <TableCell align="right">{card.decklistPercentage}%</TableCell>
                    <TableCell align="right">{card.averageCopies}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography color="var(--text-secondary)">
            {mostPlayedCards.length === 0
              ? 'No decklists submitted yet'
              : 'No cards match the filter'}
          </Typography>
        )}
      </Paper>

      {/* Card Synergies */}
      <Box sx={{ mb: 4 }}>
        <CardSynergiesTable minAppearances={2} limit={20} />
      </Box>

      {/* Card Success by Placement */}
      <Box sx={{ mb: 4 }}>
        <CardSuccessTable minDecks={2} limit={50} />
      </Box>

      {/* Voting Blocs */}
      <Box sx={{ mb: 4 }}>
        <VotingBlocTable />
      </Box>

      {/* Matchup Matrix */}
      <Box sx={{ mb: 4 }}>
        <MatchupMatrixTable />
      </Box>
    </Box>
  );
}
