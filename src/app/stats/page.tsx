'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  SelectChangeEvent,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import {
  getCurrentPlayerId,
  getPlayerList,
  getPlayerStats,
  getComparativeStats,
  getAllPlayersCardUsage,
  type PlayerStatsResult,
  type ComparativeStatsResult,
  type CardUsage
} from './actions';
import { COMPARATIVE_STATS } from './comparativeStatsConfig';

export default function StatsPage() {
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [players, setPlayers] = useState<Array<{ id: number; name: string }>>([]);
  const [stats, setStats] = useState<PlayerStatsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cardLimit, setCardLimit] = useState<number>(10);
  const [cardFilter, setCardFilter] = useState<string>('');

  // Comparative view state
  const [viewMode, setViewMode] = useState<'personal' | 'comparative'>('personal');
  const [comparativeStat, setComparativeStat] = useState<string>('totalWins');
  const [minSessions, setMinSessions] = useState<number>(1);
  const [comparativeData, setComparativeData] = useState<ComparativeStatsResult | null>(null);
  const [comparativeLoading, setComparativeLoading] = useState(false);
  const [allPlayersCards, setAllPlayersCards] = useState<CardUsage[] | null>(null);
  const [allPlayersCardLimit, setAllPlayersCardLimit] = useState<number>(50);

  // Load current user and player list on mount
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const [currentPlayerResult, playerListResult] = await Promise.all([
          getCurrentPlayerId(),
          getPlayerList()
        ]);

        if (!currentPlayerResult.success || !currentPlayerResult.playerId) {
          setError(currentPlayerResult.error || 'Not authenticated');
          return;
        }

        if (!playerListResult.success || !playerListResult.players) {
          setError(playerListResult.error || 'Failed to load players');
          return;
        }

        setPlayers(playerListResult.players);
        setSelectedPlayerId(currentPlayerResult.playerId);

        // Load stats for current user
        const statsResult = await getPlayerStats(currentPlayerResult.playerId);
        if (!statsResult.success) {
          setError(statsResult.error || 'Failed to load statistics');
          return;
        }

        setStats(statsResult);
      } catch (err) {
        setError('An unexpected error occurred');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // Handle player selection change
  const handlePlayerChange = async (event: SelectChangeEvent<number>) => {
    const playerId = Number(event.target.value);
    setSelectedPlayerId(playerId);
    setLoading(true);
    setError(null);

    try {
      const statsResult = await getPlayerStats(playerId);
      if (!statsResult.success) {
        setError(statsResult.error || 'Failed to load statistics');
        setStats(null);
      } else {
        setStats(statsResult);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle view mode change
  const handleViewModeChange = async (
    _event: React.MouseEvent<HTMLElement>,
    newMode: 'personal' | 'comparative' | null
  ) => {
    if (newMode === null) return;
    setViewMode(newMode);

    if (newMode === 'comparative' && !comparativeData) {
      await loadComparativeData();
    }
  };

  // Load comparative data
  const loadComparativeData = async () => {
    setComparativeLoading(true);
    setError(null);

    try {
      const result = await getComparativeStats(comparativeStat, minSessions);
      if (!result.success) {
        setError(result.error || 'Failed to load comparative stats');
        setComparativeData(null);
      } else {
        setComparativeData(result);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setComparativeLoading(false);
    }
  };

  // Handle comparative stat change
  const handleComparativeStatChange = async (event: SelectChangeEvent<string>) => {
    const newStat = event.target.value;
    setComparativeStat(newStat);

    // Handle mostPlayedCards specially
    if (newStat === 'mostPlayedCards') {
      if (!allPlayersCards) {
        await loadAllPlayersCards();
      }
      return;
    }

    setComparativeLoading(true);

    try {
      const result = await getComparativeStats(newStat, minSessions);
      if (result.success) {
        setComparativeData(result);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setComparativeLoading(false);
    }
  };

  // Handle min sessions filter change
  const handleMinSessionsChange = async (event: SelectChangeEvent<number>) => {
    setMinSessions(Number(event.target.value));
    setComparativeLoading(true);

    try {
      const result = await getComparativeStats(comparativeStat, Number(event.target.value));
      if (result.success) {
        setComparativeData(result);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setComparativeLoading(false);
    }
  };

  // Load all players card usage
  const loadAllPlayersCards = async () => {
    try {
      const result = await getAllPlayersCardUsage(allPlayersCardLimit);
      if (result.success && result.cards) {
        setAllPlayersCards(result.cards);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle all players card limit change
  const handleAllPlayersCardLimitChange = async (event: SelectChangeEvent<number>) => {
    const newLimit = Number(event.target.value);
    setAllPlayersCardLimit(newLimit);

    try {
      const result = await getAllPlayersCardUsage(newLimit);
      if (result.success && result.cards) {
        setAllPlayersCards(result.cards);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter and limit cards
  const filteredCards = stats?.mostPlayedCards
    ?.filter(card =>
      cardFilter === '' ||
      card.cardName.toLowerCase().includes(cardFilter.toLowerCase())
    )
    .slice(0, cardLimit) || [];

  if (loading && !stats) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !stats) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Statistics
      </Typography>
      <Typography variant="body1" color="var(--text-secondary)" sx={{ mb: 3 }}>
        View comprehensive player statistics
      </Typography>

      {/* Player Selector - Only show in personal mode */}
      {viewMode === 'personal' && (
        <FormControl fullWidth sx={{ mb: 3, maxWidth: 400 }}>
          <InputLabel>Player</InputLabel>
          <Select
            value={selectedPlayerId || ''}
            onChange={handlePlayerChange}
            label="Player"
            disabled={loading}
          >
            {players.map(player => (
              <MenuItem key={player.id} value={player.id}>
                {player.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* View Mode Toggle */}
      <Box sx={{ mb: 3 }}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewModeChange}
          aria-label="view mode"
          sx={{ mb: 2 }}
        >
          <ToggleButton value="personal" aria-label="personal stats">
            Personal Stats
          </ToggleButton>
          <ToggleButton value="comparative" aria-label="comparative rankings">
            Rankings
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Comparative View Filters */}
        {viewMode === 'comparative' && (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: 250 }}>
              <InputLabel>Stat to Compare</InputLabel>
              <Select
                value={comparativeStat}
                onChange={handleComparativeStatChange}
                label="Stat to Compare"
                disabled={comparativeLoading}
              >
                <MenuItem disabled sx={{ fontWeight: 'bold' }}>Cards</MenuItem>
                {COMPARATIVE_STATS.filter(s => s.category === 'cards').map(stat => (
                  <MenuItem key={stat.key} value={stat.key} sx={{ pl: 3 }}>
                    {stat.label}
                  </MenuItem>
                ))}
                <MenuItem disabled sx={{ fontWeight: 'bold', mt: 1 }}>Performance</MenuItem>
                {COMPARATIVE_STATS.filter(s => s.category === 'performance').map(stat => (
                  <MenuItem key={stat.key} value={stat.key} sx={{ pl: 3 }}>
                    {stat.label}
                  </MenuItem>
                ))}
                <MenuItem disabled sx={{ fontWeight: 'bold', mt: 1 }}>Economy</MenuItem>
                {COMPARATIVE_STATS.filter(s => s.category === 'economy').map(stat => (
                  <MenuItem key={stat.key} value={stat.key} sx={{ pl: 3 }}>
                    {stat.label}
                  </MenuItem>
                ))}
                <MenuItem disabled sx={{ fontWeight: 'bold', mt: 1 }}>Participation</MenuItem>
                {COMPARATIVE_STATS.filter(s => s.category === 'participation').map(stat => (
                  <MenuItem key={stat.key} value={stat.key} sx={{ pl: 3 }}>
                    {stat.label}
                  </MenuItem>
                ))}
                <MenuItem disabled sx={{ fontWeight: 'bold', mt: 1 }}>Banlist Voting</MenuItem>
                {COMPARATIVE_STATS.filter(s => s.category === 'banlistVoting').map(stat => (
                  <MenuItem key={stat.key} value={stat.key} sx={{ pl: 3 }}>
                    {stat.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Only show min sessions filter for player stats, not for cards */}
            {comparativeStat !== 'mostPlayedCards' && (
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>Min Sessions</InputLabel>
                <Select
                  value={minSessions}
                  onChange={handleMinSessionsChange}
                  label="Min Sessions"
                  disabled={comparativeLoading}
                >
                  <MenuItem value={1}>1+</MenuItem>
                  <MenuItem value={3}>3+</MenuItem>
                  <MenuItem value={5}>5+</MenuItem>
                  <MenuItem value={10}>10+</MenuItem>
                </Select>
              </FormControl>
            )}

            {/* Show card limit filter for mostPlayedCards */}
            {comparativeStat === 'mostPlayedCards' && (
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>Limit</InputLabel>
                <Select
                  value={allPlayersCardLimit}
                  onChange={handleAllPlayersCardLimitChange}
                  label="Limit"
                  size="small"
                >
                  <MenuItem value={25}>25</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                  <MenuItem value={100}>100</MenuItem>
                  <MenuItem value={200}>200</MenuItem>
                </Select>
              </FormControl>
            )}
          </Box>
        )}
      </Box>

      {loading && stats && viewMode === 'personal' && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {comparativeLoading && viewMode === 'comparative' && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Personal Stats View */}
      {viewMode === 'personal' && stats && (
        <>
          {/* Performance Stats */}
          <Paper sx={{ p: 3, mb: 3, backgroundColor: 'var(--bg-elevated)' }}>
            <Typography variant="h6" gutterBottom>
              Performance Stats
            </Typography>
            <Grid container spacing={2}>
              <StatCard label="Total Wins (1st)" value={stats.performance?.totalWins || 0} />
              <StatCard label="Runner Ups (2nd)" value={stats.performance?.runnerUps || 0} />
              <StatCard label="Third Place" value={stats.performance?.thirdPlace || 0} />
              <StatCard label="Total Losses (6th)" value={stats.performance?.totalLosses || 0} />
              <StatCard
                label="Average Placement"
                value={stats.performance?.averagePlacement !== null && stats.performance?.averagePlacement !== undefined ? stats.performance.averagePlacement : 'N/A'}
              />
              <StatCard
                label="Match Record"
                value={`${stats.performance?.matchWins || 0}-${stats.performance?.matchLosses || 0}-${stats.performance?.matchDraws || 0}`}
              />
              <StatCard
                label="Game Record"
                value={`${stats.performance?.gameWins || 0}-${stats.performance?.gameLosses || 0}`}
              />
              <StatCard label="2-0s Given" value={stats.performance?.twoOhsGiven || 0} />
              <StatCard label="2-0s Received" value={stats.performance?.twoOhsReceived || 0} />
              <StatCard label="Longest Win Streak" value={stats.performance?.longestWinStreak || 0} />
              <StatCard label="Longest Loss Streak" value={stats.performance?.longestLossStreak || 0} />
            </Grid>
          </Paper>

          {/* Economy Stats */}
          <Paper sx={{ p: 3, mb: 3, backgroundColor: 'var(--bg-elevated)' }}>
            <Typography variant="h6" gutterBottom>
              Economy Stats
            </Typography>
            <Grid container spacing={2}>
              <StatCard label="Total Points Earned" value={stats.economy?.totalPointsEarned || 0} />
              <StatCard label="Total Points Spent" value={stats.economy?.totalPointsSpent || 0} />
              <StatCard label="Current Balance" value={stats.economy?.currentBalance || 0} />
              <StatCard label="Avg Points/Session" value={stats.economy?.averagePointsPerSession || 0} />
              <StatCard label="Avg Spent/Session" value={stats.economy?.averageSpentPerSession || 0} />
              <StatCard label="Times VP Taken" value={stats.economy?.timesVPTaken || 0} />
              <StatCard label="Times VP Passed" value={stats.economy?.timesVPPassed || 0} />
            </Grid>
          </Paper>

          {/* Participation Stats */}
          <Paper sx={{ p: 3, mb: 3, backgroundColor: 'var(--bg-elevated)' }}>
            <Typography variant="h6" gutterBottom>
              Participation Stats
            </Typography>
            <Grid container spacing={2}>
              <StatCard label="Total Sessions" value={stats.participation?.totalSessions || 0} />
              <StatCard label="Sessions Since Last VP" value={stats.participation?.sessionsSinceLastVP || 0} />
              <StatCard label="Times as Moderator" value={stats.participation?.timesAsModerator || 0} />
              <StatCard label="Banlist Suggestions Chosen" value={stats.participation?.banlistSuggestionsChosen || 0} />
            </Grid>
          </Paper>

          {/* Banlist Voting Stats */}
          {stats.banlistVoting && (
            <Paper sx={{ p: 3, mb: 3, backgroundColor: 'var(--bg-elevated)' }}>
              <Typography variant="h6" gutterBottom>
                Banlist Voting Stats
              </Typography>
              <Grid container spacing={2}>
                <StatCard
                  label="Avg Votes per Suggestion"
                  value={stats.banlistVoting.averageVotesPerSuggestion !== null ? stats.banlistVoting.averageVotesPerSuggestion : 'N/A'}
                />
                <StatCard
                  label="Avg Suggestions with 2+ Votes"
                  value={stats.banlistVoting.averageSuggestionsWithThreshold !== null ? stats.banlistVoting.averageSuggestionsWithThreshold : 'N/A'}
                />
                <StatCard
                  label="Avg Chosen per Session"
                  value={stats.banlistVoting.averageChosenPerSession !== null ? stats.banlistVoting.averageChosenPerSession : 'N/A'}
                />
              </Grid>
            </Paper>
          )}

          {/* Most Played Cards */}
          <Paper sx={{ p: 3, mb: 3, backgroundColor: 'var(--bg-elevated)' }}>
            <Typography variant="h6" gutterBottom>
              Most Played Cards
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Limit</InputLabel>
                <Select
                  value={cardLimit}
                  onChange={(e) => setCardLimit(Number(e.target.value))}
                  label="Limit"
                  size="small"
                >
                  <MenuItem value={5}>5</MenuItem>
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={15}>15</MenuItem>
                  <MenuItem value={20}>20</MenuItem>
                  <MenuItem value={25}>25</MenuItem>
                  <MenuItem value={30}>30</MenuItem>
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
                      <TableCell align="right"><strong>Avg Copies</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredCards.map(card => (
                      <TableRow key={card.cardId}>
                        <TableCell>{card.cardName}</TableCell>
                        <TableCell align="right">{card.timesPlayed}</TableCell>
                        <TableCell align="right">{card.averageCopies}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="var(--text-secondary)">
                {stats.mostPlayedCards?.length === 0
                  ? 'No decklists submitted yet'
                  : 'No cards match the filter'}
              </Typography>
            )}
          </Paper>

          {/* Head-to-Head Records */}
          <Paper sx={{ p: 3, backgroundColor: 'var(--bg-elevated)' }}>
            <Typography variant="h6" gutterBottom>
              Head-to-Head Records
            </Typography>
            {stats.headToHead && stats.headToHead.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'var(--bg-tertiary)' }}>
                      <TableCell><strong>Opponent</strong></TableCell>
                      <TableCell align="right"><strong>Match W-L-D</strong></TableCell>
                      <TableCell align="right"><strong>Game W-L</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.headToHead.map(record => (
                      <TableRow key={record.opponentId}>
                        <TableCell>{record.opponentName}</TableCell>
                        <TableCell align="right">
                          {record.matchWins}-{record.matchLosses}-{record.matchDraws}
                        </TableCell>
                        <TableCell align="right">
                          {record.gameWins}-{record.gameLosses}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="var(--text-secondary)">
                No match history yet
              </Typography>
            )}
          </Paper>
        </>
      )}

      {/* Most Played Cards - All Players */}
      {viewMode === 'comparative' && comparativeStat === 'mostPlayedCards' && allPlayersCards && (
        <Paper sx={{ p: 3, backgroundColor: 'var(--bg-elevated)' }}>
          <Typography variant="h6" gutterBottom>
            Most Played Cards (All Players)
          </Typography>
          {allPlayersCards.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <TableCell><strong>Rank</strong></TableCell>
                    <TableCell><strong>Card Name</strong></TableCell>
                    <TableCell align="right"><strong>Decklists</strong></TableCell>
                    <TableCell align="right"><strong>Avg Copies</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allPlayersCards.map((card, index) => (
                    <TableRow key={card.cardId}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{card.cardName}</TableCell>
                      <TableCell align="right">{card.timesPlayed}</TableCell>
                      <TableCell align="right">{card.averageCopies}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography color="var(--text-secondary)">
              No decklists submitted yet
            </Typography>
          )}
        </Paper>
      )}

      {/* Comparative Rankings View */}
      {viewMode === 'comparative' && comparativeStat !== 'mostPlayedCards' && comparativeData && !comparativeLoading && (
        <Paper sx={{ p: 3, backgroundColor: 'var(--bg-elevated)' }}>
          <Typography variant="h6" gutterBottom>
            {comparativeData.statLabel} Rankings
          </Typography>
          {comparativeData.rankings && comparativeData.rankings.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <TableCell><strong>Rank</strong></TableCell>
                    <TableCell><strong>Player</strong></TableCell>
                    <TableCell align="right"><strong>{comparativeData.statLabel}</strong></TableCell>
                    <TableCell align="right"><strong>Sessions Played</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {comparativeData.rankings.map((ranking, index) => (
                    <TableRow
                      key={ranking.playerId}
                      sx={{
                        backgroundColor: ranking.playerId === selectedPlayerId
                          ? 'var(--accent-primary)'
                          : undefined,
                        '& td': {
                          color: ranking.playerId === selectedPlayerId
                            ? 'var(--text-bright)'
                            : undefined
                        }
                      }}
                    >
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        {ranking.playerName}
                        {ranking.playerId === selectedPlayerId && ' (You)'}
                      </TableCell>
                      <TableCell align="right">{ranking.formattedValue}</TableCell>
                      <TableCell align="right">{ranking.sessionsPlayed}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography color="var(--text-secondary)">
              No data available for the selected filters
            </Typography>
          )}
        </Paper>
      )}

      {viewMode === 'comparative' && !comparativeData && !comparativeLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Typography color="var(--text-secondary)">
            Loading rankings...
          </Typography>
        </Box>
      )}
    </Box>
  );
}

// Stat card component for grid layout
function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Grid size={{ xs: 6, sm: 4, md: 3 }}>
      <Paper
        sx={{
          p: 2,
          backgroundColor: 'var(--bg-secondary)',
          textAlign: 'center'
        }}
      >
        <Typography variant="h5" color="var(--accent-primary)">
          {value}
        </Typography>
        <Typography variant="body2" color="var(--text-secondary)">
          {label}
        </Typography>
      </Paper>
    </Grid>
  );
}
