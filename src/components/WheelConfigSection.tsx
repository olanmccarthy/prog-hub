import { useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Collapse,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Checkbox,
  Typography,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';

export interface WheelEntry {
  id: number;
  name: string;
  description: string;
  chance: number;
}

export interface CreateEntryInput {
  name: string;
  description: string;
  chance: number;
}

interface WheelConfigSectionProps {
  entries: WheelEntry[];
  onCreateEntry: (input: CreateEntryInput) => Promise<{ success: boolean; error?: string }>;
  onUpdateEntry: (id: number, input: CreateEntryInput) => Promise<{ success: boolean; error?: string }>;
  onDeleteEntry: (id: number) => Promise<{ success: boolean; error?: string }>;
  onMassUpdate: (updates: { id: number; chance: number }[]) => Promise<{ success: boolean; error?: string }>;
  onApplyMultiplier: (entryIds: number[], multiplier: number) => Promise<{ success: boolean; error?: string }>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onReload: () => Promise<void>;
}

export function WheelConfigSection({
  entries,
  onCreateEntry,
  onUpdateEntry,
  onDeleteEntry,
  onMassUpdate,
  onApplyMultiplier,
  onSuccess,
  onError,
  onReload,
}: WheelConfigSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CreateEntryInput>({
    name: '',
    description: '',
    chance: 0,
  });
  const [massEditMode, setMassEditMode] = useState(false);
  const [massEditValues, setMassEditValues] = useState<Record<number, number>>({});
  const [selectedForMultiplier, setSelectedForMultiplier] = useState<Set<number>>(new Set());
  const [multiplier, setMultiplier] = useState<number>(1);

  const handleToggle = () => {
    setExpanded(!expanded);
    if (!expanded) {
      // Initialize mass edit values when opening
      const initialValues: Record<number, number> = {};
      entries.forEach(entry => {
        initialValues[entry.id] = entry.chance;
      });
      setMassEditValues(initialValues);
    }
  };

  const handleOpenDialog = (entry?: WheelEntry) => {
    if (entry) {
      setEditingId(entry.id);
      setFormData({
        name: entry.name,
        description: entry.description,
        chance: entry.chance,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        description: '',
        chance: 0,
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
      const result = editingId
        ? await onUpdateEntry(editingId, formData)
        : await onCreateEntry(formData);

      if (result.success) {
        onSuccess(editingId ? 'Entry updated successfully' : 'Entry created successfully');
        handleCloseDialog();
        await onReload();
      } else {
        onError(result.error || 'Operation failed');
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Operation failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      const result = await onDeleteEntry(id);

      if (result.success) {
        onSuccess('Entry deleted successfully');
        await onReload();
      } else {
        onError(result.error || 'Failed to delete entry');
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to delete entry');
    }
  };

  const handleMassEditChange = (id: number, value: string) => {
    const numValue = parseInt(value) || 0;
    setMassEditValues(prev => ({
      ...prev,
      [id]: numValue,
    }));
  };

  const handleSaveMassEdit = async () => {
    try {
      const updates = Object.entries(massEditValues).map(([id, chance]) => ({
        id: parseInt(id),
        chance,
      }));

      const result = await onMassUpdate(updates);

      if (result.success) {
        onSuccess('All chances updated successfully');
        setMassEditMode(false);
        await onReload();
      } else {
        onError(result.error || 'Failed to update chances');
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to update chances');
    }
  };

  const handleToggleSelection = (id: number) => {
    setSelectedForMultiplier(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleApplyMultiplier = async () => {
    if (selectedForMultiplier.size === 0) {
      onError('Please select at least one entry');
      return;
    }

    if (multiplier < 0) {
      onError('Multiplier must be non-negative');
      return;
    }

    try {
      const result = await onApplyMultiplier(Array.from(selectedForMultiplier), multiplier);

      if (result.success) {
        onSuccess(`Multiplier ${multiplier} applied successfully (rounded down)`);
        setSelectedForMultiplier(new Set());
        setMultiplier(1);
        await onReload();
      } else {
        onError(result.error || 'Failed to apply multiplier');
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to apply multiplier');
    }
  };

  return (
    <>
      <Paper
        sx={{
          mt: 3,
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            p: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            '&:hover': {
              backgroundColor: 'var(--bg-tertiary)',
            },
          }}
          onClick={handleToggle}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SettingsIcon sx={{ color: 'var(--text-bright)' }} />
            <Typography variant="h6" sx={{ color: 'var(--text-bright)' }}>
              Wheel Configuration
            </Typography>
          </Box>
          <IconButton
            sx={{ color: 'var(--text-bright)' }}
            onClick={(e) => {
              e.stopPropagation();
              handleToggle();
            }}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

        <Collapse in={expanded}>
          <Divider sx={{ borderColor: 'var(--border-color)' }} />
          <Box sx={{ p: 3 }}>
            {/* Add Entry Button */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
                sx={{
                  backgroundColor: 'var(--accent-primary)',
                  '&:hover': {
                    backgroundColor: 'var(--accent-blue-hover)',
                  },
                }}
              >
                Create New Entry
              </Button>
            </Box>

            {/* Entries Table */}
            <TableContainer
              sx={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-color)',
                mb: 3,
              }}
            >
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }}>
                      ID
                    </TableCell>
                    <TableCell sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }}>
                      Name
                    </TableCell>
                    <TableCell sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }}>
                      Description
                    </TableCell>
                    <TableCell
                      sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }}
                      align="center"
                    >
                      Chance
                    </TableCell>
                    <TableCell
                      sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }}
                      align="center"
                    >
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entries.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        align="center"
                        sx={{ color: 'var(--text-secondary)', py: 4 }}
                      >
                        No entries configured. Create one to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell sx={{ color: 'var(--text-primary)' }}>{entry.id}</TableCell>
                        <TableCell sx={{ color: 'var(--text-primary)' }}>{entry.name}</TableCell>
                        <TableCell sx={{ color: 'var(--text-primary)' }}>
                          {entry.description}
                        </TableCell>
                        <TableCell sx={{ color: 'var(--text-primary)' }} align="center">
                          {massEditMode ? (
                            <TextField
                              type="number"
                              value={massEditValues[entry.id] || 0}
                              onChange={(e) => handleMassEditChange(entry.id, e.target.value)}
                              size="small"
                              sx={{
                                width: '100px',
                                '& .MuiInputBase-root': {
                                  color: 'var(--text-primary)',
                                  backgroundColor: 'var(--input-bg)',
                                },
                                '& .MuiOutlinedInput-notchedOutline': {
                                  borderColor: 'var(--input-border)',
                                },
                              }}
                            />
                          ) : (
                            entry.chance
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            onClick={() => handleOpenDialog(entry)}
                            disabled={massEditMode}
                            sx={{
                              color: massEditMode
                                ? 'var(--text-secondary)'
                                : 'var(--accent-primary)',
                              '&:hover': {
                                backgroundColor: 'var(--bg-tertiary)',
                              },
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            onClick={() => handleDelete(entry.id)}
                            disabled={massEditMode}
                            sx={{
                              color: massEditMode ? 'var(--text-secondary)' : 'var(--error)',
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
                </TableBody>
              </Table>
            </TableContainer>

            {/* Mass Edit Section */}
            <Paper
              sx={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-color)',
                p: 2,
                mb: 3,
              }}
            >
              <Typography variant="h6" sx={{ color: 'var(--text-bright)', mb: 2 }}>
                Mass Update Chances
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                {!massEditMode ? (
                  <Button
                    variant="contained"
                    onClick={() => setMassEditMode(true)}
                    disabled={entries.length === 0}
                    sx={{
                      backgroundColor: 'var(--accent-primary)',
                      '&:hover': {
                        backgroundColor: 'var(--accent-blue-hover)',
                      },
                    }}
                  >
                    Enable Mass Edit
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSaveMassEdit}
                      sx={{
                        backgroundColor: 'var(--success)',
                        '&:hover': {
                          backgroundColor: 'var(--success)',
                          filter: 'brightness(1.2)',
                        },
                      }}
                    >
                      Save All Changes
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setMassEditMode(false);
                        const resetValues: Record<number, number> = {};
                        entries.forEach(entry => {
                          resetValues[entry.id] = entry.chance;
                        });
                        setMassEditValues(resetValues);
                      }}
                      sx={{
                        color: 'var(--text-secondary)',
                        borderColor: 'var(--border-color)',
                        '&:hover': {
                          backgroundColor: 'var(--bg-tertiary)',
                          borderColor: 'var(--text-secondary)',
                        },
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </Box>
            </Paper>

            {/* Multiplier Section */}
            <Paper
              sx={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-color)',
                p: 2,
              }}
            >
              <Typography variant="h6" sx={{ color: 'var(--text-bright)', mb: 2 }}>
                Apply Multiplier (Rounds Down)
              </Typography>
              <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 2 }}>
                Select entries below and apply a multiplier to their chance values. Results will be
                rounded down.
              </Typography>

              <Box sx={{ mb: 2, maxHeight: '200px', overflow: 'auto' }}>
                {entries.map((entry) => (
                  <Box
                    key={entry.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      py: 0.5,
                      borderBottom: '1px solid var(--border-color)',
                    }}
                  >
                    <Checkbox
                      checked={selectedForMultiplier.has(entry.id)}
                      onChange={() => handleToggleSelection(entry.id)}
                      sx={{
                        color: 'var(--text-secondary)',
                        '&.Mui-checked': {
                          color: 'var(--accent-primary)',
                        },
                      }}
                    />
                    <Typography sx={{ color: 'var(--text-primary)', flex: 1 }}>
                      {entry.name} (Current: {entry.chance})
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Divider sx={{ borderColor: 'var(--border-color)', my: 2 }} />

              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  label="Multiplier"
                  type="number"
                  value={multiplier}
                  onChange={(e) => setMultiplier(parseFloat(e.target.value) || 0)}
                  inputProps={{ step: 0.1, min: 0 }}
                  sx={{
                    width: '200px',
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
                <Button
                  variant="contained"
                  onClick={handleApplyMultiplier}
                  disabled={selectedForMultiplier.size === 0}
                  sx={{
                    backgroundColor: 'var(--accent-primary)',
                    '&:hover': {
                      backgroundColor: 'var(--accent-blue-hover)',
                    },
                  }}
                >
                  Apply Multiplier
                </Button>
                {selectedForMultiplier.size > 0 && (
                  <Typography sx={{ color: 'var(--text-secondary)' }}>
                    {selectedForMultiplier.size} entries selected
                  </Typography>
                )}
              </Box>
            </Paper>
          </Box>
        </Collapse>
      </Paper>

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
          },
        }}
      >
        <DialogTitle sx={{ color: 'var(--text-bright)' }}>
          {editingId ? 'Edit Entry' : 'Create New Entry'}
        </DialogTitle>
        <DialogContent>
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
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              required
              multiline
              rows={3}
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
              label="Chance"
              type="number"
              value={formData.chance}
              onChange={(e) =>
                setFormData({ ...formData, chance: parseInt(e.target.value) || 0 })
              }
              fullWidth
              required
              inputProps={{ min: 0 }}
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
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={handleCloseDialog}
            sx={{
              color: 'var(--text-secondary)',
              '&:hover': {
                backgroundColor: 'var(--bg-tertiary)',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            sx={{
              backgroundColor: 'var(--accent-primary)',
              '&:hover': {
                backgroundColor: 'var(--accent-blue-hover)',
              },
            }}
          >
            {editingId ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
