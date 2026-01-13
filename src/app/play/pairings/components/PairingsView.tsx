import {
  Box,
  Typography,
  Paper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import type { PairingData } from '../actions';

type GroupBy = 'round' | 'player';

interface PairingsViewProps {
  pairings: PairingData[];
  groupBy: GroupBy;
  onGroupByChange: (value: GroupBy) => void;
  onUpdateWins: (pairingId: number, player: 'player1' | 'player2', wins: number) => void;
}

export function PairingsView({
  pairings,
  groupBy,
  onGroupByChange,
  onUpdateWins,
}: PairingsViewProps) {
  const grouped =
    groupBy === 'round'
      ? pairings.reduce(
          (acc, pairing) => {
            if (!acc[pairing.round]) acc[pairing.round] = [];
            acc[pairing.round].push(pairing);
            return acc;
          },
          {} as Record<number, PairingData[]>
        )
      : pairings.reduce(
          (acc, pairing) => {
            if (!acc[pairing.player1.name]) acc[pairing.player1.name] = [];
            if (!acc[pairing.player2.name]) acc[pairing.player2.name] = [];
            acc[pairing.player1.name].push(pairing);
            acc[pairing.player2.name].push(pairing);
            return acc;
          },
          {} as Record<string, PairingData[]>
        );

  return (
    <>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
        <ToggleButtonGroup
          value={groupBy}
          exclusive
          onChange={(_, value) => value && onGroupByChange(value)}
          sx={{
            '& .MuiToggleButton-root': {
              color: 'var(--text-secondary)',
              borderColor: 'var(--border-color)',
              '&.Mui-selected': {
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--text-bright)',
                '&:hover': {
                  backgroundColor: 'var(--accent-blue-hover)',
                },
              },
            },
          }}
        >
          <ToggleButton value="round">By Round</ToggleButton>
          <ToggleButton value="player">By Player</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {Object.entries(grouped)
        .sort(([a], [b]) => {
          if (groupBy === 'round') {
            return Number(a) - Number(b);
          }
          return a.localeCompare(b);
        })
        .map(([key, items]) => (
          <Paper
            key={key}
            sx={{
              mb: 3,
              p: 3,
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <Typography
              variant="h6"
              sx={{ mb: 2, color: 'var(--text-bright)' }}
            >
              {groupBy === 'round' ? `Round ${key}` : key}
            </Typography>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    {groupBy === 'player' && (
                      <TableCell sx={{ color: 'var(--text-bright)' }}>
                        Round
                      </TableCell>
                    )}
                    <TableCell sx={{ color: 'var(--text-bright)' }}>
                      {groupBy === 'round' ? 'Player 1' : 'Player'}
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ color: 'var(--text-bright)' }}
                    >
                      Wins
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ color: 'var(--text-bright)' }}
                    >
                      Wins
                    </TableCell>
                    <TableCell sx={{ color: 'var(--text-bright)' }}>
                      {groupBy === 'round' ? 'Player 2' : 'Opponent'}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((pairing) => {
                    // When grouping by player, determine if current player is player1 or player2
                    const isCurrentPlayerPlayer1 = groupBy === 'player' && pairing.player1.name === key;
                    const currentPlayerWins = isCurrentPlayerPlayer1 ? pairing.player1wins : pairing.player2wins;
                    const opponentWins = isCurrentPlayerPlayer1 ? pairing.player2wins : pairing.player1wins;
                    const currentPlayerRole = isCurrentPlayerPlayer1 ? 'player1' : 'player2';
                    const opponentRole = isCurrentPlayerPlayer1 ? 'player2' : 'player1';

                    return (
                      <TableRow key={pairing.id}>
                        {groupBy === 'player' && (
                          <TableCell sx={{ color: 'var(--text-primary)' }}>
                            Round {pairing.round}
                          </TableCell>
                        )}
                        {groupBy === 'round' && (
                          <TableCell sx={{ color: 'var(--text-primary)' }}>
                            {pairing.player1.name}
                          </TableCell>
                        )}
                        {groupBy === 'player' && (
                          <TableCell sx={{ color: 'var(--text-primary)' }}>
                            {key}
                          </TableCell>
                        )}
                        <TableCell align="center">
                          <TextField
                            type="number"
                            value={groupBy === 'player' ? currentPlayerWins : pairing.player1wins}
                            onChange={(e) =>
                              onUpdateWins(
                                pairing.id,
                                groupBy === 'player' ? currentPlayerRole : 'player1',
                                parseInt(e.target.value) || 0
                              )
                            }
                            inputProps={{ min: 0, max: 2 }}
                            size="small"
                            sx={{
                              width: '60px',
                              '& input': {
                                textAlign: 'center',
                                color: 'var(--text-primary)',
                              },
                              '& .MuiOutlinedInput-root': {
                                backgroundColor: 'var(--input-bg)',
                                '& fieldset': {
                                  borderColor: 'var(--input-border)',
                                },
                              },
                            }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <TextField
                            type="number"
                            value={groupBy === 'player' ? opponentWins : pairing.player2wins}
                            onChange={(e) =>
                              onUpdateWins(
                                pairing.id,
                                groupBy === 'player' ? opponentRole : 'player2',
                                parseInt(e.target.value) || 0
                              )
                            }
                            inputProps={{ min: 0, max: 2 }}
                            size="small"
                            sx={{
                              width: '60px',
                              '& input': {
                                textAlign: 'center',
                                color: 'var(--text-primary)',
                              },
                              '& .MuiOutlinedInput-root': {
                                backgroundColor: 'var(--input-bg)',
                                '& fieldset': {
                                  borderColor: 'var(--input-border)',
                                },
                              },
                            }}
                          />
                        </TableCell>
                        {groupBy === 'round' && (
                          <TableCell sx={{ color: 'var(--text-primary)' }}>
                            {pairing.player2.name}
                          </TableCell>
                        )}
                        {groupBy === 'player' && (
                          <TableCell sx={{ color: 'var(--text-primary)' }}>
                            {pairing.player1.name === key
                              ? pairing.player2.name
                              : pairing.player1.name}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        ))}
    </>
  );
}
