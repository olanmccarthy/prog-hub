import { Alert, Box, Button, CircularProgress } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface VotingCompleteProps {
  isModerator: boolean;
  onChangeSelection: () => Promise<void>;
  isChanging: boolean;
}

/**
 * Final state shown to all users when moderator has confirmed the winning banlist suggestion.
 * Displays success message indicating voting is complete.
 * For moderators, shows a button to change their selection.
 */
export function VotingComplete({
  isModerator,
  onChangeSelection,
  isChanging,
}: VotingCompleteProps) {
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
