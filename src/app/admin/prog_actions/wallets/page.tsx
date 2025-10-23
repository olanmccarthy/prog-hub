'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Alert,
  CircularProgress,
  IconButton,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import CancelIcon from '@mui/icons-material/Cancel';
import { getWalletEditorData, updateWalletValue, WalletEditorData, PlayerWalletData } from './actions';

export default function WalletEditorPage() {
  const [data, setData] = useState<WalletEditorData | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getWalletEditorData();

      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to load data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (player: PlayerWalletData) => {
    setEditingId(player.walletId);
    setEditValue(player.walletAmount.toString());
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleSave = async (walletId: number) => {
    const newAmount = parseInt(editValue);
    if (isNaN(newAmount) || newAmount < 0) {
      setError('Please enter a valid non-negative number');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const result = await updateWalletValue(walletId, newAmount, data?.activeSessionId || null);

      if (result.success) {
        setSuccess('Wallet updated successfully');
        setEditingId(null);
        setEditValue('');
        await fetchData();
      } else {
        setError(result.error || 'Failed to update wallet');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, color: 'var(--text-bright)' }}>
        Edit Wallet Values
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {data?.activeSessionNumber && (
        <Typography variant="body2" sx={{ mb: 2, color: 'var(--text-secondary)' }}>
          Active Session: {data.activeSessionNumber}
        </Typography>
      )}

      <TableContainer
        component={Paper}
        sx={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }}>
                Player Name
              </TableCell>
              <TableCell sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }} align="right">
                Wallet Balance
              </TableCell>
              <TableCell sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }} align="right">
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.players.map((player) => (
              <TableRow
                key={player.id}
                sx={{
                  '&:hover': {
                    backgroundColor: 'var(--bg-tertiary)',
                  },
                }}
              >
                <TableCell sx={{ color: 'var(--text-primary)' }}>
                  {player.name}
                </TableCell>
                <TableCell align="right">
                  {editingId === player.walletId ? (
                    <TextField
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      size="small"
                      autoFocus
                      sx={{
                        width: '120px',
                        '& input': {
                          color: 'var(--text-primary)',
                          textAlign: 'right',
                        },
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'var(--input-bg)',
                          '& fieldset': {
                            borderColor: 'var(--input-border)',
                          },
                        },
                      }}
                    />
                  ) : (
                    <Typography sx={{ color: 'var(--text-primary)' }}>
                      {player.walletAmount}
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">
                  {editingId === player.walletId ? (
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <IconButton
                        size="small"
                        onClick={() => handleSave(player.walletId)}
                        disabled={saving}
                        sx={{
                          color: 'var(--success)',
                          '&:hover': {
                            backgroundColor: 'var(--bg-tertiary)',
                          },
                        }}
                      >
                        {saving ? <CircularProgress size={20} /> : <SaveIcon />}
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={cancelEditing}
                        disabled={saving}
                        sx={{
                          color: 'var(--error)',
                          '&:hover': {
                            backgroundColor: 'var(--bg-tertiary)',
                          },
                        }}
                      >
                        <CancelIcon />
                      </IconButton>
                    </Box>
                  ) : (
                    <IconButton
                      size="small"
                      onClick={() => startEditing(player)}
                      sx={{
                        color: 'var(--accent-primary)',
                        '&:hover': {
                          backgroundColor: 'var(--bg-tertiary)',
                        },
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
