'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TableCell,
  TableRow,
  IconButton,
  TextField,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
  LoadingBox,
  StyledDialog,
  ErrorAlert,
  SuccessAlert,
  StyledTable,
  PrimaryButton,
  SecondaryButton,
} from '@/src/components';
import {
  getWalletPointBreakdowns,
  createWalletPointBreakdown,
  updateWalletPointBreakdown,
  deleteWalletPointBreakdown,
  setActiveBreakdown,
  type WalletPointBreakdown,
  type CreateBreakdownInput,
} from './actions';

export default function WalletBreakdownPage() {
  const [breakdowns, setBreakdowns] = useState<WalletPointBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CreateBreakdownInput>({
    name: '',
    first: 0,
    second: 0,
    third: 0,
    fourth: 0,
    fifth: 0,
    sixth: 0,
  });

  useEffect(() => {
    loadBreakdowns();
  }, []);

  const loadBreakdowns = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getWalletPointBreakdowns();
      if (result.success && result.breakdowns) {
        setBreakdowns(result.breakdowns);
      } else {
        setError(result.error || 'Failed to load breakdowns');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load breakdowns');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (breakdown?: WalletPointBreakdown) => {
    if (breakdown) {
      setEditingId(breakdown.id);
      setFormData({
        name: breakdown.name,
        first: breakdown.first,
        second: breakdown.second,
        third: breakdown.third,
        fourth: breakdown.fourth,
        fifth: breakdown.fifth,
        sixth: breakdown.sixth,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        first: 0,
        second: 0,
        third: 0,
        fourth: 0,
        fifth: 0,
        sixth: 0,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    try {
      setError(null);
      setSuccess(null);

      const result = editingId
        ? await updateWalletPointBreakdown(editingId, formData)
        : await createWalletPointBreakdown(formData);

      if (result.success) {
        setSuccess(editingId ? 'Breakdown updated successfully' : 'Breakdown created successfully');
        handleCloseDialog();
        await loadBreakdowns();
      } else {
        setError(result.error || 'Operation failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this breakdown?')) return;

    try {
      setError(null);
      setSuccess(null);
      const result = await deleteWalletPointBreakdown(id);

      if (result.success) {
        setSuccess('Breakdown deleted successfully');
        await loadBreakdowns();
      } else {
        setError(result.error || 'Failed to delete breakdown');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete breakdown');
    }
  };

  const handleSetActive = async (id: number) => {
    try {
      setError(null);
      setSuccess(null);
      const result = await setActiveBreakdown(id);

      if (result.success) {
        setSuccess('Active breakdown updated successfully');
        await loadBreakdowns();
      } else {
        setError(result.error || 'Failed to set active breakdown');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set active breakdown');
    }
  };

  if (loading) {
    return <LoadingBox minHeight="400px" />;
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'var(--text-bright)' }}>
          Wallet Point Breakdowns
        </Typography>
        <PrimaryButton
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Create New Breakdown
        </PrimaryButton>
      </Box>

      <ErrorAlert message={error} onClose={() => setError(null)} />
      <SuccessAlert message={success} onClose={() => setSuccess(null)} />

      <StyledTable
        columns={[
          { label: 'Name', align: 'left' },
          { label: '1st Place', align: 'center' },
          { label: '2nd Place', align: 'center' },
          { label: '3rd Place', align: 'center' },
          { label: '4th Place', align: 'center' },
          { label: '5th Place', align: 'center' },
          { label: '6th Place', align: 'center' },
          { label: 'Status', align: 'center' },
          { label: 'Actions', align: 'center' },
        ]}
        isEmpty={breakdowns.length === 0}
        emptyMessage="No breakdowns configured. Create one to get started."
      >
        {breakdowns.length > 0 && (
              breakdowns.map((breakdown) => (
                <TableRow key={breakdown.id}>
                  <TableCell sx={{ color: 'var(--text-primary)' }}>{breakdown.name}</TableCell>
                  <TableCell sx={{ color: 'var(--text-primary)' }} align="center">
                    {breakdown.first}
                  </TableCell>
                  <TableCell sx={{ color: 'var(--text-primary)' }} align="center">
                    {breakdown.second}
                  </TableCell>
                  <TableCell sx={{ color: 'var(--text-primary)' }} align="center">
                    {breakdown.third}
                  </TableCell>
                  <TableCell sx={{ color: 'var(--text-primary)' }} align="center">
                    {breakdown.fourth}
                  </TableCell>
                  <TableCell sx={{ color: 'var(--text-primary)' }} align="center">
                    {breakdown.fifth}
                  </TableCell>
                  <TableCell sx={{ color: 'var(--text-primary)' }} align="center">
                    {breakdown.sixth}
                  </TableCell>
                  <TableCell align="center">
                    {breakdown.active ? (
                      <Chip
                        label="Active"
                        color="success"
                        size="small"
                        icon={<CheckCircleIcon />}
                      />
                    ) : (
                      <SecondaryButton
                        size="small"
                        onClick={() => handleSetActive(breakdown.id)}
                      >
                        Set Active
                      </SecondaryButton>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      onClick={() => handleOpenDialog(breakdown)}
                      sx={{
                        color: 'var(--accent-primary)',
                        '&:hover': {
                          backgroundColor: 'var(--bg-tertiary)',
                        },
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDelete(breakdown.id)}
                      disabled={breakdown.active}
                      sx={{
                        color: breakdown.active ? 'var(--text-secondary)' : 'var(--error)',
                        '&:hover': {
                          backgroundColor: 'var(--bg-tertiary)',
                        },
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
        )}
      </StyledTable>

      {/* Create/Edit Dialog */}
      <StyledDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        title={editingId ? 'Edit Breakdown' : 'Create New Breakdown'}
        maxWidth="sm"
        actions={
          <>
            <SecondaryButton onClick={handleCloseDialog}>
              Cancel
            </SecondaryButton>
            <PrimaryButton onClick={handleSubmit}>
              {editingId ? 'Update' : 'Create'}
            </PrimaryButton>
          </>
        }
      >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
              sx={{
                '& .MuiInputBase-root': {
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--input-bg)',
                },
                '& .MuiInputLabel-root': {
                  color: 'var(--text-secondary)',
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'var(--input-border)',
                },
              }}
            />
            <TextField
              label="1st Place Points"
              type="number"
              value={formData.first}
              onChange={(e) => setFormData({ ...formData, first: parseInt(e.target.value) || 0 })}
              fullWidth
              required
              sx={{
                '& .MuiInputBase-root': {
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--input-bg)',
                },
                '& .MuiInputLabel-root': {
                  color: 'var(--text-secondary)',
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'var(--input-border)',
                },
              }}
            />
            <TextField
              label="2nd Place Points"
              type="number"
              value={formData.second}
              onChange={(e) => setFormData({ ...formData, second: parseInt(e.target.value) || 0 })}
              fullWidth
              required
              sx={{
                '& .MuiInputBase-root': {
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--input-bg)',
                },
                '& .MuiInputLabel-root': {
                  color: 'var(--text-secondary)',
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'var(--input-border)',
                },
              }}
            />
            <TextField
              label="3rd Place Points"
              type="number"
              value={formData.third}
              onChange={(e) => setFormData({ ...formData, third: parseInt(e.target.value) || 0 })}
              fullWidth
              required
              sx={{
                '& .MuiInputBase-root': {
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--input-bg)',
                },
                '& .MuiInputLabel-root': {
                  color: 'var(--text-secondary)',
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'var(--input-border)',
                },
              }}
            />
            <TextField
              label="4th Place Points"
              type="number"
              value={formData.fourth}
              onChange={(e) => setFormData({ ...formData, fourth: parseInt(e.target.value) || 0 })}
              fullWidth
              required
              sx={{
                '& .MuiInputBase-root': {
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--input-bg)',
                },
                '& .MuiInputLabel-root': {
                  color: 'var(--text-secondary)',
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'var(--input-border)',
                },
              }}
            />
            <TextField
              label="5th Place Points"
              type="number"
              value={formData.fifth}
              onChange={(e) => setFormData({ ...formData, fifth: parseInt(e.target.value) || 0 })}
              fullWidth
              required
              sx={{
                '& .MuiInputBase-root': {
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--input-bg)',
                },
                '& .MuiInputLabel-root': {
                  color: 'var(--text-secondary)',
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'var(--input-border)',
                },
              }}
            />
            <TextField
              label="6th Place Points"
              type="number"
              value={formData.sixth}
              onChange={(e) => setFormData({ ...formData, sixth: parseInt(e.target.value) || 0 })}
              fullWidth
              required
              helperText="6th place will receive 0 points if someone takes the Victory Point"
              sx={{
                '& .MuiInputBase-root': {
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--input-bg)',
                },
                '& .MuiInputLabel-root': {
                  color: 'var(--text-secondary)',
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'var(--input-border)',
                },
                '& .MuiFormHelperText-root': {
                  color: 'var(--text-secondary)',
                },
              }}
            />
          </Box>
      </StyledDialog>
    </Box>
  );
}
