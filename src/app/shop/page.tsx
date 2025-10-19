'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  ToggleButtonGroup,
  ToggleButton,
  InputAdornment,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import StyleIcon from '@mui/icons-material/Style';
import SortByAlphaIcon from '@mui/icons-material/SortByAlpha';
import SearchIcon from '@mui/icons-material/Search';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { getShopSets, purchaseSet, getWalletBalance, type ShopSet } from './actions';

type SortOption = 'date-desc' | 'date-asc' | 'alpha-asc' | 'alpha-desc';

export default function ShopPage() {
  const [sets, setSets] = useState<ShopSet[]>([]);
  const [nextSessionNumber, setNextSessionNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    fetchShopSets();
    fetchWalletBalance();
  }, []);

  const fetchShopSets = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getShopSets();

      if (result.success && result.sets) {
        setSets(result.sets);
        setNextSessionNumber(result.nextSessionNumber || null);
      } else {
        setError(result.error || 'Failed to load shop sets');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletBalance = async () => {
    try {
      const result = await getWalletBalance();
      if (result.success && result.balance !== undefined) {
        setWalletBalance(result.balance);
      }
    } catch (err) {
      console.error('Failed to fetch wallet balance:', err);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Filter and sort sets based on search query and sort option
  const filteredAndSortedSets = useMemo(() => {
    let filtered = sets;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = sets.filter((set) =>
        set.setName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort based on selected option
    const sorted = [...filtered];
    switch (sortOption) {
      case 'date-desc':
        sorted.sort((a, b) => new Date(b.tcgDate).getTime() - new Date(a.tcgDate).getTime());
        break;
      case 'date-asc':
        sorted.sort((a, b) => new Date(a.tcgDate).getTime() - new Date(b.tcgDate).getTime());
        break;
      case 'alpha-asc':
        sorted.sort((a, b) => a.setName.localeCompare(b.setName));
        break;
      case 'alpha-desc':
        sorted.sort((a, b) => b.setName.localeCompare(a.setName));
        break;
    }

    return sorted;
  }, [sets, searchQuery, sortOption]);

  const handleSortChange = (_event: React.MouseEvent<HTMLElement>, newSort: SortOption | null) => {
    if (newSort !== null) {
      setSortOption(newSort);
    }
  };

  const handlePurchase = async (setId: number) => {
    try {
      setPurchasing(true);
      setPurchaseError(null);

      const result = await purchaseSet(setId);

      if (result.success) {
        // Update wallet balance
        if (result.newBalance !== undefined) {
          setWalletBalance(result.newBalance);
        }
        // Show success dialog
        setDialogOpen(true);
      } else {
        setPurchaseError(result.error || 'Failed to purchase set');
      }
    } catch (err) {
      setPurchaseError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setPurchasing(false);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            color: 'var(--text-bright)',
            fontWeight: 'bold',
            mb: 1,
          }}
        >
          Shop
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: 'var(--text-secondary)', mb: 3 }}
        >
          {nextSessionNumber
            ? `Sets available for purchase for Session #${nextSessionNumber}`
            : 'Browse available sets'}
        </Typography>

        {/* Search and Sort Controls */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            placeholder="Search sets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'var(--text-secondary)' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              flexGrow: 1,
              minWidth: '250px',
              '& .MuiOutlinedInput-root': {
                color: 'var(--text-bright)',
                '& fieldset': {
                  borderColor: 'var(--border-color)',
                },
                '&:hover fieldset': {
                  borderColor: 'var(--text-secondary)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'var(--accent-primary)',
                },
              },
              '& .MuiOutlinedInput-input': {
                '&::placeholder': {
                  color: 'var(--text-secondary)',
                  opacity: 0.7,
                },
              },
            }}
          />

          <ToggleButtonGroup
            value={sortOption}
            exclusive
            onChange={handleSortChange}
            aria-label="sort options"
            sx={{
              '& .MuiToggleButton-root': {
                color: 'rgba(255, 255, 255, 0.7)',
                borderColor: 'rgba(255, 255, 255, 0.23)',
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  borderColor: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                },
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                },
              },
            }}
          >
            <ToggleButton value="date-desc" aria-label="newest first">
              <CalendarMonthIcon sx={{ mr: 1, fontSize: 20 }} />
              Newest
            </ToggleButton>
            <ToggleButton value="date-asc" aria-label="oldest first">
              <CalendarMonthIcon sx={{ mr: 1, fontSize: 20 }} />
              Oldest
            </ToggleButton>
            <ToggleButton value="alpha-asc" aria-label="alphabetical a-z">
              <SortByAlphaIcon sx={{ mr: 1, fontSize: 20 }} />
              A-Z
            </ToggleButton>
            <ToggleButton value="alpha-desc" aria-label="alphabetical z-a">
              <SortByAlphaIcon sx={{ mr: 1, fontSize: 20, transform: 'rotate(180deg)' }} />
              Z-A
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {filteredAndSortedSets.length === 0 ? (
        <Paper
          sx={{
            p: 4,
            textAlign: 'center',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
          }}
        >
          <Typography sx={{ color: 'var(--text-secondary)' }}>
            {searchQuery.trim()
              ? `No sets found matching "${searchQuery}"`
              : 'No sets are currently available for purchase.'}
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {filteredAndSortedSets.map((set) => (
            <Card
              key={set.id}
              sx={{
                width: '280px',
                height: '250px',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
                  borderColor: 'var(--accent-primary)',
                },
              }}
            >
              <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 3, height: '100%' }}>
                <Typography
                  variant="h6"
                  component="h2"
                  sx={{
                    color: 'var(--text-bright)',
                    fontWeight: 'bold',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    hyphens: 'auto',
                  }}
                >
                  {set.setName}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={set.setCode}
                    size="small"
                    sx={{
                      backgroundColor: 'var(--accent-primary)',
                      color: 'var(--text-bright)',
                      fontWeight: 'bold',
                      fontFamily: 'monospace',
                    }}
                  />
                  <Chip
                    icon={<StyleIcon sx={{ color: 'var(--text-bright) !important' }} />}
                    label={`${set.numOfCards} cards`}
                    size="small"
                    sx={{
                      backgroundColor: 'var(--bg-tertiary)',
                      color: 'var(--text-bright)',
                      '& .MuiChip-icon': {
                        color: 'var(--text-bright)',
                      },
                    }}
                  />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarMonthIcon
                    sx={{
                      fontSize: 18,
                      color: 'var(--text-secondary)',
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{ color: 'var(--text-secondary)' }}
                  >
                    {formatDate(set.tcgDate)}
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => handlePurchase(set.id)}
                  disabled={purchasing}
                  startIcon={<ShoppingCartIcon />}
                  sx={{
                    mt: 'auto',
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      backgroundColor: 'var(--hover-light-grey)',
                      color: 'var(--text-bright)',
                    },
                    '&:disabled': {
                      backgroundColor: 'var(--bg-tertiary)',
                      color: 'var(--text-secondary)',
                    },
                  }}
                >
                  Purchase (4 pts)
                </Button>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Purchase Error Alert */}
      {purchaseError && (
        <Alert severity="error" sx={{ mt: 3 }} onClose={() => setPurchaseError(null)}>
          {purchaseError}
        </Alert>
      )}

      {/* Success Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        PaperProps={{
          sx: {
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
          },
        }}
      >
        <DialogTitle sx={{ color: 'var(--text-bright)' }}>
          Purchase Successful!
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'var(--text-primary)' }}>
            Now open the set on ygoprog.com
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseDialog}
            sx={{
              color: 'var(--text-bright)',
              '&:hover': {
                backgroundColor: 'var(--bg-tertiary)',
              },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Wallet Display */}
      {walletBalance !== null && (
        <Paper
          elevation={4}
          sx={{
            position: 'fixed',
            top: 100,
            right: 24,
            p: 2,
            backgroundColor: 'var(--bg-secondary)',
            border: '2px solid var(--accent-primary)',
            borderRadius: 2,
            minWidth: 150,
            zIndex: 1000,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
            <AccountBalanceWalletIcon sx={{ color: 'var(--accent-primary)', fontSize: 28 }} />
            <Box>
              <Typography
                variant="caption"
                sx={{
                  color: 'var(--text-secondary)',
                  display: 'block',
                  lineHeight: 1,
                }}
              >
                Wallet
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  color: 'var(--text-bright)',
                  fontWeight: 'bold',
                  lineHeight: 1.2,
                }}
              >
                {walletBalance}
              </Typography>
            </Box>
          </Box>
        </Paper>
      )}
    </Container>
  );
}
