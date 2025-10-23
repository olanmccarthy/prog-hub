'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PersonIcon from '@mui/icons-material/Person';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import GavelIcon from '@mui/icons-material/Gavel';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

const DRAWER_WIDTH = 280;

const menuItems = [
  {
    label: 'Session Management',
    path: '/admin/prog_actions',
    icon: <PlayArrowIcon />,
  },
  {
    label: 'Change Moderator',
    path: '/admin/prog_actions/moderator',
    icon: <PersonIcon />,
  },
  {
    label: 'Change Chosen Suggestion',
    path: '/admin/prog_actions/chosen-suggestion',
    icon: <HowToVoteIcon />,
  },
  {
    label: 'Edit Current Banlist',
    path: '/admin/prog_actions/current-banlist',
    icon: <GavelIcon />,
  },
  {
    label: 'Edit Wallet Values',
    path: '/admin/prog_actions/wallets',
    icon: <AccountBalanceWalletIcon />,
  },
  {
    label: 'Edit Victory Points',
    path: '/admin/prog_actions/victory-points',
    icon: <EmojiEventsIcon />,
  },
];

export default function ProgActionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            backgroundColor: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border-color)',
            position: 'relative',
            height: '100vh',
            top: 0,
          },
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid var(--border-color)' }}>
          <Typography
            variant="h6"
            sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }}
          >
            Session Manager
          </Typography>
        </Box>
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                selected={pathname === item.path}
                onClick={() => handleNavigation(item.path)}
                sx={{
                  '&.Mui-selected': {
                    backgroundColor: 'var(--accent-primary)',
                    '&:hover': {
                      backgroundColor: 'var(--accent-blue-hover)',
                    },
                  },
                  '&:hover': {
                    backgroundColor: 'var(--bg-tertiary)',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: pathname === item.path ? 'var(--text-bright)' : 'var(--text-secondary)',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  sx={{
                    '& .MuiListItemText-primary': {
                      color: pathname === item.path ? 'var(--text-bright)' : 'var(--text-primary)',
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
