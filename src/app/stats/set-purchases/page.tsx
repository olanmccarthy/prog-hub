'use client';

import { useState, useEffect, useMemo } from 'react';
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
  CircularProgress,
  Alert,
  TableSortLabel
} from '@mui/material';
import { getSetPurchaseStats, type SetPurchaseStats } from '../actions';

type SortColumn = 'setName' | 'setCode' | 'totalPurchases' | 'totalPointsSpent' | 'averageSpendPerPlayer' | 'averageImmediateROI' | 'topSpender';

export default function SetPurchasesPage() {
  const [stats, setStats] = useState<SetPurchaseStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>('totalPurchases');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        const result = await getSetPurchaseStats();

        if (!result.success) {
          setError(result.error || 'Failed to load set purchase statistics');
          return;
        }

        setStats(result.stats || []);
      } catch (err) {
        setError('An unexpected error occurred');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Default to descending for new column
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const sortedStats = useMemo(() => {
    const sorted = [...stats];

    sorted.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortColumn) {
        case 'setName':
          aValue = a.setName.toLowerCase();
          bValue = b.setName.toLowerCase();
          break;
        case 'setCode':
          aValue = a.setCode.toLowerCase();
          bValue = b.setCode.toLowerCase();
          break;
        case 'totalPurchases':
          aValue = a.totalPurchases;
          bValue = b.totalPurchases;
          break;
        case 'totalPointsSpent':
          aValue = a.totalPointsSpent;
          bValue = b.totalPointsSpent;
          break;
        case 'averageSpendPerPlayer':
          aValue = a.averageSpendPerPlayer;
          bValue = b.averageSpendPerPlayer;
          break;
        case 'averageImmediateROI':
          aValue = a.averageImmediateROI ?? -Infinity;
          bValue = b.averageImmediateROI ?? -Infinity;
          break;
        case 'topSpender':
          aValue = a.topSpender?.playerName.toLowerCase() ?? '';
          bValue = b.topSpender?.playerName.toLowerCase() ?? '';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [stats, sortColumn, sortDirection]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Set Purchase Statistics
      </Typography>
      <Typography variant="body1" color="var(--text-secondary)" sx={{ mb: 3 }}>
        View spending patterns and return on investment for each set
      </Typography>

      {stats.length === 0 ? (
        <Paper sx={{ p: 3, backgroundColor: 'var(--bg-elevated)' }}>
          <Typography color="var(--text-secondary)">
            No purchases recorded yet
          </Typography>
        </Paper>
      ) : (
        <Paper sx={{ backgroundColor: 'var(--bg-elevated)' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <TableCell>
                    <TableSortLabel
                      active={sortColumn === 'setName'}
                      direction={sortColumn === 'setName' ? sortDirection : 'asc'}
                      onClick={() => handleSort('setName')}
                    >
                      <strong>Set Name</strong>
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortColumn === 'setCode'}
                      direction={sortColumn === 'setCode' ? sortDirection : 'asc'}
                      onClick={() => handleSort('setCode')}
                    >
                      <strong>Set Code</strong>
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={sortColumn === 'totalPurchases'}
                      direction={sortColumn === 'totalPurchases' ? sortDirection : 'asc'}
                      onClick={() => handleSort('totalPurchases')}
                    >
                      <strong>Total Purchases</strong>
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={sortColumn === 'totalPointsSpent'}
                      direction={sortColumn === 'totalPointsSpent' ? sortDirection : 'asc'}
                      onClick={() => handleSort('totalPointsSpent')}
                    >
                      <strong>Total Spent</strong>
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={sortColumn === 'averageSpendPerPlayer'}
                      direction={sortColumn === 'averageSpendPerPlayer' ? sortDirection : 'asc'}
                      onClick={() => handleSort('averageSpendPerPlayer')}
                    >
                      <strong>Avg Spend/Player</strong>
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={sortColumn === 'averageImmediateROI'}
                      direction={sortColumn === 'averageImmediateROI' ? sortDirection : 'asc'}
                      onClick={() => handleSort('averageImmediateROI')}
                    >
                      <strong>Avg Immediate ROI</strong>
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <strong>Top Spender</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedStats.map(set => (
                  <TableRow
                    key={set.setId}
                    sx={{ '&:hover': { backgroundColor: 'var(--bg-secondary)' } }}
                  >
                    <TableCell>{set.setName}</TableCell>
                    <TableCell>{set.setCode}</TableCell>
                    <TableCell align="right">{set.totalPurchases}</TableCell>
                    <TableCell align="right">{set.totalPointsSpent}</TableCell>
                    <TableCell align="right">{set.averageSpendPerPlayer}</TableCell>
                    <TableCell align="right">
                      {set.averageImmediateROI !== null ? `${set.averageImmediateROI}%` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {set.topSpender
                        ? `${set.topSpender.playerName} (${set.topSpender.amountSpent})`
                        : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
}
