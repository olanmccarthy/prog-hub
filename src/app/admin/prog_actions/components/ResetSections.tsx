import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Paper,
  Divider,
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

interface ResetSectionsSectionProps {
  hasActiveSession: boolean;
  resetting: boolean;
  resettingEntireProg: boolean;
  onResetSession: () => Promise<void>;
  onResetEntireProg: () => Promise<void>;
}

export function ResetSections({
  hasActiveSession,
  resetting,
  resettingEntireProg,
  onResetSession,
  onResetEntireProg,
}: ResetSectionsSectionProps) {
  return (
    <>
      {/* Reset Session Section */}
      {hasActiveSession && (
        <Paper
          sx={{
            p: 3,
            mt: 3,
            backgroundColor: 'var(--bg-secondary)',
            border: '2px solid #f44336',
            color: 'var(--text-bright)',
          }}
        >
          <Typography
            variant="h6"
            sx={{ color: '#f44336', mb: 2, fontWeight: 'bold' }}
          >
            Danger Zone - Reset Session
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: 'var(--text-secondary)', mb: 2 }}
          >
            This action will completely reset the current session and delete all associated data.
          </Typography>

          <Divider sx={{ my: 2, borderColor: 'var(--border-color)' }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={
                resetting ? <CircularProgress size={20} /> : <RestartAltIcon />
              }
              onClick={onResetSession}
              disabled={resetting}
              sx={{
                borderColor: '#f44336',
                color: '#f44336',
                '&:hover': {
                  borderColor: '#d32f2f',
                  backgroundColor: 'rgba(244, 67, 54, 0.08)',
                },
              }}
            >
              {resetting ? 'Resetting...' : 'Reset Session'}
            </Button>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
              Deletes all pairings, decklists, victory points, and standings. Marks session as incomplete and inactive.
            </Typography>
          </Box>
        </Paper>
      )}

      {/* Reset Entire Prog Section - Always visible */}
      <Paper
        sx={{
          p: 3,
          mt: 3,
          backgroundColor: 'var(--bg-secondary)',
          border: '3px solid #b71c1c',
          color: 'var(--text-bright)',
        }}
      >
        <Typography
          variant="h6"
          sx={{ color: '#d32f2f', mb: 2, fontWeight: 'bold' }}
        >
          ⚠️ EXTREME DANGER ZONE ⚠️
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: 'var(--text-secondary)', mb: 2 }}
        >
          This will reset the ENTIRE prog system back to initial state. Players remain but everything else is deleted.
        </Typography>

        <Divider sx={{ my: 2, borderColor: 'var(--border-color)' }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={
              resettingEntireProg ? <CircularProgress size={20} /> : <RestartAltIcon />
            }
            onClick={onResetEntireProg}
            disabled={resettingEntireProg}
            sx={{
              borderColor: '#d32f2f',
              color: '#d32f2f',
              fontWeight: 'bold',
              '&:hover': {
                borderColor: '#b71c1c',
                backgroundColor: 'rgba(211, 47, 47, 0.12)',
              },
            }}
          >
            {resettingEntireProg ? 'Resetting Entire Prog...' : 'RESET ENTIRE PROG'}
          </Button>
          <Typography variant="body2" sx={{ color: '#f44336', fontWeight: 'bold' }}>
            Empties ALL wallets, deletes ALL data (decklists, pairings, votes, banlists), resets ALL sessions. CANNOT BE UNDONE!
          </Typography>
        </Box>
      </Paper>
    </>
  );
}
