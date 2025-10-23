import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Paper,
  Divider,
} from '@mui/material';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import AssignmentIcon from '@mui/icons-material/Assignment';

interface TestControlsSectionProps {
  autoSubmitingDecklists: boolean;
  autoCreating: boolean;
  autoVoting: boolean;
  autoModeratorVoting: boolean;
  onAutoSubmitDecklists: () => Promise<void>;
  onAutoCreateSuggestions: () => Promise<void>;
  onAutoVote: () => Promise<void>;
  onAutoModeratorVote: () => Promise<void>;
}

export function TestControlsSection({
  autoSubmitingDecklists,
  autoCreating,
  autoVoting,
  autoModeratorVoting,
  onAutoSubmitDecklists,
  onAutoCreateSuggestions,
  onAutoVote,
  onAutoModeratorVote,
}: TestControlsSectionProps) {
  return (
    <Paper
      sx={{
        p: 3,
        mt: 3,
        backgroundColor: 'var(--bg-secondary)',
        border: '2px solid #ff9800',
        color: 'var(--text-bright)',
      }}
    >
      <Typography
        variant="h6"
        sx={{ color: '#ff9800', mb: 2, fontWeight: 'bold' }}
      >
        Test Controls
      </Typography>
      <Typography
        variant="body2"
        sx={{ color: 'var(--text-secondary)', mb: 2 }}
      >
        These are development/testing shortcuts and should only be used for
        testing purposes.
      </Typography>

      <Divider sx={{ my: 2, borderColor: 'var(--border-color)' }} />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={
              autoSubmitingDecklists ? <CircularProgress size={20} /> : <AssignmentIcon />
            }
            onClick={onAutoSubmitDecklists}
            disabled={autoSubmitingDecklists}
            sx={{
              borderColor: '#ff9800',
              color: '#ff9800',
              '&:hover': {
                borderColor: '#f57c00',
                backgroundColor: 'rgba(255, 152, 0, 0.08)',
              },
            }}
          >
            {autoSubmitingDecklists ? 'Submitting Decklists...' : 'Auto-Submit Decklists'}
          </Button>
          <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
            Automatically submits decklists from all players
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={
              autoCreating ? (
                <CircularProgress size={20} />
              ) : (
                <AddCircleIcon />
              )
            }
            onClick={onAutoCreateSuggestions}
            disabled={autoCreating}
            sx={{
              borderColor: '#ff9800',
              color: '#ff9800',
              '&:hover': {
                borderColor: '#f57c00',
                backgroundColor: 'rgba(255, 152, 0, 0.08)',
              },
            }}
          >
            {autoCreating ? 'Creating...' : 'Auto-Create Suggestions'}
          </Button>
          <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
            Automatically creates banlist suggestions for players who havent
            submitted yet
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={
              autoVoting ? <CircularProgress size={20} /> : <HowToVoteIcon />
            }
            onClick={onAutoVote}
            disabled={autoVoting}
            sx={{
              borderColor: '#ff9800',
              color: '#ff9800',
              '&:hover': {
                borderColor: '#f57c00',
                backgroundColor: 'rgba(255, 152, 0, 0.08)',
              },
            }}
          >
            {autoVoting ? 'Creating Votes...' : 'Auto-Vote All Players'}
          </Button>
          <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
            Automatically creates votes from all players to skip to moderator
            selection phase
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={
              autoModeratorVoting ? <CircularProgress size={20} /> : <HowToVoteIcon />
            }
            onClick={onAutoModeratorVote}
            disabled={autoModeratorVoting}
            sx={{
              borderColor: '#ff9800',
              color: '#ff9800',
              '&:hover': {
                borderColor: '#f57c00',
                backgroundColor: 'rgba(255, 152, 0, 0.08)',
              },
            }}
          >
            {autoModeratorVoting ? 'Choosing...' : 'Auto-Choose Banlist (Moderator)'}
          </Button>
          <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
            Automatically makes the moderator choose a random banlist suggestion
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}
