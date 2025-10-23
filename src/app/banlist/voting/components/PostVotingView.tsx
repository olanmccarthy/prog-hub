import { Alert, Paper, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { VotingBanlistCard } from './VotingBanlistCard';
import type { BanlistSuggestionForVoting } from '../actions';

interface PostVotingViewProps {
  votedPlayerCount: number;
  totalPlayerCount: number;
  isModerator: boolean;
  selectedWinner: number | null;
  suggestions: BanlistSuggestionForVoting[];
  currentUserId: number | null;
  userVotedIds: number[];
}

/**
 * Post-voting view shown after player has submitted their votes.
 * Displays voting progress (X/Y players voted) and read-only suggestion cards
 * with 'Voted' chips on selections. If user is moderator and all players have voted,
 * shows instruction alert for selecting winner.
 */
export function PostVotingView({
  votedPlayerCount,
  totalPlayerCount,
  isModerator,
  selectedWinner,
  suggestions,
  currentUserId,
  userVotedIds,
}: PostVotingViewProps) {
  return (
    <>
      <Alert severity="success" sx={{ mb: 3 }} icon={<CheckCircleIcon />}>
        You have submitted your votes for this session
      </Alert>
      <Paper
        sx={{
          p: 3,
          mb: 3,
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          textAlign: 'center',
        }}
      >
        <Typography variant="h4" sx={{ color: 'var(--text-bright)', mb: 2 }}>
          Voting Status
        </Typography>
        <Typography variant="h5" sx={{ color: 'var(--accent-primary)', mb: 1 }}>
          {votedPlayerCount}/{totalPlayerCount} players have voted
        </Typography>
        {votedPlayerCount < totalPlayerCount && (
          <Typography sx={{ color: 'var(--text-secondary)' }}>
            Results will be revealed once all players have submitted their votes
          </Typography>
        )}
        {votedPlayerCount >= totalPlayerCount && (
          <>
            <Typography sx={{ color: 'var(--success)', mb: 2 }}>
              All players have voted! Results are ready.
            </Typography>
            {isModerator && (
              <Alert severity="info" sx={{ mt: 2 }}>
                As the moderator, you can now select the winning banlist
                suggestion below.
                {selectedWinner
                  ? ' A winner has been selected.'
                  : ' Click "Select as Winner" on your chosen suggestion.'}
              </Alert>
            )}
          </>
        )}
      </Paper>

      {suggestions.map((suggestion) => {
        const isOwnSuggestion = suggestion.playerId === currentUserId;
        const isVoted = userVotedIds.includes(suggestion.id);

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
              showModeratorControls={false}
              isChosen={false}
              onSelectWinner={() => {}}
            />
          </Paper>
        );
      })}
    </>
  );
}
