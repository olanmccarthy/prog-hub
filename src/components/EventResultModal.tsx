'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
import CelebrationIcon from '@mui/icons-material/Celebration';
import CancelIcon from '@mui/icons-material/Cancel';

interface EventResultModalProps {
  open: boolean;
  onClose: () => void;
  onSpinAgain?: () => void;
  result: {
    name: string;
    description: string;
  } | null;
  alreadySpun: boolean;
}

export default function EventResultModal({
  open,
  onClose,
  onSpinAgain,
  result,
  alreadySpun,
}: EventResultModalProps) {
  const isNoReward = result === null || result.name === 'No Event' || result.name === 'Normal Prizing';
  const displayTitle = result === null
    ? 'No Event'
    : (result.name === 'No Event' || result.name === 'Normal Prizing')
      ? result.name
      : result.name;
  const displayMessage = result === null || result.name === 'No Event'
    ? 'No event was selected this time. The tournament will proceed normally.'
    : result.name === 'Normal Prizing'
      ? 'No prize awarded this spin. Better luck next time!'
      : result.description;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-color)',
        },
      }}
    >
      <DialogTitle
        sx={{
          color: 'var(--text-bright)',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        {isNoReward ? (
          <>
            <CancelIcon sx={{ color: 'var(--text-secondary)' }} />
            {displayTitle}
          </>
        ) : (
          <>
            <CelebrationIcon sx={{ color: 'var(--accent-primary)' }} />
            {displayTitle}
          </>
        )}
      </DialogTitle>

      <DialogContent sx={{ mt: 2 }}>
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Typography
            sx={{
              color: isNoReward ? 'var(--text-secondary)' : 'var(--text-primary)',
              fontSize: '1.1rem'
            }}
          >
            {displayMessage}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          borderTop: '1px solid var(--border-color)',
          p: 2,
          gap: 1,
        }}
      >
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            backgroundColor: 'var(--accent-primary)',
            '&:hover': {
              backgroundColor: 'var(--accent-blue-hover)',
            },
          }}
        >
          Close
        </Button>
        {onSpinAgain && !alreadySpun && (
          <Button
            onClick={onSpinAgain}
            variant="outlined"
            sx={{
              borderColor: 'var(--accent-primary)',
              color: 'var(--accent-primary)',
              '&:hover': {
                borderColor: 'var(--accent-blue-hover)',
                backgroundColor: 'var(--hover-light-grey)',
              },
            }}
          >
            Spin Again
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
