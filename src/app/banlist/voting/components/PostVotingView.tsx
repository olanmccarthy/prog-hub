import { Alert } from '@mui/material';
import { SuggestionGrid } from './SuggestionGrid';
import type { BanlistSuggestionForVoting } from '../actions';

interface PostVotingViewProps {
  votedPlayerCount: number;
  totalPlayerCount: number;
  suggestions: BanlistSuggestionForVoting[];
  currentUserId: number | null;
  userVotedIds: number[];
}

/**
 * Post-voting view shown after player has submitted their votes.
 * Displays voting progress or moderator selection status,
 * and read-only suggestion cards with 'Voted' chips.
 */
export function PostVotingView({
  votedPlayerCount,
  totalPlayerCount,
  suggestions,
  currentUserId,
  userVotedIds,
}: PostVotingViewProps) {
  const allVoted = votedPlayerCount >= totalPlayerCount;

  return (
    <>
      {!allVoted ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          You have submitted your votes. Waiting for all players — {votedPlayerCount}/{totalPlayerCount} have voted
        </Alert>
      ) : (
        <Alert severity="info" sx={{ mb: 3 }}>
          Voting complete — the moderator is now selecting the winning banlist
        </Alert>
      )}

      <SuggestionGrid
        suggestions={suggestions}
        currentUserId={currentUserId}
        userVotedIds={userVotedIds}
        mode="readonly"
        showEligibility={allVoted}
      />
    </>
  );
}
