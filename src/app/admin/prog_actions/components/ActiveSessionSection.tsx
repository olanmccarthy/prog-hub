import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Paper,
  List,
  Divider,
} from '@mui/material';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { RequirementItem } from '@components/RequirementItem';

interface Requirement {
  met: boolean;
  message: string;
}

interface Requirements {
  decklistsSubmitted: Requirement;
  eventWheelSpun: Requirement;
  pairingsGenerated: Requirement;
  placementsFilled: Requirement;
  victoryPointsAssigned: Requirement;
  walletPointsAssigned: Requirement;
  suggestionsSubmitted: Requirement;
  votesSubmitted: Requirement;
  moderatorSelected: Requirement;
  moderatorVoted: Requirement;
}

interface ActiveSessionData {
  number: number;
  setName?: string | null;
}

interface ActiveSessionSectionProps {
  session: ActiveSessionData;
  canComplete: boolean;
  requirements: Requirements;
  completing: boolean;
  onComplete: () => Promise<void>;
}

export function ActiveSessionSection({
  session,
  canComplete,
  requirements,
  completing,
  onComplete,
}: ActiveSessionSectionProps) {
  return (
    <Paper
      sx={{
        p: 3,
        mb: 3,
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--accent-primary)',
        color: 'var(--text-bright)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography
            variant="h6"
            sx={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}
          >
            Active Session: #{session.number}
          </Typography>
          {session.setName && (
            <Typography
              variant="body2"
              sx={{ color: 'var(--text-secondary)' }}
            >
              {session.setName}
            </Typography>
          )}
        </Box>
        <Button
          variant="contained"
          startIcon={
            completing ? <CircularProgress size={20} /> : <StopCircleIcon />
          }
          onClick={onComplete}
          disabled={!canComplete || completing}
          sx={{
            backgroundColor: canComplete
              ? '#f44336'
              : 'var(--grey-300)',
            '&:hover': {
              backgroundColor: canComplete
                ? '#d32f2f'
                : 'var(--grey-300)',
            },
            '&:disabled': {
              backgroundColor: 'var(--grey-300)',
              color: 'var(--text-secondary)',
            },
          }}
        >
          {completing ? 'Completing...' : 'Complete Session'}
        </Button>
      </Box>

      <Typography
        variant="body2"
        sx={{ color: 'var(--text-secondary)', mb: 2 }}
      >
        This will mark the session as complete and allow the next session to
        start.
      </Typography>

      <Divider sx={{ my: 2, borderColor: 'var(--border-color)' }} />

      <Typography variant="h6" sx={{ color: 'var(--text-bright)', mb: 2 }}>
        Completion Requirements
      </Typography>

      {canComplete && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <CheckCircleIcon sx={{ color: '#4caf50' }} />
          <Typography sx={{ color: '#4caf50' }}>
            All requirements met. Ready to complete!
          </Typography>
        </Box>
      )}

      <List dense>
        <RequirementItem {...requirements.decklistsSubmitted} />
        <RequirementItem {...requirements.eventWheelSpun} />
        <RequirementItem {...requirements.pairingsGenerated} />
        <RequirementItem {...requirements.placementsFilled} />
        <RequirementItem {...requirements.victoryPointsAssigned} />
        <RequirementItem {...requirements.walletPointsAssigned} />
        <RequirementItem {...requirements.suggestionsSubmitted} />
        <RequirementItem {...requirements.votesSubmitted} />
        <RequirementItem {...requirements.moderatorSelected} />
        <RequirementItem {...requirements.moderatorVoted} />
      </List>
    </Paper>
  );
}
