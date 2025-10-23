import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

interface NextSessionData {
  number: number;
  setName?: string | null;
}

interface StartSessionSectionProps {
  nextSession: NextSessionData | null;
  canStart: boolean;
  startReasons?: string[];
  starting: boolean;
  onStart: () => Promise<void>;
}

export function StartSessionSection({
  nextSession,
  canStart,
  startReasons,
  starting,
  onStart,
}: StartSessionSectionProps) {
  return (
    <Paper
      sx={{
        p: 3,
        mb: 3,
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        color: 'var(--text-bright)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography
            variant="h6"
            sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }}
          >
            {nextSession
              ? `Start Session #${nextSession.number}`
              : 'No Sessions Available'}
          </Typography>
          {nextSession?.setName && (
            <Typography
              variant="body2"
              sx={{ color: 'var(--text-secondary)' }}
            >
              {nextSession.setName}
            </Typography>
          )}
        </Box>
        {nextSession && (
          <Button
            variant="contained"
            startIcon={
              starting ? <CircularProgress size={20} /> : <PlayArrowIcon />
            }
            onClick={onStart}
            disabled={!canStart || starting}
            sx={{
              backgroundColor: canStart
                ? 'var(--accent-primary)'
                : 'var(--grey-300)',
              '&:hover': {
                backgroundColor: canStart
                  ? 'var(--accent-hover)'
                  : 'var(--grey-300)',
              },
              '&:disabled': {
                backgroundColor: 'var(--grey-300)',
                color: 'var(--text-secondary)',
              },
            }}
          >
            {starting ? 'Starting...' : 'Start Session'}
          </Button>
        )}
      </Box>

      <Typography
        variant="body2"
        sx={{ color: 'var(--text-secondary)', mb: 2 }}
      >
        This will activate the session and set the date.
      </Typography>

      {canStart ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircleIcon sx={{ color: '#4caf50' }} />
          <Typography sx={{ color: '#4caf50' }}>Ready to start!</Typography>
        </Box>
      ) : (
        <>
          {startReasons && startReasons.length > 0 && (
            <>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 2,
                }}
              >
                <ErrorIcon sx={{ color: '#ff9800' }} />
                <Typography sx={{ color: '#ff9800' }}>
                  Cannot start:
                </Typography>
              </Box>
              <List dense>
                {startReasons.map((reason, index) => (
                  <ListItem
                    key={`start-reason-${index}-${reason.slice(0, 20)}`}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <ErrorIcon sx={{ color: '#ff9800', fontSize: 20 }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={reason}
                      sx={{ color: 'var(--text-primary)' }}
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </>
      )}
    </Paper>
  );
}
