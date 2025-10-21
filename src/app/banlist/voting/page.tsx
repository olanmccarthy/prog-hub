'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Alert,
  Chip,
  CircularProgress,
  Button,
  IconButton,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import {
  getBanlistSuggestionsForVoting,
  submitVotes,
  selectWinningSuggestion,
  clearWinningSuggestion,
  type BanlistSuggestionForVoting,
} from './actions';
import { CategoryCard } from '@components/CategoryCard';
import { getCardEntriesFromIds } from '@lib/cardLookup';

/**
 * Displays waiting message when not all players have submitted their banlist suggestions.
 * Shows count of submissions received vs required (6).
 */
function WaitingForSubmissions({
  submissionCount,
  totalRequired,
}: {
  submissionCount: number;
  totalRequired: number;
}) {
  return (
    <Alert severity="info" sx={{ mb: 3 }}>
      {submissionCount}/{totalRequired} suggestions submitted. Voting will open
      when all players submit their suggestions.
    </Alert>
  );
}

/**
 * Final state shown to all users when moderator has confirmed the winning banlist suggestion.
 * Displays success message indicating voting is complete.
 * For moderators, shows a button to change their selection.
 */
function VotingComplete({
  isModerator,
  onChangeSelection,
  isChanging,
}: {
  isModerator: boolean;
  onChangeSelection: () => Promise<void>;
  isChanging: boolean;
}) {
  return (
    <>
      <Alert severity="success" sx={{ mb: 3 }} icon={<CheckCircleIcon />}>
        A winner has been selected! The banlist voting for this session is
        complete.
      </Alert>
      {isModerator && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
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

interface VotingBanlistCardProps {
  suggestion: BanlistSuggestionForVoting;
  isOwnSuggestion: boolean;
  isSelected: boolean;
  hasSubmitted: boolean;
  isVoted: boolean;
  onToggleVote: (id: number) => void;
  showModeratorControls: boolean;
  isChosen: boolean;
  onSelectWinner: (id: number) => void;
}

/**
 * Reusable card component displaying a single banlist suggestion with card names.
 * Adapts UI based on context: shows thumbs-up icon for voting, crown icon for
 * moderator selection, and chips for status (Your Suggestion, Voted).
 * Fetches and displays card names from IDs on mount.
 */
function VotingBanlistCard({
  suggestion,
  isOwnSuggestion,
  isSelected,
  hasSubmitted,
  isVoted,
  onToggleVote,
  showModeratorControls,
  isChosen,
  onSelectWinner,
}: VotingBanlistCardProps) {
  const [cardNames, setCardNames] = useState<{
    banned: string[];
    limited: string[];
    semilimited: string[];
    unlimited: string[];
  }>({
    banned: [],
    limited: [],
    semilimited: [],
    unlimited: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCardNames = async () => {
      setLoading(true);
      const [bannedCards, limitedCards, semilimitedCards, unlimitedCards] =
        await Promise.all([
          getCardEntriesFromIds(suggestion.banned),
          getCardEntriesFromIds(suggestion.limited),
          getCardEntriesFromIds(suggestion.semilimited),
          getCardEntriesFromIds(suggestion.unlimited),
        ]);

      setCardNames({
        banned: bannedCards.map((c) => c.name),
        limited: limitedCards.map((c) => c.name),
        semilimited: semilimitedCards.map((c) => c.name),
        unlimited: unlimitedCards.map((c) => c.name),
      });
      setLoading(false);
    };

    fetchCardNames();
  }, [suggestion]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          mb: 3,
        }}
      >
        <Typography variant="h5" sx={{ color: 'var(--text-bright)', flex: 1 }}>
          Session {suggestion.sessionNumber}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {isOwnSuggestion && (
            <Chip label="Your Suggestion" color="primary" size="small" />
          )}
          {hasSubmitted && isVoted && (
            <Chip
              icon={<CheckCircleIcon />}
              label="Voted"
              color="success"
              size="small"
            />
          )}
        </Box>
      </Box>

      <CategoryCard title="Banned" cards={cardNames.banned} />
      <CategoryCard title="Limited" cards={cardNames.limited} />
      <CategoryCard title="Semi-Limited" cards={cardNames.semilimited} />
      <CategoryCard title="Unlimited" cards={cardNames.unlimited} />

      {!isOwnSuggestion && !hasSubmitted && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <IconButton
            onClick={() => onToggleVote(suggestion.id)}
            sx={{
              color: isSelected
                ? 'var(--accent-primary)'
                : 'var(--text-secondary)',
              '&:hover': {
                color: 'var(--accent-primary)',
                backgroundColor: 'var(--hover-light-grey)',
              },
            }}
          >
            {isSelected ? (
              <ThumbUpIcon sx={{ fontSize: 40 }} />
            ) : (
              <ThumbUpOutlinedIcon sx={{ fontSize: 40 }} />
            )}
          </IconButton>
        </Box>
      )}

      {showModeratorControls && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <IconButton
            onClick={() => onSelectWinner(suggestion.id)}
            sx={{
              color: isChosen ? '#FFD700' : 'var(--text-secondary)',
              '&:hover': {
                color: '#FFD700',
                backgroundColor: 'var(--hover-light-grey)',
              },
            }}
          >
            <EmojiEventsIcon sx={{ fontSize: 40 }} />
          </IconButton>
        </Box>
      )}
    </>
  );
}

