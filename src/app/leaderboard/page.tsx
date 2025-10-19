'use client';

import { useEffect, useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Alert,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import {
  getVictoryPointsLeaderboard,
  getWalletLeaderboard,
  type VictoryPointsLeaderboard,
  type WalletLeaderboard,
} from './actions';

type LeaderboardView = 'victory-points' | 'wallets';

export default function LeaderboardPage() {
  const [view, setView] = useState<LeaderboardView>('victory-points');
  const [vpLeaderboard, setVpLeaderboard] = useState<VictoryPointsLeaderboard[]>([]);
  const [walletLeaderboard, setWalletLeaderboard] = useState<WalletLeaderboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  const fetchLeaderboards = async () => {
    try {
      setLoading(true);
      setError(null);

      const [vpResult, walletResult] = await Promise.all([
        getVictoryPointsLeaderboard(),
        getWalletLeaderboard(),
      ]);

      if (vpResult.success && vpResult.leaderboard) {
        setVpLeaderboard(vpResult.leaderboard);
      } else {
        setError(vpResult.error || 'Failed to load victory points');
      }

      if (walletResult.success && walletResult.leaderboard) {
        setWalletLeaderboard(walletResult.leaderboard);
      } else if (!error) {
        setError(walletResult.error || 'Failed to load wallets');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleViewChange = (_event: React.MouseEvent<HTMLElement>, newValue: LeaderboardView | null) => {
    if (newValue !== null) {
      setView(newValue);
    }
  };

  const getRankMedal = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `${rank}.`;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            color: 'var(--text-bright)',
            fontWeight: 'bold',
            mb: 1,
          }}
        >
          Leaderboard
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: 'var(--text-secondary)' }}
        >
          View rankings by Victory Points or Wallet balance
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <ToggleButtonGroup
          value={view}
          exclusive
          onChange={handleViewChange}
          aria-label="leaderboard view"
          sx={{
            '& .MuiToggleButton-root': {
              color: 'rgba(255, 255, 255, 0.7)',
              borderColor: 'rgba(255, 255, 255, 0.23)',
              '&.Mui-selected': {
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                borderColor: 'primary.main',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                },
              },
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
              },
            },
          }}
        >
          <ToggleButton value="victory-points" aria-label="victory points">
            <EmojiEventsIcon sx={{ mr: 1 }} />
            Victory Points
          </ToggleButton>
          <ToggleButton value="wallets" aria-label="wallets">
            <AccountBalanceWalletIcon sx={{ mr: 1 }} />
            Wallets
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Paper
        sx={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
        }}
      >

        {view === 'victory-points' && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      color: 'var(--text-bright)',
                      fontWeight: 'bold',
                      backgroundColor: 'var(--bg-tertiary)',
                      width: '80px',
                    }}
                  >
                    Rank
                  </TableCell>
                  <TableCell
                    sx={{
                      color: 'var(--text-bright)',
                      fontWeight: 'bold',
                      backgroundColor: 'var(--bg-tertiary)',
                    }}
                  >
                    Player
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color: 'var(--text-bright)',
                      fontWeight: 'bold',
                      backgroundColor: 'var(--bg-tertiary)',
                      width: '120px',
                    }}
                  >
                    Victory Points
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {vpLeaderboard.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      align="center"
                      sx={{ color: 'var(--text-bright)', py: 4 }}
                    >
                      No victory points recorded yet
                    </TableCell>
                  </TableRow>
                ) : (
                  vpLeaderboard.map((entry) => (
                    <TableRow
                      key={entry.playerId}
                      sx={{
                        '&:hover': {
                          backgroundColor: 'var(--bg-tertiary)',
                        },
                      }}
                    >
                      <TableCell
                        sx={{
                          color: 'var(--text-bright)',
                          fontSize: entry.rank <= 3 ? '1.2rem' : '1rem',
                        }}
                      >
                        {getRankMedal(entry.rank)}
                      </TableCell>
                      <TableCell sx={{ color: 'var(--text-bright)' }}>
                        {entry.playerName}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          color: 'var(--text-bright)',
                          fontWeight: 'bold',
                        }}
                      >
                        {entry.totalVictoryPoints}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {view === 'wallets' && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      color: 'var(--text-bright)',
                      fontWeight: 'bold',
                      backgroundColor: 'var(--bg-tertiary)',
                      width: '80px',
                    }}
                  >
                    Rank
                  </TableCell>
                  <TableCell
                    sx={{
                      color: 'var(--text-bright)',
                      fontWeight: 'bold',
                      backgroundColor: 'var(--bg-tertiary)',
                    }}
                  >
                    Player
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color: 'var(--text-bright)',
                      fontWeight: 'bold',
                      backgroundColor: 'var(--bg-tertiary)',
                      width: '120px',
                    }}
                  >
                    Balance
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {walletLeaderboard.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      align="center"
                      sx={{ color: 'var(--text-bright)', py: 4 }}
                    >
                      No wallets found
                    </TableCell>
                  </TableRow>
                ) : (
                  walletLeaderboard.map((entry) => (
                    <TableRow
                      key={entry.playerId}
                      sx={{
                        '&:hover': {
                          backgroundColor: 'var(--bg-tertiary)',
                        },
                      }}
                    >
                      <TableCell
                        sx={{
                          color: 'var(--text-bright)',
                          fontSize: entry.rank <= 3 ? '1.2rem' : '1rem',
                        }}
                      >
                        {getRankMedal(entry.rank)}
                      </TableCell>
                      <TableCell sx={{ color: 'var(--text-bright)' }}>
                        {entry.playerName}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          color: 'var(--text-bright)',
                          fontWeight: 'bold',
                        }}
                      >
                        {entry.amount}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Container>
  );
}
