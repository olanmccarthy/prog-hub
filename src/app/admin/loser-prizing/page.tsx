'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Collapse,
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
} from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import SettingsIcon from '@mui/icons-material/Settings';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import EventWheel from '@components/EventWheel';
import EventResultModal from '@components/EventResultModal';
import { getLoserPrizingEntries as getLoserPrizingStatus, spinLoserPrizingWheel, LoserPrizingStatusResult } from './actions';
import {
  getLoserPrizingEntries as getLoserPrizingConfigEntries,
  createLoserPrizingEntry,
  updateLoserPrizingEntry,
  deleteLoserPrizingEntry,
  massUpdateLoserPrizingChances,
  applyMultiplierToLoserPrizingEntries,
  type LoserPrizingEntry as ConfigEntry,
  type CreateEntryInput,
} from '../loser-prizing-config/actions';

export default function LoserPrizingPage() {
  const [status, setStatus] = useState<LoserPrizingStatusResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [selectedResult, setSelectedResult] = useState<{
    name: string;
    description: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Configuration section state
  const [configExpanded, setConfigExpanded] = useState(false);
  const [configEntries, setConfigEntries] = useState<ConfigEntry[]>([]);
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

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getLoserPrizingStatus();
      setStatus(result);
      if (!result.success && result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load entries');
    } finally {
      setLoading(false);
    }
  };

  const loadConfigEntries = async () => {
    try {
      const result = await getLoserPrizingConfigEntries();
      if (result.success && result.entries) {
        setConfigEntries(result.entries);
        const initialValues: Record<number, number> = {};
        result.entries.forEach(entry => {
          initialValues[entry.id] = entry.chance;
        });
        setMassEditValues(initialValues);
      } else {
        setError(result.error || 'Failed to load config entries');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load config entries');
    }
  };

  const handleConfigToggle = async () => {
    if (!configExpanded) {
      await loadConfigEntries();
    }
    setConfigExpanded(!configExpanded);
  };

  const handleOpenDialog = (entry?: ConfigEntry) => {
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
      setError(null);
      setSuccess(null);

      const result = editingId
        ? await updateLoserPrizingEntry(editingId, formData)
        : await createLoserPrizingEntry(formData);

      if (result.success) {
        setSuccess(editingId ? 'Entry updated successfully' : 'Entry created successfully');
        handleCloseDialog();
        await loadConfigEntries();
        await loadEntries(); // Refresh wheel display
      } else {
        setError(result.error || 'Operation failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      setError(null);
      setSuccess(null);
      const result = await deleteLoserPrizingEntry(id);

      if (result.success) {
        setSuccess('Entry deleted successfully');
        await loadConfigEntries();
        await loadEntries(); // Refresh wheel display
      } else {
        setError(result.error || 'Failed to delete entry');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entry');
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
      setError(null);
      setSuccess(null);

      const updates = Object.entries(massEditValues).map(([id, chance]) => ({
        id: parseInt(id),
        chance,
      }));

      const result = await massUpdateLoserPrizingChances({ updates });

      if (result.success) {
        setSuccess('All chances updated successfully');
        setMassEditMode(false);
        await loadConfigEntries();
        await loadEntries(); // Refresh wheel display
      } else {
        setError(result.error || 'Failed to update chances');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update chances');
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
      setError('Please select at least one entry');
      return;
    }

    if (multiplier < 0) {
      setError('Multiplier must be non-negative');
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      const result = await applyMultiplierToLoserPrizingEntries({
        entryIds: Array.from(selectedForMultiplier),
        multiplier,
      });

      if (result.success) {
        setSuccess(`Multiplier ${multiplier} applied successfully (rounded down)`);
        setSelectedForMultiplier(new Set());
        setMultiplier(1);
        await loadConfigEntries();
        await loadEntries(); // Refresh wheel display
      } else {
        setError(result.error || 'Failed to apply multiplier');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply multiplier');
    }
  };

  const handleSpin = async () => {
    try {
      setError(null);
      setSuccess(null);
      setSpinning(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate spin');
      setSpinning(false);
    }
  };

  const handleSpinComplete = async () => {
    try {
      // Get the actual result from the server
      const result = await spinLoserPrizingWheel();

      if (result.success) {
        // Use the server's result instead of the index
        setSelectedResult(result.selectedEntry || null);
        setShowResult(true);
        setSuccess('Loser prizing wheel spun successfully!');
      } else {
        setError(result.error || 'Failed to spin loser prizing wheel');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete spin');
    } finally {
      setSpinning(false);
    }
  };

  const handleCloseResult = () => {
    setShowResult(false);
  };

  const handleSpinAgain = () => {
    setShowResult(false);
    setSelectedResult(null);
    handleSpin();
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Prepare wheel segments
  const wheelSegments = status?.entries
    ? (() => {
        const totalChance = status.entries.reduce((sum, entry) => sum + entry.chance, 0);
        const segments = status.entries.map(entry => ({
          name: entry.name,
          description: entry.description,
          weight: totalChance >= 100 ? (entry.chance / totalChance) * 100 : entry.chance,
          color: '',
        }));

        // Add "No Prize" if total < 100%
        if (totalChance < 100) {
          segments.push({
            name: 'Normal Prizing',
            description: 'Either get 1 dollarydoo or half a box of the main set.',
            weight: 100 - totalChance,
            color: '',
          });
        }

        return segments;
      })()
    : [];

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 3, color: 'var(--text-bright)' }}>
        Loser Prizing Wheel
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Loser Prizing Wheel Section */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-bright)',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" sx={{ color: 'var(--text-bright)' }}>
            Spin for Consolation Prize
          </Typography>

          <Typography
            variant="body2"
            sx={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 600 }}
          >
            This wheel can be spun multiple times. Award prizes to players who didn&apos;t make top placements.
          </Typography>

          {/* Wheel Display */}
          {wheelSegments.length > 0 && (
            <EventWheel
              segments={wheelSegments}
              onSpinComplete={handleSpinComplete}
              spinning={spinning}
            />
          )}

          {/* Spin Button */}
          <Button
            variant="contained"
            size="large"
            startIcon={spinning ? <CircularProgress size={20} /> : <CasinoIcon />}
            onClick={handleSpin}
            disabled={spinning || wheelSegments.length === 0}
            sx={{
              backgroundColor: wheelSegments.length > 0
                ? 'var(--accent-primary)'
                : 'var(--grey-300)',
              '&:hover': {
                backgroundColor: wheelSegments.length > 0
                  ? 'var(--accent-blue-hover)'
                  : 'var(--grey-300)',
              },
              '&:disabled': {
                backgroundColor: 'var(--grey-300)',
                color: 'var(--text-secondary)',
              },
              px: 4,
              py: 1.5,
            }}
          >
            {spinning ? 'Spinning...' : 'Spin the Wheel'}
          </Button>
        </Box>
      </Paper>

      {/* Wheel Entries List */}
      {status?.entries && status.entries.length > 0 && (
        <Paper
          sx={{
            p: 3,
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-bright)',
          }}
        >
          <Typography variant="h6" sx={{ color: 'var(--text-bright)', mb: 2 }}>
            Possible Prizes
          </Typography>
          <List>
            {status.entries.map((entry, index) => {
              const totalChance = status.entries.reduce((sum, e) => sum + e.chance, 0);
              const normalizedChance = totalChance >= 100
                ? ((entry.chance / totalChance) * 100).toFixed(1)
                : entry.chance.toFixed(1);

              return (
                <Box key={entry.id}>
                  {index > 0 && <Divider sx={{ borderColor: 'var(--border-color)', my: 1 }} />}
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }}>
                            {entry.name}
                          </Typography>
                          <Typography
                            sx={{
                              color: 'var(--accent-primary)',
                              fontWeight: 'bold',
                              ml: 2,
                            }}
                          >
                            {normalizedChance}%
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Typography sx={{ color: 'var(--text-secondary)', mt: 0.5 }}>
                          {entry.description}
                        </Typography>
                      }
                    />
                  </ListItem>
                </Box>
              );
            })}

            {/* Show "No Prize" if total < 100% */}
            {(() => {
              const totalChance = status.entries.reduce((sum, e) => sum + e.chance, 0);
              if (totalChance < 100) {
                return (
                  <>
                    <Divider sx={{ borderColor: 'var(--border-color)', my: 1 }} />
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }}>
                              Normal Prizing
                            </Typography>
                            <Typography
                              sx={{
                                color: 'var(--text-secondary)',
                                fontWeight: 'bold',
                                ml: 2,
                              }}
                            >
                              {(100 - totalChance).toFixed(1)}%
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Typography sx={{ color: 'var(--text-secondary)', mt: 0.5 }}>
                            Either get 1 dollarydoo or half a box of the main set.
                          </Typography>
                        }
                      />
                    </ListItem>
                  </>
                );
              }
              return null;
            })()}
          </List>
        </Paper>
      )}

      {/* Configuration Section */}
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
          onClick={handleConfigToggle}
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
              handleConfigToggle();
            }}
          >
            {configExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

        <Collapse in={configExpanded}>
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
                  {configEntries.length === 0 ? (
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
                    configEntries.map((entry) => (
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
                    disabled={configEntries.length === 0}
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
                        configEntries.forEach(entry => {
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
                {configEntries.map((entry) => (
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

      {/* Result Modal - always allow respin for loser prizing */}
      <EventResultModal
        open={showResult}
        onClose={handleCloseResult}
        onSpinAgain={handleSpinAgain}
        result={selectedResult}
        alreadySpun={false}
      />
    </Box>
  );
}
