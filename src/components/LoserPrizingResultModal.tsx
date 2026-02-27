'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
} from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface LoserPrizingResultModalProps {
  open: boolean;
  onClose: () => void;
  onSpinAgain: () => void;
  onApply: (targetPlayerId?: number, investmentAmount?: number, vendorAction?: 'sell' | 'buyback') => Promise<void>;
  result: {
    id: number;
    name: string;
    description: string;
    automationType: string | null;
    requiresPlayerSelection: boolean;
    requiresInput: boolean;
    allowsRespin: boolean;
  } | null;
  players?: Array<{ id: number; name: string }>;
  playerWalletBalance?: number;
}

export default function LoserPrizingResultModal({
  open,
  onClose,
  onSpinAgain,
  onApply,
  result,
  players = [],
  playerWalletBalance = 0,
}: LoserPrizingResultModalProps) {
  const [targetPlayerId, setTargetPlayerId] = useState<number | undefined>();
  const [investmentAmount, setInvestmentAmount] = useState<number>(1);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens with new result
  useEffect(() => {
    if (open && result) {
      setTargetPlayerId(undefined);
      setInvestmentAmount(1);
      setError(null);
    }
  }, [open, result]);

  if (!result) return null;

  const handleApply = async (vendorAction?: 'sell' | 'buyback') => {
    try {
      setError(null);
      setApplying(true);

      // Validate required fields
      if (result.requiresPlayerSelection && !targetPlayerId) {
        setError('Please select a target player');
        return;
      }

      if (result.requiresInput && (!investmentAmount || investmentAmount < 1)) {
        setError('Please enter a valid investment amount (1-10)');
        return;
      }

      await onApply(targetPlayerId, investmentAmount, vendorAction);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply result');
    } finally {
      setApplying(false);
    }
  };

  const isManual = result.automationType === 'MANUAL';
  const isVendorEntry = result.name === 'Selling to a Vendor after the Event';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
        },
      }}
    >
      <DialogTitle sx={{ color: 'var(--text-bright)' }}>
        {result.name}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography sx={{ color: 'var(--text-secondary)' }}>
            {result.description}
          </Typography>

          {isManual && (
            <Alert severity="info">
              This prize requires manual enforcement. Please handle this outside the system.
            </Alert>
          )}

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Player Selection */}
          {result.requiresPlayerSelection && !isManual && (
            <FormControl fullWidth>
              <InputLabel sx={{ color: 'var(--text-secondary)' }}>
                Select Target Player
              </InputLabel>
              <Select
                value={targetPlayerId || ''}
                onChange={(e) => setTargetPlayerId(Number(e.target.value))}
                label="Select Target Player"
                sx={{
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-bright)',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'var(--input-border)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'var(--accent-primary)',
                  },
                }}
              >
                {players.map((player) => (
                  <MenuItem key={player.id} value={player.id}>
                    {player.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Investment Amount Input */}
          {result.requiresInput && result.name === 'The Market is Going to go Up' && !isManual && (
            <TextField
              fullWidth
              type="number"
              label="Investment Amount (1-10)"
              value={investmentAmount}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) {
                  setInvestmentAmount(Math.max(1, Math.min(10, val)));
                }
              }}
              inputProps={{ min: 1, max: 10 }}
              sx={{
                '& .MuiInputBase-root': {
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-bright)',
                },
                '& .MuiInputLabel-root': {
                  color: 'var(--text-secondary)',
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'var(--input-border)',
                },
              }}
            />
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          onClick={onClose}
          sx={{
            color: 'var(--text-secondary)',
            '&:hover': {
              backgroundColor: 'var(--hover-light-grey)',
            },
          }}
        >
          Close
        </Button>

        {!isManual && !isVendorEntry && (
          <Button
            onClick={() => handleApply()}
            variant="contained"
            disabled={applying}
            startIcon={applying ? null : <CheckCircleIcon />}
            sx={{
              backgroundColor: 'var(--accent-primary)',
              '&:hover': {
                backgroundColor: 'var(--accent-blue-hover)',
              },
            }}
          >
            {applying ? 'Applying...' : 'Apply Result'}
          </Button>
        )}

        {!isManual && isVendorEntry && (
          <>
            <Button
              onClick={() => handleApply('sell')}
              variant="contained"
              disabled={applying}
              startIcon={applying ? null : <CheckCircleIcon />}
              sx={{
                backgroundColor: '#4caf50',
                '&:hover': {
                  backgroundColor: '#45a049',
                },
              }}
            >
              {applying ? 'Applying...' : 'Sell The Card (+1 point)'}
            </Button>
            <Button
              onClick={() => handleApply('buyback')}
              variant="contained"
              disabled={applying || playerWalletBalance <= 1}
              startIcon={applying ? null : <CheckCircleIcon />}
              sx={{
                backgroundColor: '#f44336',
                '&:hover': {
                  backgroundColor: '#d32f2f',
                },
                '&:disabled': {
                  backgroundColor: 'var(--grey-300)',
                  color: 'var(--text-secondary)',
                },
              }}
            >
              {applying ? 'Applying...' : playerWalletBalance <= 1 ? 'Buy It Back (Insufficient Points)' : 'Buy It Back (-3 points)'}
            </Button>
          </>
        )}

        {result.allowsRespin && (
          <Button
            onClick={onSpinAgain}
            variant="outlined"
            startIcon={<CasinoIcon />}
            sx={{
              borderColor: 'var(--accent-primary)',
              color: 'var(--accent-primary)',
              '&:hover': {
                borderColor: 'var(--accent-blue-hover)',
                backgroundColor: 'var(--hover-light-grey)',
              },
            }}
          >
            Re-spin
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
