import { Paper, Typography, Box, Button } from '@mui/material';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import { VotingBanlistCard } from './VotingBanlistCard';
import type { BanlistSuggestionForVoting } from '../actions';

interface PlayerVotingViewProps {
  suggestions: BanlistSuggestionForVoting[];
  currentUserId: number | null;
  selectedVotes: Set<number>;
  onToggleVote: (id: number) => void;
  onSubmitVotes: () => Promise<void>;
  submitting: boolean;
}

/**
 * Active voting interface for players who haven't voted yet.
 * Displays randomized suggestions with thumbs-up voting controls.
 * Players must select at least 2 suggestions before submitting.
 * Excludes player's own suggestion from voting.
 */
export function PlayerVotingView({
  suggestions,
  currentUserId,
  selectedVotes,
  onToggleVote,
  onSubmitVotes,
  submitting,
}: PlayerVotingViewProps) {
  const canSubmit = selectedVotes.size >= 2 && !submitting;

  return (
    <>
      <Paper
        sx={{
          p: 2,
          mb: 3,
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
        }}
      >
        <Typography sx={{ color: 'var(--text-primary)' }}>
          Selected: {selectedVotes.size}{' '}
          {selectedVotes.size === 1 ? 'suggestion' : 'suggestions'}
          {selectedVotes.size < 2 && (
            <Typography
              component="span"
              sx={{ color: 'var(--warning)', ml: 1 }}
            >
              (select at least 2)
            </Typography>
          )}
        </Typography>
      </Paper>

      {suggestions.map((suggestion) => {
        const isOwnSuggestion = suggestion.playerId === currentUserId;
        const isSelected = selectedVotes.has(suggestion.id);

        return (
          <Paper
            key={suggestion.id}
            sx={{
              mb: 3,
              p: 3,
              backgroundColor: 'var(--bg-secondary)',
              border: isSelected
                ? '2px solid var(--accent-primary)'
                : '1px solid var(--border-color)',
            }}
          >
            <VotingBanlistCard
              suggestion={suggestion}
              isOwnSuggestion={isOwnSuggestion}
              isSelected={isSelected}
              hasSubmitted={false}
              isVoted={false}
              onToggleVote={onToggleVote}
              showModeratorControls={false}
              isChosen={false}
              onSelectWinner={() => {}}
            />
          </Paper>
        );
      })}

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<HowToVoteIcon />}
          onClick={onSubmitVotes}
          disabled={!canSubmit}
          sx={{
            backgroundColor: 'var(--accent-primary)',
            '&:hover': {
              backgroundColor: 'var(--accent-blue-hover)',
            },
            '&.Mui-disabled': {
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
            },
          }}
        >
          {submitting ? 'Submitting...' : 'Submit Votes'}
        </Button>
      </Box>
    </>
  );
}
