import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Paper,
} from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

interface GeneratePairingsSectionProps {
  canGenerate: boolean;
  pairingsGenerated: boolean;
  generating: boolean;
  onGenerate: () => Promise<void>;
}

export function GeneratePairingsSection({
  canGenerate,
  pairingsGenerated,
  generating,
  onGenerate,
}: GeneratePairingsSectionProps) {
  return (
    <Paper
      sx={{
        p: 3,
        mb: 3,
        backgroundColor: 'var(--bg-secondary)',
        border: pairingsGenerated
          ? '1px solid #4caf50'
          : '1px solid var(--border-color)',
        color: 'var(--text-bright)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography
            variant="h6"
            sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }}
          >
            Generate Pairings
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={
            generating ? (
              <CircularProgress size={20} />
            ) : (
              <GroupsIcon />
            )
          }
          onClick={onGenerate}
          disabled={!canGenerate || generating}
          sx={{
            backgroundColor: canGenerate
              ? 'var(--accent-primary)'
              : 'var(--grey-300)',
            '&:hover': {
              backgroundColor: canGenerate
                ? 'var(--accent-hover)'
                : 'var(--grey-300)',
            },
            '&:disabled': {
              backgroundColor: 'var(--grey-300)',
              color: 'var(--text-secondary)',
            },
          }}
        >
          {generating ? 'Generating...' : 'Generate Pairings'}
        </Button>
      </Box>

      <Typography
        variant="body2"
        sx={{ color: 'var(--text-secondary)', mb: 2 }}
      >
        Generate randomized round-robin pairings for all players and send
        Discord notification.
      </Typography>

      {pairingsGenerated ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircleIcon sx={{ color: '#4caf50' }} />
          <Typography sx={{ color: '#4caf50' }}>
            Pairings have been generated!
          </Typography>
        </Box>
      ) : (
        <>
          {!canGenerate && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ErrorIcon sx={{ color: '#ff9800' }} />
              <Typography sx={{ color: '#ff9800' }}>
                {pairingsGenerated
                  ? 'Pairings already exist for this session'
                  : 'Event wheel must be spun before generating pairings'}
              </Typography>
            </Box>
          )}
          {canGenerate && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleIcon sx={{ color: '#4caf50' }} />
              <Typography sx={{ color: '#4caf50' }}>
                Ready to generate pairings!
              </Typography>
            </Box>
          )}
        </>
      )}
    </Paper>
  );
}
