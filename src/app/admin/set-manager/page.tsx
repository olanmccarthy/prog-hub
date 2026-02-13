'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Checkbox,
  TextField,
  InputAdornment,
  Paper,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import {
  LoadingBox,
  StyledDialog,
  ErrorAlert,
  PrimaryButton,
  SecondaryButton,
} from '@/src/components';
import { getAllSets, updateSetBooleans, updateSetPrice, createSet, updateSet, type SetData } from './actions';

export default function SetManagerPage() {
  const [sets, setSets] = useState<SetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingSetId, setUpdatingSetId] = useState<number | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newSet, setNewSet] = useState({
    setName: '',
    setCode: '',
    numOfCards: 0,
    tcgDate: '',
    setImage: '',
    isASession: false,
    isPurchasable: true,
    isPromo: false,
    useDBImage: false,
    price: 4,
  });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingSet, setEditingSet] = useState<SetData | null>(null);

  useEffect(() => {
    fetchSets();
  }, []);

  const fetchSets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllSets();
      setSets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sets');
    } finally {
      setLoading(false);
    }
  };

  const filteredSets = useMemo(() => {
    if (!searchQuery.trim()) {
      return sets;
    }

    const query = searchQuery.toLowerCase();
    return sets.filter(
      (set) =>
        set.setName.toLowerCase().includes(query) ||
        set.setCode.toLowerCase().includes(query)
    );
  }, [sets, searchQuery]);

  const handleBooleanUpdate = async (
    setId: number,
    field: 'isASession' | 'isPurchasable' | 'isPromo' | 'useDBImage',
    value: boolean
  ) => {
    try {
      setUpdatingSetId(setId);
      setError(null);

      const set = sets.find((s) => s.id === setId);
      if (!set) return;

      await updateSetBooleans({
        id: setId,
        isASession: field === 'isASession' ? value : set.isASession,
        isPurchasable: field === 'isPurchasable' ? value : set.isPurchasable,
        isPromo: field === 'isPromo' ? value : set.isPromo,
        useDBImage: field === 'useDBImage' ? value : set.useDBImage,
      });

      // Update local state
      setSets((prevSets) =>
        prevSets.map((s) =>
          s.id === setId ? { ...s, [field]: value } : s
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update set');
    } finally {
      setUpdatingSetId(null);
    }
  };

  const handlePriceUpdate = async (setId: number, newPrice: string) => {
    try {
      const price = parseInt(newPrice, 10);
      if (isNaN(price) || price < 0) {
        setError('Price must be a non-negative number');
        return;
      }

      setUpdatingSetId(setId);
      setError(null);

      await updateSetPrice({ id: setId, price });

      // Update local state
      setSets((prevSets) =>
        prevSets.map((s) =>
          s.id === setId ? { ...s, price } : s
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update price');
    } finally {
      setUpdatingSetId(null);
    }
  };

  const handleCreateSet = async () => {
    try {
      setCreating(true);
      setError(null);

      // Validate required fields with specific messages
      if (!newSet.setName?.trim()) {
        setError('Set name is required');
        return;
      }
      if (!newSet.setCode?.trim()) {
        setError('Set code is required');
        return;
      }
      if (!newSet.numOfCards || newSet.numOfCards <= 0) {
        setError('Number of cards must be at least 1');
        return;
      }
      if (!newSet.tcgDate) {
        setError('TCG release date is required');
        return;
      }
      if (newSet.price < 0) {
        setError('Price cannot be negative');
        return;
      }

      const createdSet = await createSet({
        setName: newSet.setName,
        setCode: newSet.setCode,
        numOfCards: newSet.numOfCards,
        tcgDate: newSet.tcgDate,
        setImage: newSet.setImage || undefined,
        isASession: newSet.isASession,
        isPurchasable: newSet.isPurchasable,
        isPromo: newSet.isPromo,
        useDBImage: newSet.useDBImage,
        price: newSet.price,
      });

      // Add to local state
      setSets((prevSets) => [...prevSets, createdSet].sort((a, b) =>
        new Date(a.tcgDate).getTime() - new Date(b.tcgDate).getTime()
      ));

      // Reset form and close dialog
      setNewSet({
        setName: '',
        setCode: '',
        numOfCards: 0,
        tcgDate: '',
        setImage: '',
        isASession: false,
        isPurchasable: true,
        isPromo: false,
        useDBImage: false,
        price: 4,
      });
      setCreateDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create set');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEditDialog = (set: SetData) => {
    setEditingSet(set);
    setEditDialogOpen(true);
  };

  const handleUpdateSet = async () => {
    if (!editingSet) return;

    try {
      setEditing(true);
      setError(null);

      // Validate required fields with specific messages
      if (!editingSet.setName?.trim()) {
        setError('Set name is required');
        return;
      }
      if (!editingSet.setCode?.trim()) {
        setError('Set code is required');
        return;
      }
      if (!editingSet.numOfCards || editingSet.numOfCards <= 0) {
        setError('Number of cards must be at least 1');
        return;
      }
      if (!editingSet.tcgDate) {
        setError('TCG release date is required');
        return;
      }
      if (editingSet.price < 0) {
        setError('Price cannot be negative');
        return;
      }

      const updatedSet = await updateSet({
        id: editingSet.id,
        setName: editingSet.setName,
        setCode: editingSet.setCode,
        numOfCards: editingSet.numOfCards,
        tcgDate: typeof editingSet.tcgDate === 'string' ? editingSet.tcgDate : new Date(editingSet.tcgDate).toISOString().split('T')[0],
        setImage: editingSet.setImage || undefined,
        isASession: editingSet.isASession,
        isPurchasable: editingSet.isPurchasable,
        isPromo: editingSet.isPromo,
        useDBImage: editingSet.useDBImage,
        price: editingSet.price,
      });

      // Update local state
      setSets((prevSets) =>
        prevSets.map((s) => (s.id === updatedSet.id ? updatedSet : s)).sort((a, b) =>
          new Date(a.tcgDate).getTime() - new Date(b.tcgDate).getTime()
        )
      );

      // Close dialog
      setEditDialogOpen(false);
      setEditingSet(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update set');
    } finally {
      setEditing(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Typography variant="h4" sx={{ color: 'var(--text-bright)' }}>
          Set Manager
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Search by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{
              minWidth: '300px',
              '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
              '& .MuiInputBase-input': { color: 'var(--text-primary)' },
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'var(--border-color)' },
                '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'var(--text-secondary)' }} />
                </InputAdornment>
              ),
            }}
          />
          <PrimaryButton
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Add New Set
          </PrimaryButton>
        </Box>
      </Box>

      <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 2 }}>
        Showing {filteredSets.length} of {sets.length} sets
      </Typography>

      <ErrorAlert message={error} onClose={() => setError(null)} />

      <TableContainer
        component={Paper}
        sx={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          maxHeight: 'calc(100vh - 280px)',
        }}
      >
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: 'var(--text-bright)', fontWeight: 'bold', backgroundColor: 'var(--bg-secondary)' }}>
                Set Name
              </TableCell>
              <TableCell sx={{ color: 'var(--text-bright)', fontWeight: 'bold', backgroundColor: 'var(--bg-secondary)' }}>
                Set Code
              </TableCell>
              <TableCell sx={{ color: 'var(--text-bright)', fontWeight: 'bold', backgroundColor: 'var(--bg-secondary)' }}>
                TCG Date
              </TableCell>
              <TableCell align="center" sx={{ color: 'var(--text-bright)', fontWeight: 'bold', backgroundColor: 'var(--bg-secondary)' }}>
                Price
              </TableCell>
              <TableCell align="center" sx={{ color: 'var(--text-bright)', fontWeight: 'bold', backgroundColor: 'var(--bg-secondary)' }}>
                Is a Session
              </TableCell>
              <TableCell align="center" sx={{ color: 'var(--text-bright)', fontWeight: 'bold', backgroundColor: 'var(--bg-secondary)' }}>
                Is Purchasable
              </TableCell>
              <TableCell align="center" sx={{ color: 'var(--text-bright)', fontWeight: 'bold', backgroundColor: 'var(--bg-secondary)' }}>
                Is a Promo
              </TableCell>
              <TableCell align="center" sx={{ color: 'var(--text-bright)', fontWeight: 'bold', backgroundColor: 'var(--bg-secondary)' }}>
                Use DB Image
              </TableCell>
              <TableCell align="center" sx={{ color: 'var(--text-bright)', fontWeight: 'bold', backgroundColor: 'var(--bg-secondary)' }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredSets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ color: 'var(--text-secondary)' }}>
                  {searchQuery ? 'No sets found matching your search.' : 'No sets found.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredSets.map((set) => (
                <TableRow
                  key={set.id}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'var(--bg-tertiary)',
                    },
                  }}
                >
                  <TableCell sx={{ color: 'var(--text-primary)' }}>
                    {set.setName}
                  </TableCell>
                  <TableCell sx={{ color: 'var(--text-primary)' }}>
                    {set.setCode}
                  </TableCell>
                  <TableCell sx={{ color: 'var(--text-primary)' }}>
                    {formatDate(set.tcgDate)}
                  </TableCell>
                  <TableCell align="center">
                    <TextField
                      type="number"
                      value={set.price}
                      onChange={(e) => handlePriceUpdate(set.id, e.target.value)}
                      disabled={updatingSetId === set.id}
                      size="small"
                      inputProps={{ min: 0, style: { textAlign: 'center' } }}
                      sx={{
                        width: '80px',
                        '& .MuiInputBase-input': { color: 'var(--text-primary)' },
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': { borderColor: 'var(--border-color)' },
                          '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
                          '&.Mui-focused fieldset': { borderColor: 'var(--accent-primary)' },
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Checkbox
                      checked={set.isASession}
                      onChange={(e) =>
                        handleBooleanUpdate(set.id, 'isASession', e.target.checked)
                      }
                      disabled={updatingSetId === set.id}
                      sx={{
                        color: 'var(--text-secondary)',
                        '&.Mui-checked': { color: 'var(--accent-primary)' },
                      }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Checkbox
                      checked={set.isPurchasable}
                      onChange={(e) =>
                        handleBooleanUpdate(set.id, 'isPurchasable', e.target.checked)
                      }
                      disabled={updatingSetId === set.id}
                      sx={{
                        color: 'var(--text-secondary)',
                        '&.Mui-checked': { color: 'var(--accent-primary)' },
                      }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Checkbox
                      checked={set.isPromo}
                      onChange={(e) =>
                        handleBooleanUpdate(set.id, 'isPromo', e.target.checked)
                      }
                      disabled={updatingSetId === set.id}
                      sx={{
                        color: 'var(--text-secondary)',
                        '&.Mui-checked': { color: 'var(--accent-primary)' },
                      }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Checkbox
                      checked={set.useDBImage}
                      onChange={(e) =>
                        handleBooleanUpdate(set.id, 'useDBImage', e.target.checked)
                      }
                      disabled={updatingSetId === set.id}
                      sx={{
                        color: 'var(--text-secondary)',
                        '&.Mui-checked': { color: 'var(--accent-primary)' },
                      }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <SecondaryButton
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => handleOpenEditDialog(set)}
                    >
                      Edit
                    </SecondaryButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Set Dialog */}
      <StyledDialog
        open={createDialogOpen}
        onClose={() => !creating && setCreateDialogOpen(false)}
        title="Add New Set"
        actions={
          <>
            <SecondaryButton onClick={() => setCreateDialogOpen(false)} disabled={creating}>
              Cancel
            </SecondaryButton>
            <PrimaryButton onClick={handleCreateSet} disabled={creating}>
              Create Set
            </PrimaryButton>
          </>
        }
      >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Set Name"
              required
              fullWidth
              value={newSet.setName}
              onChange={(e) => setNewSet({ ...newSet, setName: e.target.value })}
              sx={{
                '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
                '& .MuiInputBase-input': { color: 'var(--text-primary)' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'var(--border-color)' },
                  '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
                  '&.Mui-focused fieldset': { borderColor: 'var(--accent-primary)' },
                },
              }}
            />
            <TextField
              label="Set Code"
              required
              fullWidth
              value={newSet.setCode}
              onChange={(e) => setNewSet({ ...newSet, setCode: e.target.value })}
              sx={{
                '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
                '& .MuiInputBase-input': { color: 'var(--text-primary)' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'var(--border-color)' },
                  '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
                  '&.Mui-focused fieldset': { borderColor: 'var(--accent-primary)' },
                },
              }}
            />
            <TextField
              label="Number of Cards"
              required
              type="number"
              fullWidth
              value={newSet.numOfCards || ''}
              onChange={(e) => setNewSet({ ...newSet, numOfCards: parseInt(e.target.value) || 0 })}
              inputProps={{ min: 1 }}
              sx={{
                '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
                '& .MuiInputBase-input': { color: 'var(--text-primary)' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'var(--border-color)' },
                  '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
                  '&.Mui-focused fieldset': { borderColor: 'var(--accent-primary)' },
                },
              }}
            />
            <TextField
              label="TCG Release Date"
              required
              type="date"
              fullWidth
              value={newSet.tcgDate}
              onChange={(e) => setNewSet({ ...newSet, tcgDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{
                '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
                '& .MuiInputBase-input': { color: 'var(--text-primary)' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'var(--border-color)' },
                  '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
                  '&.Mui-focused fieldset': { borderColor: 'var(--accent-primary)' },
                },
              }}
            />
            <TextField
              label="Set Image URL (optional)"
              fullWidth
              value={newSet.setImage}
              onChange={(e) => setNewSet({ ...newSet, setImage: e.target.value })}
              sx={{
                '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
                '& .MuiInputBase-input': { color: 'var(--text-primary)' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'var(--border-color)' },
                  '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
                  '&.Mui-focused fieldset': { borderColor: 'var(--accent-primary)' },
                },
              }}
            />
            <TextField
              label="Price"
              type="number"
              fullWidth
              value={newSet.price}
              onChange={(e) => setNewSet({ ...newSet, price: parseInt(e.target.value) || 4 })}
              inputProps={{ min: 0 }}
              sx={{
                '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
                '& .MuiInputBase-input': { color: 'var(--text-primary)' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'var(--border-color)' },
                  '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
                  '&.Mui-focused fieldset': { borderColor: 'var(--accent-primary)' },
                },
              }}
            />
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Checkbox
                  checked={newSet.isASession}
                  onChange={(e) => setNewSet({ ...newSet, isASession: e.target.checked })}
                  sx={{
                    color: 'var(--text-secondary)',
                    '&.Mui-checked': { color: 'var(--accent-primary)' },
                  }}
                />
                <Typography sx={{ color: 'var(--text-primary)' }}>Is a Session</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Checkbox
                  checked={newSet.isPurchasable}
                  onChange={(e) => setNewSet({ ...newSet, isPurchasable: e.target.checked })}
                  sx={{
                    color: 'var(--text-secondary)',
                    '&.Mui-checked': { color: 'var(--accent-primary)' },
                  }}
                />
                <Typography sx={{ color: 'var(--text-primary)' }}>Is Purchasable</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Checkbox
                  checked={newSet.isPromo}
                  onChange={(e) => setNewSet({ ...newSet, isPromo: e.target.checked })}
                  sx={{
                    color: 'var(--text-secondary)',
                    '&.Mui-checked': { color: 'var(--accent-primary)' },
                  }}
                />
                <Typography sx={{ color: 'var(--text-primary)' }}>Is a Promo</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Checkbox
                  checked={newSet.useDBImage}
                  onChange={(e) => setNewSet({ ...newSet, useDBImage: e.target.checked })}
                  sx={{
                    color: 'var(--text-secondary)',
                    '&.Mui-checked': { color: 'var(--accent-primary)' },
                  }}
                />
                <Typography sx={{ color: 'var(--text-primary)' }}>Use DB Image</Typography>
              </Box>
            </Box>
          </Box>
      </StyledDialog>

      {/* Edit Set Dialog */}
      {editingSet && (
        <StyledDialog
          open={editDialogOpen}
          onClose={() => !editing && setEditDialogOpen(false)}
          title="Edit Set"
          actions={
            <>
              <SecondaryButton onClick={() => setEditDialogOpen(false)} disabled={editing}>
                Cancel
              </SecondaryButton>
              <PrimaryButton onClick={handleUpdateSet} disabled={editing}>
                Update Set
              </PrimaryButton>
            </>
          }
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Set Name"
                required
                fullWidth
                value={editingSet.setName}
                onChange={(e) => setEditingSet({ ...editingSet, setName: e.target.value })}
                sx={{
                  '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
                  '& .MuiInputBase-input': { color: 'var(--text-primary)' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: 'var(--border-color)' },
                    '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
                    '&.Mui-focused fieldset': { borderColor: 'var(--accent-primary)' },
                  },
                }}
              />
              <TextField
                label="Set Code"
                required
                fullWidth
                value={editingSet.setCode}
                onChange={(e) => setEditingSet({ ...editingSet, setCode: e.target.value })}
                sx={{
                  '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
                  '& .MuiInputBase-input': { color: 'var(--text-primary)' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: 'var(--border-color)' },
                    '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
                    '&.Mui-focused fieldset': { borderColor: 'var(--accent-primary)' },
                  },
                }}
              />
              <TextField
                label="Number of Cards"
                required
                type="number"
                fullWidth
                value={editingSet.numOfCards}
                onChange={(e) => setEditingSet({ ...editingSet, numOfCards: parseInt(e.target.value) || 0 })}
                inputProps={{ min: 1 }}
                sx={{
                  '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
                  '& .MuiInputBase-input': { color: 'var(--text-primary)' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: 'var(--border-color)' },
                    '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
                    '&.Mui-focused fieldset': { borderColor: 'var(--accent-primary)' },
                  },
                }}
              />
              <TextField
                label="TCG Release Date"
                required
                type="date"
                fullWidth
                value={typeof editingSet.tcgDate === 'string' ? editingSet.tcgDate : new Date(editingSet.tcgDate).toISOString().split('T')[0]}
                onChange={(e) => setEditingSet({ ...editingSet, tcgDate: new Date(e.target.value) })}
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
                  '& .MuiInputBase-input': { color: 'var(--text-primary)' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: 'var(--border-color)' },
                    '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
                    '&.Mui-focused fieldset': { borderColor: 'var(--accent-primary)' },
                  },
                }}
              />
              <TextField
                label="Set Image URL (optional)"
                fullWidth
                value={editingSet.setImage || ''}
                onChange={(e) => setEditingSet({ ...editingSet, setImage: e.target.value })}
                sx={{
                  '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
                  '& .MuiInputBase-input': { color: 'var(--text-primary)' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: 'var(--border-color)' },
                    '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
                    '&.Mui-focused fieldset': { borderColor: 'var(--accent-primary)' },
                  },
                }}
              />
              <TextField
                label="Price"
                type="number"
                fullWidth
                value={editingSet.price}
                onChange={(e) => setEditingSet({ ...editingSet, price: parseInt(e.target.value) || 4 })}
                inputProps={{ min: 0 }}
                sx={{
                  '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
                  '& .MuiInputBase-input': { color: 'var(--text-primary)' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: 'var(--border-color)' },
                    '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
                    '&.Mui-focused fieldset': { borderColor: 'var(--accent-primary)' },
                  },
                }}
              />
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Checkbox
                    checked={editingSet.isASession}
                    onChange={(e) => setEditingSet({ ...editingSet, isASession: e.target.checked })}
                    sx={{
                      color: 'var(--text-secondary)',
                      '&.Mui-checked': { color: 'var(--accent-primary)' },
                    }}
                  />
                  <Typography sx={{ color: 'var(--text-primary)' }}>Is a Session</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Checkbox
                    checked={editingSet.isPurchasable}
                    onChange={(e) => setEditingSet({ ...editingSet, isPurchasable: e.target.checked })}
                    sx={{
                      color: 'var(--text-secondary)',
                      '&.Mui-checked': { color: 'var(--accent-primary)' },
                    }}
                  />
                  <Typography sx={{ color: 'var(--text-primary)' }}>Is Purchasable</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Checkbox
                    checked={editingSet.isPromo}
                    onChange={(e) => setEditingSet({ ...editingSet, isPromo: e.target.checked })}
                    sx={{
                      color: 'var(--text-secondary)',
                      '&.Mui-checked': { color: 'var(--accent-primary)' },
                    }}
                  />
                  <Typography sx={{ color: 'var(--text-primary)' }}>Is a Promo</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Checkbox
                    checked={editingSet.useDBImage}
                    onChange={(e) => setEditingSet({ ...editingSet, useDBImage: e.target.checked })}
                    sx={{
                      color: 'var(--text-secondary)',
                      '&.Mui-checked': { color: 'var(--accent-primary)' },
                    }}
                  />
                  <Typography sx={{ color: 'var(--text-primary)' }}>Use DB Image</Typography>
                </Box>
              </Box>
            </Box>
        </StyledDialog>
      )}
    </Box>
  );
}
