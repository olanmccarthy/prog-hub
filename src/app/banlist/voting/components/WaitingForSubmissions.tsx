import { Alert } from '@mui/material';

interface WaitingForSubmissionsProps {
  submissionCount: number;
  totalRequired: number;
}

/**
 * Displays waiting message when not all players have submitted their banlist suggestions.
 * Shows count of submissions received vs required.
 */
export function WaitingForSubmissions({
  submissionCount,
  totalRequired,
}: WaitingForSubmissionsProps) {
  return (
    <Alert severity="info" sx={{ mb: 3 }}>
      {submissionCount}/{totalRequired} suggestions submitted. Voting will open
      when all players submit their suggestions.
    </Alert>
  );
}
