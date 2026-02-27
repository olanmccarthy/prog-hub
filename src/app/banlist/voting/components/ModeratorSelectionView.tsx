import { Alert, Box, Button, CircularProgress } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { SuggestionGrid } from './SuggestionGrid';
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
 * Displays all suggestions with eligible ones (2+ votes) selectable via tick icons.
 * Ineligible suggestions are grayed out. Moderator confirms selection with button.
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
      <Alert severity="info" sx={{ mb: 3 }}>
        You are the Moderator — select a banlist from the eligible suggestions below
      </Alert>

      <SuggestionGrid
        suggestions={suggestions}
        currentUserId={currentUserId}
        userVotedIds={userVotedIds}
        mode="moderator"
        selectedWinner={selectedWinner}
        onSelectWinner={onSelectWinner}
        showEligibility
      />

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
