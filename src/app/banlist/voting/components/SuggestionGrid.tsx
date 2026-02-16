import { Box, Paper } from '@mui/material';
import { VotingBanlistCard } from './VotingBanlistCard';
import type { BanlistSuggestionForVoting } from '../actions';

/**
 * Display modes for the suggestion grid:
 *
 * - `voting`: Active voting phase. Players select suggestions with thumbs-up icons.
 *   Cards get a blue border when selected. Requires `selectedVotes` and `onToggleVote`.
 *
 * - `moderator`: Moderator selection phase. Moderator picks a winner with tick icons.
 *   Cards get a blue border when chosen. Ineligible cards (< 2 votes) are grayed out
 *   and have no tick icon. Requires `selectedWinner` and `onSelectWinner`.
 *
 * - `readonly`: Read-only view for non-moderators after voting. No interactive controls.
 *   When `showEligibility` is true, ineligible cards are grayed out.
 *
 * - `complete`: Final state after winner is confirmed. No interactive controls.
 *   The winning card gets a gold border. Ineligible cards are grayed out (unless winner).
 *   Requires `confirmedWinnerId`.
 */
type GridMode = 'voting' | 'moderator' | 'readonly' | 'complete';

interface SuggestionGridProps {
  /** Array of banlist suggestions to display in the grid */
  suggestions: BanlistSuggestionForVoting[];
  /** Current logged-in user's player ID, used to show "Your Suggestion" chip */
  currentUserId: number | null;
  /** IDs of suggestions the current user voted for, used to show "Voted" chip */
  userVotedIds: number[];
  /**
   * Controls card interactivity and styling:
   * - `voting`: thumbs-up selection, blue border on selected
   * - `moderator`: tick selection, blue border on chosen, grayed ineligible
   * - `readonly`: no controls, grayed ineligible when showEligibility is true
   * - `complete`: no controls, gold border on winner, grayed ineligible
   */
  mode: GridMode;
  /** (voting mode) Set of suggestion IDs the player has selected to vote for */
  selectedVotes?: Set<number>;
  /** (voting mode) Callback when player toggles a vote on a suggestion */
  onToggleVote?: (id: number) => void;
  /** (moderator mode) ID of the suggestion the moderator has selected as winner */
  selectedWinner?: number | null;
  /** (moderator mode) Callback when moderator clicks the tick on a suggestion */
  onSelectWinner?: (id: number) => void;
  /** (complete mode) ID of the confirmed winning suggestion, shown with gold border */
  confirmedWinnerId?: number | null;
  /**
   * When true, suggestions with < 2 votes are visually grayed out (opacity 0.5).
   * Used in moderator, readonly (after all voted), and complete modes.
   */
  showEligibility?: boolean;
}

/**
 * Shared grid component for displaying banlist suggestions across all voting views.
 * Renders a responsive 3x2 grid (3 columns on desktop, 2 on tablet, 1 on mobile)
 * with consistent card styling and behavior driven by the `mode` prop.
 */
export function SuggestionGrid({
  suggestions,
  currentUserId,
  userVotedIds,
  mode,
  selectedVotes,
  onToggleVote,
  selectedWinner,
  onSelectWinner,
  confirmedWinnerId,
  showEligibility = false,
}: SuggestionGridProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
        gap: 3,
      }}
    >
      {suggestions.map((suggestion, index) => {
        const isOwnSuggestion = suggestion.playerId === currentUserId;
        const isVoted = userVotedIds.includes(suggestion.id);
        const isEligible = suggestion.voteCount >= 2;

        // Determine per-mode values
        const isSelected = mode === 'voting' && (selectedVotes?.has(suggestion.id) ?? false);
        const isChosen = mode === 'moderator' && selectedWinner === suggestion.id;
        const isWinner = mode === 'complete' && confirmedWinnerId === suggestion.id;

        // Border: always 2px to prevent layout shift on selection.
        // Blue when selected/chosen, gold when winner, subtle default otherwise.
        let borderColor = 'var(--border-color)';
        if (isSelected || isChosen) {
          borderColor = 'var(--accent-primary)';
        } else if (isWinner) {
          borderColor = '#ffd700';
        }

        // Opacity: grayed out when ineligible (except winners are always full opacity)
        const dimmed = showEligibility && !isEligible && !isWinner;

        return (
          <Paper
            key={suggestion.id}
            sx={{
              p: 3,
              backgroundColor: 'var(--bg-secondary)',
              border: `2px solid ${borderColor}`,
              opacity: dimmed ? 0.5 : 1,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <VotingBanlistCard
              suggestion={suggestion}
              isOwnSuggestion={isOwnSuggestion}
              isSelected={isSelected}
              hasSubmitted={mode !== 'voting'}
              isVoted={isVoted}
              onToggleVote={onToggleVote ?? (() => {})}
              showModeratorControls={mode === 'moderator' && isEligible}
              isChosen={isChosen}
              onSelectWinner={onSelectWinner ?? (() => {})}
              number={index + 1}
            />
          </Paper>
        );
      })}
    </Box>
  );
}
