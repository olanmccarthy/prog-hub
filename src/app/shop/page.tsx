'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import {
  Container,
  Paper,
  Typography,
  Box,
  Card,
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
  FormControlLabel,
  Checkbox,
  Divider,
  IconButton,
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SortByAlphaIcon from '@mui/icons-material/SortByAlpha';
import SearchIcon from '@mui/icons-material/Search';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import BlockIcon from '@mui/icons-material/Block';
import ImageIcon from '@mui/icons-material/Image';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { getShopSets, purchaseSet, getWalletBalance, type ShopSet } from './actions';

type SortOption = 'date-desc' | 'date-asc' | 'alpha-asc' | 'alpha-desc';

export default function ShopPage() {
  const [sets, setSets] = useState<ShopSet[]>([]);
  const [nextSessionNumber, setNextSessionNumber] = useState<number | null>(null);
  const [nextSessionDate, setNextSessionDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('date-asc');
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  useEffect(() => {
    fetchShopSets();
    fetchWalletBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showUnavailable]);

  const fetchShopSets = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getShopSets(showUnavailable);

      if (result.success && result.sets) {
        setSets(result.sets);
        setNextSessionNumber(result.nextSessionNumber || null);
        setNextSessionDate(result.nextSessionDate || null);
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

  // Check if a set is currently available for purchase
  const isSetAvailable = (set: ShopSet): boolean => {
    if (!nextSessionDate) return true;
    return new Date(set.tcgDate) <= new Date(nextSessionDate);
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

  const getQuantity = (setId: number): number => {
    return quantities[setId] || 1;
  };

  const setQuantity = (setId: number, value: number) => {
    const validValue = Math.max(1, Math.min(100, Math.floor(value)));
    setQuantities(prev => ({ ...prev, [setId]: validValue }));
  };

  const handlePurchase = async (setId: number) => {
    try {
      setPurchasing(true);
      setPurchaseError(null);

      const quantity = getQuantity(setId);
      const result = await purchaseSet(setId, quantity);

      if (result.success) {
        // Update wallet balance
        if (result.newBalance !== undefined) {
          setWalletBalance(result.newBalance);
        }
        // Reset quantity for this set
        setQuantities(prev => ({ ...prev, [setId]: 1 }));
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
      <Container maxWidth={false} sx={{ mt: 4, px: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth={false} sx={{ mt: 4, mb: 4, px: 3 }}>
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

          <FormControlLabel
            control={
              <Checkbox
                checked={showUnavailable}
                onChange={(e) => setShowUnavailable(e.target.checked)}
                sx={{
                  color: 'var(--text-secondary)',
                  '&.Mui-checked': {
                    color: 'var(--accent-primary)',
                  },
                }}
              />
            }
            label="Show unavailable sets"
            sx={{
              color: 'var(--text-primary)',
              '& .MuiFormControlLabel-label': {
                fontSize: '0.875rem',
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
        <>
          {/* Group sets by availability and session */}
          {(() => {
            // Separate available and unavailable sets
            const availableSets = filteredAndSortedSets.filter(set => isSetAvailable(set));
            const unavailableSets = filteredAndSortedSets.filter(set => !isSetAvailable(set) && set.sessionNumber !== null);

            // Group unavailable sets by session (exclude sets without a session)
            const sessionGroups = unavailableSets.reduce((groups, set) => {
              const key = set.sessionNumber!; // We know it's not null because we filtered above
              if (!groups[key]) {
                groups[key] = {
                  sessionNumber: set.sessionNumber,
                  sessionName: set.sessionName,
                  sets: [],
                };
              }
              groups[key].sets.push(set);
              return groups;
            }, {} as Record<number, { sessionNumber: number | null; sessionName: string | null; sets: ShopSet[] }>);

            // Sort session groups by session number
            const sortedSessionGroups = Object.values(sessionGroups).sort(
              (a, b) => (a.sessionNumber || 0) - (b.sessionNumber || 0)
            );

            return (
              <>
                {/* Available Sets */}
                {availableSets.length > 0 && (
                  <Box sx={{ width: '100%' }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                      {availableSets.map((set) => (
                        <Card
                          key={set.id}
                          sx={{
                            width: '220px',
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
                          {/* Set Image with Overlays - 100:183 ratio */}
                          <Box
                            component="a"
                            href={`https://ygoprodeck.com/pack/${encodeURIComponent(set.setName)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              position: 'relative',
                              width: '100%',
                              height: '403px', // 220 * 1.83
                              backgroundColor: 'var(--bg-tertiary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                              cursor: 'pointer',
                              textDecoration: 'none',
                            }}
                          >
                            {set.setImage ? (
                              <Image
                                src={set.setImage}
                                alt={set.setName}
                                fill
                                sizes="220px"
                                style={{
                                  objectFit: 'cover',
                                }}
                              />
                            ) : (
                              <ImageIcon
                                sx={{
                                  fontSize: 64,
                                  color: 'var(--text-secondary)',
                                  opacity: 0.3,
                                }}
                              />
                            )}

                            {/* Set Name Overlay at Top */}
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 70%, transparent 100%)',
                                p: 1.5,
                                pt: 1,
                              }}
                            >
                              <Typography
                                variant="subtitle1"
                                sx={{
                                  color: 'var(--text-bright)',
                                  fontWeight: 'bold',
                                  lineHeight: 1.2,
                                  wordWrap: 'break-word',
                                  overflowWrap: 'break-word',
                                  textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                                }}
                              >
                                {set.setName}
                              </Typography>
                            </Box>

                            {/* Set Code and Date at Bottom */}
                            <Box
                              sx={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 70%, transparent 100%)',
                                p: 1.5,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 0.75,
                              }}
                            >
                              <Chip
                                label={set.setCode}
                                size="small"
                                sx={{
                                  backgroundColor: 'var(--accent-primary)',
                                  color: 'var(--text-bright)',
                                  fontWeight: 'bold',
                                  fontFamily: 'monospace',
                                  width: 'fit-content',
                                  height: '22px',
                                }}
                              />
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <CalendarMonthIcon
                                  sx={{
                                    fontSize: 14,
                                    color: 'var(--text-bright)',
                                  }}
                                />
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: 'var(--text-bright)',
                                    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                                  }}
                                >
                                  {formatDate(set.tcgDate)}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>

                          {/* Quantity Selector and Purchase Button */}
                          <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {/* Quantity Controls */}
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                              <IconButton
                                size="small"
                                onClick={() => setQuantity(set.id, getQuantity(set.id) - 1)}
                                disabled={purchasing || getQuantity(set.id) <= 1}
                                sx={{
                                  backgroundColor: 'var(--bg-tertiary)',
                                  color: 'var(--text-bright)',
                                  '&:hover': {
                                    backgroundColor: 'var(--hover-light-grey)',
                                  },
                                  '&:disabled': {
                                    backgroundColor: 'var(--bg-tertiary)',
                                    color: 'var(--text-secondary)',
                                    opacity: 0.5,
                                  },
                                }}
                              >
                                <RemoveIcon fontSize="small" />
                              </IconButton>
                              <TextField
                                value={getQuantity(set.id)}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 1;
                                  setQuantity(set.id, val);
                                }}
                                type="number"
                                size="small"
                                disabled={purchasing}
                                inputProps={{
                                  min: 1,
                                  max: 100,
                                  style: { textAlign: 'center' },
                                }}
                                sx={{
                                  width: '70px',
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
                                  '& input[type=number]::-webkit-inner-spin-button': {
                                    display: 'none',
                                  },
                                  '& input[type=number]::-webkit-outer-spin-button': {
                                    display: 'none',
                                  },
                                }}
                              />
                              <IconButton
                                size="small"
                                onClick={() => setQuantity(set.id, getQuantity(set.id) + 1)}
                                disabled={purchasing || getQuantity(set.id) >= 100}
                                sx={{
                                  backgroundColor: 'var(--bg-tertiary)',
                                  color: 'var(--text-bright)',
                                  '&:hover': {
                                    backgroundColor: 'var(--hover-light-grey)',
                                  },
                                  '&:disabled': {
                                    backgroundColor: 'var(--bg-tertiary)',
                                    color: 'var(--text-secondary)',
                                    opacity: 0.5,
                                  },
                                }}
                              >
                                <AddIcon fontSize="small" />
                              </IconButton>
                            </Box>

                            <Button
                              variant="contained"
                              fullWidth
                              size="small"
                              onClick={() => handlePurchase(set.id)}
                              disabled={purchasing}
                              startIcon={<ShoppingCartIcon />}
                              sx={{
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
                              Purchase ({getQuantity(set.id) * 4} pts)
                            </Button>
                          </Box>
                        </Card>
                      ))}
                    </Box>
                  </Box>
                )}

                {/* Unavailable Sets Grouped by Session */}
                {sortedSessionGroups.map((group, groupIndex) => (
                  <Box key={group.sessionNumber || 'unknown'} sx={{ width: '100%' }}>
                    {/* Session Divider */}
                    {(availableSets.length > 0 || groupIndex > 0) && (
                      <Box sx={{ my: 4 }}>
                        <Divider sx={{ borderColor: 'var(--border-color)', mb: 2 }} />
                        <Typography
                          variant="h5"
                          sx={{
                            color: 'var(--text-bright)',
                            fontWeight: 'bold',
                            mb: 1,
                          }}
                        >
                          {group.sessionName
                            ? `Session #${group.sessionNumber} - ${group.sessionName}`
                            : 'Future Sets'}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            color: 'var(--text-secondary)',
                          }}
                        >
                          Available after Session #{group.sessionNumber}
                        </Typography>
                      </Box>
                    )}

                    {/* Sets in this session */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                      {group.sets.map((set) => (
                        <Card
                          key={set.id}
                          sx={{
                            width: '220px',
                            display: 'flex',
                            flexDirection: 'column',
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                          }}
                        >
              {/* Set Image with Overlays - 100:183 ratio */}
              <Box
                component="a"
                href={`https://ygoprodeck.com/pack/${encodeURIComponent(set.setName)}`}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: '403px', // 220 * 1.83
                  backgroundColor: 'var(--bg-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  textDecoration: 'none',
                }}
              >
                {set.setImage ? (
                  <Image
                    src={set.setImage}
                    alt={set.setName}
                    fill
                    sizes="220px"
                    style={{
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <ImageIcon
                    sx={{
                      fontSize: 64,
                      color: 'var(--text-secondary)',
                      opacity: 0.3,
                    }}
                  />
                )}

                {/* Set Name Overlay at Top */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 70%, transparent 100%)',
                    p: 1.5,
                    pt: 1,
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{
                      color: 'var(--text-bright)',
                      fontWeight: 'bold',
                      lineHeight: 1.2,
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word',
                      textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                    }}
                  >
                    {set.setName}
                  </Typography>
                </Box>

                {/* Set Code and Date at Bottom */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 70%, transparent 100%)',
                    p: 1.5,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.75,
                  }}
                >
                  <Chip
                    label={set.setCode}
                    size="small"
                    sx={{
                      backgroundColor: 'var(--accent-primary)',
                      color: 'var(--text-bright)',
                      fontWeight: 'bold',
                      fontFamily: 'monospace',
                      width: 'fit-content',
                      height: '22px',
                    }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CalendarMonthIcon
                      sx={{
                        fontSize: 14,
                        color: 'var(--text-bright)',
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'var(--text-bright)',
                        textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                      }}
                    >
                      {formatDate(set.tcgDate)}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Purchase Button */}
              <Box sx={{ p: 1.5 }}>
                <Button
                  variant="contained"
                  fullWidth
                  size="small"
                  onClick={() => handlePurchase(set.id)}
                  disabled={true}
                  startIcon={<BlockIcon />}
                  sx={{
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
                  Not Purchasable (4 pts)
                </Button>
              </Box>
            </Card>
                      ))}
                    </Box>
                  </Box>
                ))}
              </>
            );
          })()}
        </>
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
