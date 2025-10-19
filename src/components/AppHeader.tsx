'use client';

import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Box,
  Divider,
  Collapse,
  Button,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import { useState, MouseEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const allNavigationRoutes = [
  {
    label: 'Home',
    path: '/',
  },
  {
    label: 'Admin',
    adminOnly: true,
    subItems: [
      { label: 'Player List', path: '/admin/player-list' },
      { label: 'Set Manager', path: '/admin/set-manager' },
      { label: 'Actions', path: '/admin/prog_actions' },
    ],
  },
  {
    label: 'Banlist',
    subItems: [
      { label: 'Current', path: '/banlist/current' },
      { label: 'History', path: '/banlist/history' },
      { label: 'Create Suggestion', path: '/banlist/suggestion-creation' },
      { label: 'Voting', path: '/banlist/voting' },
      { label: 'Suggestion History', path: '/banlist/suggestion-history' },
    ],
  },
  {
    label: 'Play',
    subItems: [
      { label: 'Decklist Submission', path: '/play/decklist-submission' },
      { label: 'Pairings', path: '/play/pairings' },
      { label: 'Standings', path: '/play/standings' },
    ],
  },
  {
    label: 'Stats',
    path: '/stats',
  },
];

interface AppHeaderProps {
  isAdmin: boolean;
}

export default function AppHeader({ isAdmin }: AppHeaderProps) {
  // Filter navigation routes based on admin status
  const navigationRoutes = allNavigationRoutes.filter(
    (route) => !('adminOnly' in route) || route.adminOnly === isAdmin
  );
  const theme = useTheme();
  const router = useRouter();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [anchorEls, setAnchorEls] = useState<Record<string, HTMLElement | null>>({});

  const toggleDrawer = (open: boolean) => () => {
    setDrawerOpen(open);
  };

  const toggleSection = (label: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const handleMenuOpen = (event: MouseEvent<HTMLElement>, label: string) => {
    setAnchorEls((prev) => ({
      ...prev,
      [label]: event.currentTarget,
    }));
  };

  const handleMenuClose = (label: string) => {
    setAnchorEls((prev) => ({
      ...prev,
      [label]: null,
    }));
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <>
      <AppBar
        position="static"
        sx={{
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-bright)',
          boxShadow: 'none',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              size="large"
              edge="start"
              sx={{
                mr: 2,
                color: 'var(--text-bright)',
                '&:hover': {
                  backgroundColor: 'var(--bg-tertiary)',
                }
              }}
              aria-label="menu"
              onClick={toggleDrawer(true)}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Box
            sx={{
              flexGrow: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Image
              src="/icon.png"
              alt="Prog Reincarnation Logo"
              width={40}
              height={40}
              style={{ objectFit: 'contain' }}
            />
            <Typography
              variant="h4"
              component="div"
              sx={{
                color: 'var(--text-bright)',
              }}
            >
              Prog Reincarnation
            </Typography>
          </Box>
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {navigationRoutes.map((route) => {
                if (route.subItems) {
                  return (
                    <Box key={route.label}>
                      <Button
                        onClick={(e) => handleMenuOpen(e, route.label)}
                        sx={{
                          textTransform: 'none',
                          fontSize: '1rem',
                          color: 'var(--text-bright)',
                          '&:hover': {
                            backgroundColor: 'var(--bg-tertiary)',
                          }
                        }}
                      >
                        {route.label}
                      </Button>
                      <Menu
                        anchorEl={anchorEls[route.label]}
                        open={Boolean(anchorEls[route.label])}
                        onClose={() => handleMenuClose(route.label)}
                        anchorOrigin={{
                          vertical: 'bottom',
                          horizontal: 'left',
                        }}
                        transformOrigin={{
                          vertical: 'top',
                          horizontal: 'left',
                        }}
                        disableScrollLock
                        sx={{
                          '& .MuiPaper-root': {
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)',
                            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
                          }
                        }}
                      >
                        {route.subItems.map((subItem) => (
                          <MenuItem
                            key={subItem.path}
                            component={Link}
                            href={subItem.path}
                            onClick={() => handleMenuClose(route.label)}
                            sx={{
                              '&:hover': {
                                backgroundColor: 'var(--bg-tertiary)',
                                color: 'var(--text-bright)',
                              }
                            }}
                          >
                            {subItem.label}
                          </MenuItem>
                        ))}
                      </Menu>
                    </Box>
                  );
                }

                return (
                  <Button
                    key={route.path}
                    component={Link}
                    href={route.path}
                    sx={{
                      textTransform: 'none',
                      fontSize: '1rem',
                      color: 'var(--text-bright)',
                      '&:hover': {
                        backgroundColor: 'var(--bg-tertiary)',
                      }
                    }}
                  >
                    {route.label}
                  </Button>
                );
              })}
              <IconButton
                onClick={handleLogout}
                sx={{
                  color: 'var(--text-bright)',
                  '&:hover': {
                    backgroundColor: 'var(--bg-tertiary)',
                  }
                }}
                title="Logout"
              >
                <LogoutIcon />
              </IconButton>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {isMobile && (
        <Drawer
          anchor="left"
          open={drawerOpen}
          onClose={toggleDrawer(false)}
          sx={{
            '& .MuiDrawer-paper': {
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              borderRight: '1px solid var(--border-color)',
            }
          }}
        >
          <Box
            sx={{ width: 280 }}
            role="presentation"
            onClick={(e) => {
              // Don't close drawer when clicking on expandable items
              if ((e.target as HTMLElement).closest('[data-expandable]')) {
                e.stopPropagation();
              } else {
                toggleDrawer(false)();
              }
            }}
          >
            <Box sx={{ p: 2, borderBottom: '1px solid var(--border-color)' }}>
              <Typography
                variant="h6"
                sx={{ color: 'var(--text-bright)' }}
              >
                Navigation
              </Typography>
            </Box>
            <Divider sx={{ borderColor: 'var(--border-color)' }} />
            <List>
              {navigationRoutes.map((route) => {
                if (route.subItems) {
                  return (
                    <div key={route.label}>
                      <ListItemButton
                        data-expandable
                        onClick={() => toggleSection(route.label)}
                        sx={{
                          '&:hover': {
                            backgroundColor: 'var(--bg-tertiary)',
                          }
                        }}
                      >
                        <ListItemText
                          primary={route.label}
                          sx={{ color: 'var(--text-primary)' }}
                        />
                        <Typography sx={{ color: 'var(--text-secondary)' }}>
                          {expandedSections[route.label] ? '−' : '+'}
                        </Typography>
                      </ListItemButton>
                      <Collapse
                        in={expandedSections[route.label]}
                        timeout="auto"
                        unmountOnExit
                      >
                        <List component="div" disablePadding>
                          {route.subItems.map((subItem) => (
                            <ListItemButton
                              key={subItem.path}
                              sx={{
                                pl: 4,
                                '&:hover': {
                                  backgroundColor: 'var(--bg-tertiary)',
                                }
                              }}
                              component={Link}
                              href={subItem.path}
                            >
                              <ListItemText
                                primary={subItem.label}
                                sx={{ color: 'var(--text-primary)' }}
                              />
                            </ListItemButton>
                          ))}
                        </List>
                      </Collapse>
                    </div>
                  );
                }

                return (
                  <ListItem key={route.path} disablePadding>
                    <ListItemButton
                      component={Link}
                      href={route.path}
                      sx={{
                        '&:hover': {
                          backgroundColor: 'var(--bg-tertiary)',
                        }
                      }}
                    >
                      <ListItemText
                        primary={route.label}
                        sx={{ color: 'var(--text-primary)' }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
            <Divider sx={{ borderColor: 'var(--border-color)', my: 1 }} />
            <List>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={handleLogout}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'var(--bg-tertiary)',
                    }
                  }}
                >
                  <LogoutIcon sx={{ mr: 2, color: 'var(--text-primary)' }} />
                  <ListItemText
                    primary="Logout"
                    sx={{ color: 'var(--text-primary)' }}
                  />
                </ListItemButton>
              </ListItem>
            </List>
          </Box>
        </Drawer>
      )}
    </>
  );
}
