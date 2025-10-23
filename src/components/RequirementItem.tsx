import { ListItem, ListItemIcon, ListItemText } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

interface RequirementItemProps {
  met: boolean;
  message: string;
}

export function RequirementItem({ met, message }: RequirementItemProps) {
  return (
    <ListItem>
      <ListItemIcon sx={{ minWidth: 36 }}>
        {met ? (
          <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 20 }} />
        ) : (
          <CancelIcon sx={{ color: '#f44336', fontSize: 20 }} />
        )}
      </ListItemIcon>
      <ListItemText
        primary={message}
        sx={{
          color: met ? '#4caf50' : 'var(--text-primary)',
        }}
      />
    </ListItem>
  );
}
