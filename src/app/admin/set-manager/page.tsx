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
  Paper,
  Typography,
  Checkbox,
  Alert,
  CircularProgress,
  TextField,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { getAllSets, updateSetBooleans, type SetData } from './actions';

export default function SetManagerPage() {
  const [sets, setSets] = useState<SetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingSetId, setUpdatingSetId] = useState<number | null>(null);

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
    field: 'isASession' | 'isPurchasable' | 'isPromo',
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

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
      </Box>

      <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 2 }}>
        Showing {filteredSets.length} of {sets.length} sets
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

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
                Is a Session
              </TableCell>
              <TableCell align="center" sx={{ color: 'var(--text-bright)', fontWeight: 'bold', backgroundColor: 'var(--bg-secondary)' }}>
                Is Purchasable
              </TableCell>
              <TableCell align="center" sx={{ color: 'var(--text-bright)', fontWeight: 'bold', backgroundColor: 'var(--bg-secondary)' }}>
                Is a Promo
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredSets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ color: 'var(--text-secondary)' }}>
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
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
