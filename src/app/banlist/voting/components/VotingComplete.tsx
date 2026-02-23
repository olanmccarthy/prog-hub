import { Alert, Box, Button, CircularProgress } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { SuggestionGrid } from './SuggestionGrid';
import type { BanlistSuggestionForVoting } from '../actions';

interface VotingCompleteProps {
  isModerator: boolean;
  onChangeSelection: () => Promise<void>;
  isChanging: boolean;
  suggestions: BanlistSuggestionForVoting[];
  confirmedWinnerId: number;
  currentUserId: number | null;
  userVotedIds: number[];
}

/**
 * Final state shown to all users when moderator has confirmed the winning banlist suggestion.
 * Displays all suggestions in a grid with the winner highlighted in gold.
 * For moderators, shows a button to change their selection.
 */
export function VotingComplete({
  isModerator,
  onChangeSelection,
  isChanging,
  suggestions,
  confirmedWinnerId,
  currentUserId,
  userVotedIds,
}: VotingCompleteProps) {
  return (
    <>
      <Alert severity="success" sx={{ mb: 3 }} icon={<CheckCircleIcon />}>
        A winner has been selected! The banlist voting for this session is
        complete.
      </Alert>

      <SuggestionGrid
        suggestions={suggestions}
        currentUserId={currentUserId}
        userVotedIds={userVotedIds}
        mode="complete"
        confirmedWinnerId={confirmedWinnerId}
        showEligibility
      />

      {isModerator && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Button
            variant="outlined"
            size="large"
            onClick={onChangeSelection}
            disabled={isChanging}
            sx={{
              borderColor: 'var(--accent-primary)',
              color: 'var(--accent-primary)',
              '&:hover': {
                backgroundColor: 'var(--hover-light-grey)',
                borderColor: 'var(--accent-primary)',
              },
              '&.Mui-disabled': {
                borderColor: 'var(--border-color)',
                color: 'var(--text-secondary)',
              },
            }}
            startIcon={isChanging ? <CircularProgress size={20} /> : undefined}
          >
            {isChanging ? 'Changing Selection...' : 'Change Selection'}
          </Button>
        </Box>
      )}
    </>
  );
}
