import { Box, Button, CircularProgress, Paper } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { VotingBanlistCard } from './VotingBanlistCard';
import type { BanlistSuggestionForVoting } from '../actions';

interface ModeratorSelectionViewProps {
  suggestions: BanlistSuggestionForVoting[];
  currentUserId: number | null;
  userVotedIds: number[];
  selectedWinner: number | null;
  onSelectWinner: (id: number) => void;
  onConfirmWinner: () => Promise<void>;
  submitting: boolean;
}

/**
 * Moderator-only view shown when all players have voted.
 * Displays suggestions with 2+ votes and crown icons for selection.
 * Moderator clicks crown to select (local state), then confirms with button to save to database.
 * Only shows suggestions that received at least 2 votes.
 */
export function ModeratorSelectionView({
  suggestions,
  currentUserId,
  userVotedIds,
  selectedWinner,
  onSelectWinner,
  onConfirmWinner,
  submitting,
}: ModeratorSelectionViewProps) {
  return (
    <>
      {suggestions.map((suggestion) => {
        const isOwnSuggestion = suggestion.playerId === currentUserId;
        const isVoted = userVotedIds.includes(suggestion.id);
        const isChosen = selectedWinner === suggestion.id;

        return (
          <Paper
            key={suggestion.id}
            sx={{
              mb: 3,
              p: 3,
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <VotingBanlistCard
              suggestion={suggestion}
              isOwnSuggestion={isOwnSuggestion}
              isSelected={false}
              hasSubmitted={true}
              isVoted={isVoted}
              onToggleVote={() => {}}
              showModeratorControls={true}
              isChosen={isChosen}
              onSelectWinner={onSelectWinner}
            />
          </Paper>
        );
      })}

      {selectedWinner && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={
              submitting ? <CircularProgress size={20} /> : <CheckCircleIcon />
            }
            onClick={onConfirmWinner}
            disabled={submitting}
            sx={{
              backgroundColor: '#4caf50',
              '&:hover': {
                backgroundColor: '#45a049',
              },
              '&:disabled': {
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
              },
            }}
          >
            {submitting ? 'Confirming...' : 'Confirm Winner Selection'}
          </Button>
        </Box>
      )}
    </>
  );
}
