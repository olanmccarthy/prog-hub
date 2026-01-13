'use client';

import { useState } from 'react';
import { ListItem, ListItemIcon, ListItemText, Box, Typography, IconButton, Collapse } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckIcon from '@mui/icons-material/Check';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

interface PlayerStatus {
  id: number;
  name: string;
  completed: boolean;
}

interface RequirementItemProps {
  met: boolean;
  message: string;
  playerStatuses?: PlayerStatus[];
}

export function RequirementItem({ met, message, playerStatuses }: RequirementItemProps) {
  const [expanded, setExpanded] = useState(false);

  // Show expand/collapse button only when requirement is not met and we have player statuses
  const hasPlayerList = !met && playerStatuses && playerStatuses.length > 0;

  return (
    <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
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
            flex: 1,
          }}
        />
        {hasPlayerList && (
          <IconButton
            size="small"
            onClick={() => setExpanded(!expanded)}
            sx={{
              color: 'var(--text-secondary)',
              '&:hover': {
                backgroundColor: 'var(--hover-light-grey)',
              },
            }}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        )}
      </Box>

      {hasPlayerList && (
        <Collapse in={expanded} timeout="auto" sx={{ width: '100%' }}>
          <Box sx={{ mt: 1, ml: 4, width: '100%' }}>
            {playerStatuses!.map((player) => (
              <Box
                key={player.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  py: 0.5,
                }}
              >
                {player.completed ? (
                  <CheckIcon
                    sx={{
                      fontSize: 16,
                      color: '#4caf50',
                    }}
                  />
                ) : (
                  <CancelIcon
                    sx={{
                      fontSize: 16,
                      color: '#f44336',
                    }}
                  />
                )}
                <Typography
                  variant="body2"
                  sx={{
                    color: player.completed ? '#4caf50' : 'var(--text-secondary)',
                  }}
                >
                  {player.name}
                </Typography>
              </Box>
            ))}
          </Box>
        </Collapse>
      )}
    </ListItem>
  );
}
