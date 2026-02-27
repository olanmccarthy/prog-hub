'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  TableCell,
  TableRow,
  IconButton,
  TextField,
  Typography,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import {
  LoadingBox,
  StyledDialog,
  ErrorAlert,
  StyledTable,
  PrimaryButton,
  SecondaryButton,
  DangerButton,
} from '@/src/components';
import {
  getPlayers,
  createPlayer,
  updatePlayer,
  deletePlayer,
  type PlayerData,
} from './actions';

interface PlayerFormData {
  name: string;
  password: string;
  isAdmin: boolean;
}

export default function PlayerListPage() {
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<PlayerData | null>(null);
  const [deletingPlayer, setDeletingPlayer] = useState<PlayerData | null>(null);
  const [formData, setFormData] = useState<PlayerFormData>({
    name: '',
    password: '',
    isAdmin: false,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPlayers();
      setPlayers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch players');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (player?: PlayerData) => {
    if (player) {
      setEditingPlayer(player);
      setFormData({
        name: player.name,
        password: '', // Don't pre-fill password for security
        isAdmin: player.isAdmin,
      });
    } else {
      setEditingPlayer(null);
      setFormData({ name: '', password: '', isAdmin: false });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingPlayer(null);
    setFormData({ name: '', password: '', isAdmin: false });
    setError(null);
  };

  const handleOpenDeleteDialog = (player: PlayerData) => {
    setDeletingPlayer(player);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setDeletingPlayer(null);
    setError(null);
  };

  const handleSubmit = async () => {
    try {
      setError(null);
      setSubmitting(true);

      if (!formData.name) {
        setError('Name is required');
        return;
      }

      if (!editingPlayer && !formData.password) {
        setError('Password is required for new players');
        return;
      }

      if (editingPlayer) {
        // Update existing player
        await updatePlayer({
          id: editingPlayer.id,
          name: formData.name,
          password: formData.password || undefined,
          isAdmin: formData.isAdmin,
        });
      } else {
        // Create new player
        await createPlayer({
          name: formData.name,
          password: formData.password,
          isAdmin: formData.isAdmin,
        });
      }

      await fetchPlayers();
      handleCloseDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save player');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingPlayer) return;

    try {
      setError(null);
      setSubmitting(true);
      await deletePlayer(deletingPlayer.id);
      await fetchPlayers();
      handleCloseDeleteDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete player');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingBox minHeight="400px" />;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant="h4" sx={{ color: 'var(--text-bright)' }}>
          Player Management
        </Typography>
        <PrimaryButton
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Player
        </PrimaryButton>
      </Box>

      {!openDialog && !openDeleteDialog && (
        <ErrorAlert message={error} onClose={() => setError(null)} />
      )}

      <StyledTable
        columns={[
          { label: 'Name', align: 'left' },
          { label: 'Admin', align: 'left' },
          { label: 'Actions', align: 'right' },
        ]}
        isEmpty={players.length === 0}
        emptyMessage="No players found. Add your first player to get started."
      >
        {players.map((player) => (
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
                  <TableCell sx={{ color: 'var(--text-primary)' }}>
                    {player.isAdmin ? 'Yes' : 'No'}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      onClick={() => handleOpenDialog(player)}
                      sx={{
                        color: 'var(--text-primary)',
                        '&:hover': {
                          color: 'var(--accent-primary)',
                        },
                      }}
                      title="Edit player"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleOpenDeleteDialog(player)}
                      sx={{
                        color: 'var(--text-primary)',
                        '&:hover': {
                          color: '#ff4444',
                        },
                      }}
                      title="Delete player"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
        }
      </StyledTable>

      {/* Add/Edit Dialog */}
      <StyledDialog
        open={openDialog}
        onClose={handleCloseDialog}
        title={editingPlayer ? 'Edit Player' : 'Add New Player'}
        actions={
          <>
            <SecondaryButton onClick={handleCloseDialog} disabled={submitting}>
              Cancel
            </SecondaryButton>
            <PrimaryButton onClick={handleSubmit} disabled={submitting}>
              {editingPlayer ? 'Update' : 'Create'}
            </PrimaryButton>
          </>
        }
      >
        <ErrorAlert message={error} onClose={() => setError(null)} />
          <TextField
            autoFocus
            margin="dense"
            label="Player Name"
            type="text"
            fullWidth
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            disabled={submitting}
            sx={{
              mb: 2,
              '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
              '& .MuiInputBase-input': { color: 'var(--text-primary)' },
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'var(--border-color)' },
                '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
              },
            }}
          />
          <TextField
            margin="dense"
            label={editingPlayer ? 'New Password (leave blank to keep current)' : 'Password'}
            type="password"
            fullWidth
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            disabled={submitting}
            sx={{
              mb: 2,
              '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
              '& .MuiInputBase-input': { color: 'var(--text-primary)' },
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'var(--border-color)' },
                '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
              },
            }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.isAdmin}
                onChange={(e) => setFormData({ ...formData, isAdmin: e.target.checked })}
                disabled={submitting}
                sx={{
                  color: 'var(--text-secondary)',
                  '&.Mui-checked': { color: 'var(--accent-primary)' },
                }}
              />
            }
            label="Admin"
            sx={{ color: 'var(--text-primary)' }}
          />
      </StyledDialog>

      {/* Delete Confirmation Dialog */}
      <StyledDialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
        title="Confirm Delete"
        actions={
          <>
            <SecondaryButton onClick={handleCloseDeleteDialog} disabled={submitting}>
              Cancel
            </SecondaryButton>
            <DangerButton onClick={handleDelete} disabled={submitting}>
              Delete
            </DangerButton>
          </>
        }
      >
        <ErrorAlert message={error} onClose={() => setError(null)} />
        <Typography sx={{ color: 'var(--text-primary)' }}>
          Are you sure you want to delete player &quot;{deletingPlayer?.name}&quot;?
          This action cannot be undone.
        </Typography>
      </StyledDialog>
    </Box>
  );
}
