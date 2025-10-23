import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { PlayerStanding } from '../actions';

interface StandingsViewProps {
  standings: PlayerStanding[];
  isAdmin: boolean;
  canFinalize: boolean;
  isFinalized: boolean;
  confirmDialogOpen: boolean;
  finalizing: boolean;
  onFinalizeClick: () => void;
  onConfirmFinalize: () => Promise<void>;
  onCancelFinalize: () => void;
}

export function StandingsView({
  standings,
  isAdmin,
  canFinalize,
  isFinalized,
  confirmDialogOpen,
  finalizing,
  onFinalizeClick,
  onConfirmFinalize,
  onCancelFinalize,
}: StandingsViewProps) {
  return (
    <>
      {isFinalized && (
        <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 3 }}>
          Standings have been finalized. Placements are locked and decklists are
          now public.
        </Alert>
      )}

      {isAdmin && !isFinalized && canFinalize && (
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            size="large"
            onClick={onFinalizeClick}
            sx={{
              backgroundColor: 'var(--success)',
              '&:hover': {
                backgroundColor: 'var(--success)',
                filter: 'brightness(1.1)',
              },
            }}
          >
            Finalize Standings
          </Button>
        </Box>
      )}

      {isAdmin && !isFinalized && !canFinalize && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Complete all matches before finalizing standings.
        </Alert>
      )}

      <Paper
        sx={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
        }}
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }}>
                  Rank
                </TableCell>
                <TableCell sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }}>
                  Player
                </TableCell>
                <TableCell
                  align="center"
                  sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }}
                >
                  Match Wins
                </TableCell>
                <TableCell
                  align="center"
                  sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }}
                >
                  Match Losses
                </TableCell>
                <TableCell
                  align="center"
                  sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }}
                >
                  Game Wins
                </TableCell>
                <TableCell
                  align="center"
                  sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }}
                >
                  Game Losses
                </TableCell>
                <TableCell
                  align="center"
                  sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }}
                >
                  OMW%
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {standings.map((standing, index) => (
                <TableRow key={standing.playerId}>
                  <TableCell sx={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>
                    {index + 1}
                  </TableCell>
                  <TableCell sx={{ color: 'var(--text-primary)' }}>
                    {standing.playerName}
                  </TableCell>
                  <TableCell align="center" sx={{ color: 'var(--text-primary)' }}>
                    {standing.matchWins}
                  </TableCell>
                  <TableCell align="center" sx={{ color: 'var(--text-primary)' }}>
                    {standing.matchLosses}
                  </TableCell>
                  <TableCell align="center" sx={{ color: 'var(--text-primary)' }}>
                    {standing.gameWins}
                  </TableCell>
                  <TableCell align="center" sx={{ color: 'var(--text-primary)' }}>
                    {standing.gameLosses}
                  </TableCell>
                  <TableCell align="center" sx={{ color: 'var(--text-primary)' }}>
                    {standing.omw ? `${(standing.omw * 100).toFixed(1)}%` : 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog
        open={confirmDialogOpen}
        onClose={onCancelFinalize}
        PaperProps={{
          sx: {
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
          },
        }}
      >
        <DialogTitle sx={{ color: 'var(--text-bright)' }}>
          Confirm Finalize Standings
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will lock the placements for the top 6 players and make all
            decklists public. This action cannot be undone.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={onCancelFinalize}
            disabled={finalizing}
            sx={{ color: 'var(--text-secondary)' }}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirmFinalize}
            variant="contained"
            disabled={finalizing}
            startIcon={finalizing ? <CircularProgress size={20} /> : undefined}
            sx={{
              backgroundColor: 'var(--success)',
              '&:hover': {
                backgroundColor: 'var(--success)',
                filter: 'brightness(1.1)',
              },
            }}
          >
            {finalizing ? 'Finalizing...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
