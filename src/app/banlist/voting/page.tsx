'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  getBanlistSuggestionsForVoting,
  submitVotes,
  selectWinningSuggestion,
  clearWinningSuggestion,
  type BanlistSuggestionForVoting,
} from './actions';
import { WaitingForSubmissions } from './components/WaitingForSubmissions';
import { VotingComplete } from './components/VotingComplete';
import { PlayerVotingView } from './components/PlayerVotingView';
import { PostVotingView } from './components/PostVotingView';
import { ModeratorSelectionView } from './components/ModeratorSelectionView';

/**
 * Main voting page component that manages all state and routes to appropriate view.
 * Handles data fetching, vote submission, and winner selection logic.
 * Routes between 6 states: loading, waiting, voting, post-voting, moderator selection, complete.
 */
export default function BanlistVotingPage() {
  const [suggestions, setSuggestions] = useState<BanlistSuggestionForVoting[]>([]);
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

  const handleToggleVote = (suggestionId: number) => {
    const newSelectedVotes = new Set(selectedVotes);
    if (newSelectedVotes.has(suggestionId)) {
      newSelectedVotes.delete(suggestionId);
    } else {
      newSelectedVotes.add(suggestionId);
    }
    setSelectedVotes(newSelectedVotes);
  };

  const handleSubmitVotes = async () => {
    if (selectedVotes.size < 2) {
      setError('Please select at least 2 suggestions');
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = await submitVotes(Array.from(selectedVotes));

    if (result.success) {
      await fetchSuggestions();
      setSelectedVotes(new Set());
    } else {
      setError(result.error || 'Failed to submit votes');
    }

    setSubmitting(false);
  };

  const handleSelectWinner = (suggestionId: number) => {
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

  const randomizedSuggestions = useMemo(() => {
    if (suggestions.length === 0) return [];

    const allPlayersVoted = votedPlayerCount >= totalPlayerCount;
    const filtered = allPlayersVoted
      ? suggestions.filter((s) => s.voteCount >= 2)
      : suggestions;

    const shuffled = [...filtered];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const seed = shuffled[i].id + shuffled[0].id;
      const j = Math.floor((seed % 1000) / 1000 * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }, [suggestions, votedPlayerCount, totalPlayerCount]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  const allPlayersVoted = votedPlayerCount >= totalPlayerCount;
  const showModeratorSelection =
    isModerator && hasVoted && allPlayersVoted && !confirmedWinner;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 3, color: 'var(--text-bright)' }}>
        Banlist Voting
        {sessionNumber && ` - Session ${sessionNumber}`}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {confirmedWinner ? (
        <VotingComplete
          isModerator={isModerator}
          onChangeSelection={handleClearWinner}
          isChanging={submitting}
        />
      ) : submissionCount < totalPlayerCount ? (
        <WaitingForSubmissions
          submissionCount={submissionCount}
          totalRequired={totalPlayerCount}
        />
      ) : !hasVoted ? (
        <PlayerVotingView
          suggestions={randomizedSuggestions}
          currentUserId={currentUserId}
          selectedVotes={selectedVotes}
          onToggleVote={handleToggleVote}
          onSubmitVotes={handleSubmitVotes}
          submitting={submitting}
        />
      ) : showModeratorSelection ? (
        <ModeratorSelectionView
          suggestions={randomizedSuggestions}
          currentUserId={currentUserId}
          userVotedIds={userVotedIds}
          selectedWinner={selectedWinner}
          onSelectWinner={handleSelectWinner}
          onConfirmWinner={handleConfirmWinner}
          submitting={submitting}
        />
      ) : (
        <PostVotingView
          votedPlayerCount={votedPlayerCount}
          totalPlayerCount={totalPlayerCount}
          isModerator={isModerator}
          selectedWinner={selectedWinner}
          suggestions={randomizedSuggestions}
          currentUserId={currentUserId}
          userVotedIds={userVotedIds}
        />
      )}
    </Container>
  );
}
