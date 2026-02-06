'use client';

import { useState, useEffect, useMemo } from 'react';
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
  SelectChangeEvent,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import {
  getCurrentPlayerId,
  getPlayerList,
  getPlayerStats,
  getAllPlayersAllStats,
  getCompletedSessions,
  type PlayerStatsResult,
  type PlayerAllStats
} from './actions';
import { COMPARATIVE_STATS } from './comparativeStatsConfig';
import PlacementConsistencyCard from './components/PlacementConsistencyCard';
import AverageROICard from './components/AverageROICard';
import ComebackPercentageCard from './components/ComebackPercentageCard';
import DeckDiversityCard from './components/DeckDiversityCard';
import DeckUniquenessCard from './components/DeckUniquenessCard';
import UniqueCardsCard from './components/UniqueCardsCard';
import CardsChangedCard from './components/CardsChangedCard';

export default function StatsPage() {
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [players, setPlayers] = useState<Array<{ id: number; name: string }>>([]);
  const [stats, setStats] = useState<PlayerStatsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Comparative view state
  const [viewMode, setViewMode] = useState<'personal' | 'comparative'>('personal');
  const [allPlayersData, setAllPlayersData] = useState<PlayerAllStats[] | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'performance' | 'economy' | 'banlist' | 'deckbuilding'>('performance');
  const [sortColumn, setSortColumn] = useState<string>('totalWins');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [comparativeLoading, setComparativeLoading] = useState(false);
  const [cardStartSession, setCardStartSession] = useState<number | undefined>(undefined);
  const [cardEndSession, setCardEndSession] = useState<number | undefined>(undefined);

  // Load current user and player list on mount
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const [currentPlayerResult, playerListResult, sessionsResult] = await Promise.all([
          getCurrentPlayerId(),
          getPlayerList(),
          getCompletedSessions()
        ]);

        if (!currentPlayerResult.success || !currentPlayerResult.playerId) {
          setError(currentPlayerResult.error || 'Not authenticated');
          return;
        }

        if (!playerListResult.success || !playerListResult.players) {
          setError(playerListResult.error || 'Failed to load players');
          return;
        }

        if (sessionsResult.success && sessionsResult.sessions) {
          // Set default range: first to last completed session
          if (sessionsResult.sessions.length > 0) {
            const firstSession = sessionsResult.sessions[0].id;
            const lastSession = sessionsResult.sessions[sessionsResult.sessions.length - 1].id;
            setCardStartSession(firstSession);
            setCardEndSession(lastSession);
          }
        }

        setPlayers(playerListResult.players);
        setSelectedPlayerId(currentPlayerResult.playerId);

        // Load stats for current user (with default session range if available)
        const firstSession = sessionsResult.sessions && sessionsResult.sessions.length > 0
          ? sessionsResult.sessions[0].id
          : undefined;
        const lastSession = sessionsResult.sessions && sessionsResult.sessions.length > 0
          ? sessionsResult.sessions[sessionsResult.sessions.length - 1].id
          : undefined;

        const statsResult = await getPlayerStats(
          currentPlayerResult.playerId,
          firstSession,
          lastSession
        );
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
      const statsResult = await getPlayerStats(
        playerId,
        cardStartSession ?? undefined,
        cardEndSession ?? undefined
      );
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

    if (newMode === 'comparative' && !allPlayersData) {
      await loadAllPlayersStats();
    }
  };

  // Load all players stats
  const loadAllPlayersStats = async () => {
    setComparativeLoading(true);
    setError(null);

    try {
      const result = await getAllPlayersAllStats(1); // Get all players with at least 1 session
      if (!result.success) {
        setError(result.error || 'Failed to load player stats');
        setAllPlayersData(null);
      } else {
        setAllPlayersData(result.players || null);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setComparativeLoading(false);
    }
  };

  // Handle column sort
  const handleColumnSort = (statKey: string) => {
    if (sortColumn === statKey) {
      // Toggle direction if clicking same column
      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      // New column - use default sort direction from COMPARATIVE_STATS
      const stat = COMPARATIVE_STATS.find(s => s.key === statKey);
      setSortColumn(statKey);
      setSortDirection(stat?.sortDirection || 'desc');
    }
  };



  // Handle category change
  const handleCategoryChange = async (event: SelectChangeEvent<string>) => {
    const newCategory = event.target.value as 'performance' | 'economy' | 'banlist' | 'deckbuilding';
    setSelectedCategory(newCategory);

    // Reset sort to first stat in the new category
    const firstStatInCategory = COMPARATIVE_STATS.find(s => s.category === newCategory);
    if (firstStatInCategory) {
      setSortColumn(firstStatInCategory.key);
      setSortDirection(firstStatInCategory.sortDirection);
    }
  };

  // Get stats for selected category
  const categoryStats = useMemo(() => {
    return COMPARATIVE_STATS.filter(s => s.category === selectedCategory);
  }, [selectedCategory]);

  // Sorted data for rankings table
  const sortedData = useMemo(() => {
    if (!allPlayersData) return [];

    const sorted = [...allPlayersData].sort((a, b) => {
      const aValue = a[sortColumn as keyof PlayerAllStats];
      const bValue = b[sortColumn as keyof PlayerAllStats];

      // Handle null values (push to end)
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return 1;
      if (bValue === null) return -1;

      const aNum = typeof aValue === 'number' ? aValue : 0;
      const bNum = typeof bValue === 'number' ? bValue : 0;

      return sortDirection === 'desc' ? bNum - aNum : aNum - bNum;
    });

    return sorted;
  }, [allPlayersData, sortColumn, sortDirection]);

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
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Stat Category</InputLabel>
              <Select
                value={selectedCategory}
                onChange={handleCategoryChange}
                label="Stat Category"
                disabled={comparativeLoading}
              >
                <MenuItem value="performance">Performance</MenuItem>
                <MenuItem value="economy">Economy</MenuItem>
                <MenuItem value="banlist">Banlist</MenuItem>
                <MenuItem value="deckbuilding">Deck Building</MenuItem>
              </Select>
            </FormControl>
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

              {/* New Performance Stats */}
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <PlacementConsistencyCard playerId={selectedPlayerId || undefined} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <ComebackPercentageCard playerId={selectedPlayerId || undefined} />
              </Grid>
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
              <StatCard label="Sessions Since Last VP" value={stats.participation?.sessionsSinceLastVP || 0} />

              {/* New Economy Stat */}
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <AverageROICard playerId={selectedPlayerId || undefined} />
              </Grid>
            </Grid>
          </Paper>

          {/* Banlist Stats */}
          {stats.banlistVoting && stats.participation && (
            <Paper sx={{ p: 3, mb: 3, backgroundColor: 'var(--bg-elevated)' }}>
              <Typography variant="h6" gutterBottom>
                Banlist Stats
              </Typography>
              <Grid container spacing={2}>
                <StatCard
                  label="Avg Votes per Suggestion"
                  value={stats.banlistVoting.averageVotesPerSuggestion !== null ? stats.banlistVoting.averageVotesPerSuggestion : 'N/A'}
                />
                <StatCard
                  label="Suggestions with 2+ Votes"
                  value={stats.banlistVoting.averageSuggestionsWithThreshold !== null ? `${stats.banlistVoting.averageSuggestionsWithThreshold}%` : 'N/A'}
                />
                <StatCard
                  label="Suggestions Chosen"
                  value={stats.banlistVoting.averageChosenPerSession !== null ? `${stats.banlistVoting.averageChosenPerSession}%` : 'N/A'}
                />
                <StatCard label="Times as Moderator" value={stats.participation.timesAsModerator || 0} />
                <StatCard label="Banlist Suggestions Chosen" value={stats.participation.banlistSuggestionsChosen || 0} />
                <StatCard label="Times Chose Own Suggestion" value={stats.banlistVoting.timesChoseOwnSuggestion || 0} />
              </Grid>
            </Paper>
          )}

          {/* Deck Building Analysis */}
          <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 2 }}>
            Deck Building Analysis
          </Typography>

          {/* Deck Diversity */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <DeckDiversityCard playerId={selectedPlayerId || undefined} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <DeckUniquenessCard playerId={selectedPlayerId || undefined} />
            </Grid>
            {stats.deckBuilding && (
              <>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <UniqueCardsCard averageUniqueCards={stats.deckBuilding.averageUniqueCards} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <CardsChangedCard averageCardsChanged={stats.deckBuilding.averageCardsChanged} />
                </Grid>
              </>
            )}
          </Grid>

          {/* Head-to-Head Records */}
          <Paper sx={{ p: 3, backgroundColor: 'var(--bg-elevated)', mb: 3 }}>
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

          {/* Most Played Cards */}
          <Paper sx={{ p: 3, backgroundColor: 'var(--bg-elevated)' }}>
            <Typography variant="h6" gutterBottom>
              Most Played Cards (Top 50)
            </Typography>
            {stats.mostPlayedCards && stats.mostPlayedCards.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'var(--bg-tertiary)' }}>
                      <TableCell><strong>Rank</strong></TableCell>
                      <TableCell><strong>Card Name</strong></TableCell>
                      <TableCell align="right"><strong>Times Played</strong></TableCell>
                      <TableCell align="right"><strong>In Decklists</strong></TableCell>
                      <TableCell align="right"><strong>Avg Copies</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.mostPlayedCards.slice(0, 50).map((card, index) => (
                      <TableRow key={card.cardId}>
                        <TableCell>{index + 1}</TableCell>
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
                No decklists submitted yet
              </Typography>
            )}
          </Paper>
        </>
      )}

      {/* Multi-Column Rankings View */}
      {viewMode === 'comparative' && sortedData.length > 0 && !comparativeLoading && (
        <Paper sx={{ p: 3, backgroundColor: 'var(--bg-elevated)' }}>
          <Typography variant="h6" gutterBottom>
            {selectedCategory === 'banlist' ? 'Banlist' : selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Rankings
          </Typography>
          <TableContainer sx={{ maxHeight: '70vh', overflowX: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      position: 'sticky',
                      left: 0,
                      backgroundColor: 'var(--bg-tertiary)',
                      zIndex: 3,
                      minWidth: 60
                    }}
                  >
                    <strong>Rank</strong>
                  </TableCell>
                  <TableCell
                    sx={{
                      position: 'sticky',
                      left: 60,
                      backgroundColor: 'var(--bg-tertiary)',
                      zIndex: 3,
                      minWidth: 120
                    }}
                  >
                    <strong>Player</strong>
                  </TableCell>
                  {/* Dynamic stat columns based on selected category */}
                  {categoryStats.map((stat) => (
                    <TableCell
                      key={stat.key}
                      align="right"
                      onClick={() => handleColumnSort(stat.key)}
                      sx={{
                        cursor: 'pointer',
                        backgroundColor: sortColumn === stat.key ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                        '&:hover': { backgroundColor: 'var(--bg-secondary)' },
                        minWidth: 100
                      }}
                    >
                      <Box component="span" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                        <strong>{stat.label}</strong>
                        {sortColumn === stat.key && (sortDirection === 'desc' ? ' ↓' : ' ↑')}
                      </Box>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedData.map((player, index) => (
                  <TableRow
                    key={player.playerId}
                    sx={{
                      backgroundColor: player.playerId === selectedPlayerId
                        ? 'var(--accent-primary)'
                        : undefined,
                      '& td': {
                        color: player.playerId === selectedPlayerId
                          ? 'var(--text-bright)'
                          : undefined
                      }
                    }}
                  >
                    <TableCell
                      sx={{
                        position: 'sticky',
                        left: 0,
                        backgroundColor: player.playerId === selectedPlayerId
                          ? 'var(--accent-primary)'
                          : 'var(--bg-elevated)',
                        zIndex: 2
                      }}
                    >
                      {index + 1}
                    </TableCell>
                    <TableCell
                      sx={{
                        position: 'sticky',
                        left: 60,
                        backgroundColor: player.playerId === selectedPlayerId
                          ? 'var(--accent-primary)'
                          : 'var(--bg-elevated)',
                        zIndex: 2
                      }}
                    >
                      {player.playerName}
                      {player.playerId === selectedPlayerId && ' (You)'}
                    </TableCell>
                    {/* Dynamic stat values based on selected category */}
                    {categoryStats.map((stat) => {
                      const value = player[stat.key as keyof PlayerAllStats];
                      return (
                        <TableCell key={stat.key} align="right">
                          {stat.formatter(value)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {viewMode === 'comparative' && !allPlayersData && !comparativeLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Typography color="var(--text-secondary)">
            Loading rankings...
          </Typography>
        </Box>
      )}

      {viewMode === 'comparative' && sortedData.length === 0 && allPlayersData && !comparativeLoading && (
        <Paper sx={{ p: 3, backgroundColor: 'var(--bg-elevated)' }}>
          <Typography color="var(--text-secondary)">
            No players meet the minimum session requirement
          </Typography>
        </Paper>
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