/**
 * Active voting interface for players who haven't voted yet.
 * Displays randomized suggestions with thumbs-up voting controls.
 * Players must select at least 2 suggestions before submitting.
 * Excludes player's own suggestion from voting.
 */
function PlayerVotingView({
  suggestions,
  currentUserId,
  selectedVotes,
  onToggleVote,
  onSubmitVotes,
  submitting,
}: {
  suggestions: BanlistSuggestionForVoting[];
  currentUserId: number | null;
  selectedVotes: Set<number>;
  onToggleVote: (id: number) => void;
  onSubmitVotes: () => Promise<void>;
  submitting: boolean;
}) {
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

/**
 * Post-voting view shown after player has submitted their votes.
 * Displays voting progress (X/Y players voted) and read-only suggestion cards
 * with 'Voted' chips on selections. If user is moderator and all players have voted,
 * shows instruction alert for selecting winner.
 */
function PostVotingView({
  votedPlayerCount,
  totalPlayerCount,
  isModerator,
  selectedWinner,
  suggestions,
  currentUserId,
  userVotedIds,
}: {
  votedPlayerCount: number;
  totalPlayerCount: number;
  isModerator: boolean;
  selectedWinner: number | null;
  suggestions: BanlistSuggestionForVoting[];
  currentUserId: number | null;
  userVotedIds: number[];
}) {
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

/**
 * Moderator-only view shown when all players have voted.
 * Displays suggestions with 2+ votes and crown icons for selection.
 * Moderator clicks crown to select (local state), then confirms with button to save to database.
 * Only shows suggestions that received at least 2 votes.
 */
function ModeratorSelectionView({
  suggestions,
  currentUserId,
  userVotedIds,
  selectedWinner,
  onSelectWinner,
  onConfirmWinner,
  submitting,
}: {
  suggestions: BanlistSuggestionForVoting[];
  currentUserId: number | null;
  userVotedIds: number[];
  selectedWinner: number | null;
  onSelectWinner: (id: number) => void;
  onConfirmWinner: () => Promise<void>;
  submitting: boolean;
}) {
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

/**
 * Main voting page component that manages all state and routes to appropriate view.
 * Handles data fetching, vote submission, and winner selection logic.
 * Routes between 6 states: loading, waiting, voting, post-voting, moderator selection, complete.
 */
export default function BanlistVotingPage() {
  const [suggestions, setSuggestions] = useState<BanlistSuggestionForVoting[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [userVotedIds, setUserVotedIds] = useState<number[]>([]);
  const [selectedVotes, setSelectedVotes] = useState<Set<number>>(new Set());
  const [submissionCount, setSubmissionCount] = useState(0);
  const [sessionNumber, setSessionNumber] = useState<number | null>(null);
  const [votedPlayerCount, setVotedPlayerCount] = useState(0);
  const [totalPlayerCount, setTotalPlayerCount] = useState(0);
  const [isModerator, setIsModerator] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState<number | null>(null);
  const [confirmedWinner, setConfirmedWinner] = useState<number | null>(null);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    setLoading(true);
    setError(null);
    const result = await getBanlistSuggestionsForVoting();

    if (result.success && result.suggestions) {
      setSuggestions(result.suggestions);
      setCurrentUserId(result.currentUserId || null);
      setHasVoted(result.hasVoted || false);
      setUserVotedIds(result.userVotedIds || []);
      setSubmissionCount(result.submissionCount || 0);
      setSessionNumber(result.sessionNumber || null);
      setVotedPlayerCount(result.votedPlayerCount || 0);
      setTotalPlayerCount(result.totalPlayerCount || 6);
      setIsModerator(result.isModerator || false);
      setSelectedWinner(result.chosenSuggestionId || null);
      setConfirmedWinner(result.chosenSuggestionId || null);
    } else {
      setError(result.error || 'Failed to load suggestions');
    }
    setLoading(false);
  };

  const handleSelectWinner = (suggestionId: number) => {
    // Toggle selection locally without saving to database
    if (selectedWinner === suggestionId) {
      setSelectedWinner(null);
    } else {
      setSelectedWinner(suggestionId);
    }
  };

  const handleConfirmWinner = async () => {
    if (!selectedWinner) return;

    setSubmitting(true);
    setError(null);

    const result = await selectWinningSuggestion(selectedWinner);

    if (result.success) {
      await fetchSuggestions();
    } else {
      setError(result.error || 'Failed to confirm winner');
    }

    setSubmitting(false);
  };

  const handleClearWinner = async () => {
    setSubmitting(true);
    setError(null);

    const result = await clearWinningSuggestion();

    if (result.success) {
      await fetchSuggestions();
    } else {
      setError(result.error || 'Failed to change selection');
    }

    setSubmitting(false);
  };

  // Randomize suggestions order (stable shuffle based on suggestion IDs)
  // Filter to only show suggestions with 2+ votes when all players have voted
  const randomizedSuggestions = useMemo(() => {
    if (suggestions.length === 0) return [];

    // Filter suggestions if voting is complete
    const allPlayersVoted = votedPlayerCount >= totalPlayerCount;
    const filtered = allPlayersVoted
      ? suggestions.filter((s) => s.voteCount >= 2)
      : suggestions;

    const shuffled = [...filtered];
    // Fisher-Yates shuffle
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [suggestions, votedPlayerCount, totalPlayerCount]);

  const handleToggleVote = (id: number) => {
    setSelectedVotes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSubmitVotes = async () => {
    if (selectedVotes.size < 2) {
      setError('You must vote for at least 2 suggestions');
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = await submitVotes(Array.from(selectedVotes));

    if (result.success) {
      // Refresh to show submitted state
      await fetchSuggestions();
      setSelectedVotes(new Set());
    } else {
      setError(result.error || 'Failed to submit votes');
    }

    setSubmitting(false);
  };

  /**
   * Determines which view to render based on current state.
   * Routes between loading, complete, waiting, voting, post-voting, and moderator selection views.
   */
  const renderContent = () => {
    // Loading state
    if (loading) {
      return (
        <Paper
          sx={{
            p: 3,
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <CircularProgress />
        </Paper>
      );
    }

    // Voting complete state
    if (confirmedWinner) {
      return (
        <VotingComplete
          isModerator={isModerator}
          onChangeSelection={handleClearWinner}
          isChanging={submitting}
        />
      );
    }

    // Waiting for submissions state
    if (submissionCount < 6) {
      return (
        <WaitingForSubmissions
          submissionCount={submissionCount}
          totalRequired={6}
        />
      );
    }

    // All submissions in, voting is open
    if (!hasVoted) {
      return (
        <PlayerVotingView
          suggestions={randomizedSuggestions}
          currentUserId={currentUserId}
          selectedVotes={selectedVotes}
          onToggleVote={handleToggleVote}
          onSubmitVotes={handleSubmitVotes}
          submitting={submitting}
        />
      );
    }

    // Player has voted, waiting for others or moderator selection
    const allPlayersVoted = votedPlayerCount >= totalPlayerCount;

    if (allPlayersVoted && isModerator) {
      return (
        <ModeratorSelectionView
          suggestions={randomizedSuggestions}
          currentUserId={currentUserId}
          userVotedIds={userVotedIds}
          selectedWinner={selectedWinner}
          onSelectWinner={handleSelectWinner}
          onConfirmWinner={handleConfirmWinner}
          submitting={submitting}
        />
      );
    }

    // Post-voting view (for non-moderators or before all players vote)
    return (
      <PostVotingView
        votedPlayerCount={votedPlayerCount}
        totalPlayerCount={totalPlayerCount}
        isModerator={isModerator}
        selectedWinner={selectedWinner}
        suggestions={randomizedSuggestions}
        currentUserId={currentUserId}
        userVotedIds={userVotedIds}
      />
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h3"
          component="h1"
          sx={{
            color: 'var(--text-bright)',
            mb: 2,
            fontWeight: 'bold',
          }}
        >
          Banlist Voting {sessionNumber && `- Session ${sessionNumber}`}
        </Typography>
        <Typography variant="body1" sx={{ color: 'var(--text-secondary)' }}>
          Vote for your preferred banlist suggestions (minimum 2 required)
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {renderContent()}
    </Container>
  );
}
