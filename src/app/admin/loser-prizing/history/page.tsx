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
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import { getLoserPrizingHistory } from '../actions';

interface HistoryResult {
  id: number;
  sessionId: number;
  playerId: number;
  entryName: string;
  entryDescription: string;
  targetPlayerId: number | null;
  additionalData: string | null;
  automatedResult: boolean;
  appliedAt: Date;
  session: {
    number: number;
  };
  player: {
    name: string;
  };
  targetPlayer: {
    name: string;
  } | null;
}

export default function LoserPrizingHistoryPage() {
  const [results, setResults] = useState<HistoryResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await getLoserPrizingHistory();

      if (response.success) {
        setResults(response.results || []);
      } else {
        setError(response.error || 'Failed to load history');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
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
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 3, color: 'var(--text-bright)' }}>
        Loser Prizing History
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
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
                Session
              </TableCell>
              <TableCell sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }}>
                Player
              </TableCell>
              <TableCell sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }}>
                Prize
              </TableCell>
              <TableCell sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }}>
                Target Player
              </TableCell>
              <TableCell sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }}>
                Type
              </TableCell>
              <TableCell sx={{ color: 'var(--text-bright)', fontWeight: 'bold' }}>
                Date
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {results.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ color: 'var(--text-secondary)' }}>
                  No loser prizing history found
                </TableCell>
              </TableRow>
            ) : (
              results.map((result) => (
                <TableRow key={result.id}>
                  <TableCell sx={{ color: 'var(--text-bright)' }}>
                    {result.session.number}
                  </TableCell>
                  <TableCell sx={{ color: 'var(--text-bright)' }}>
                    {result.player.name}
                  </TableCell>
                  <TableCell sx={{ color: 'var(--text-bright)' }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {result.entryName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                      {result.entryDescription}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ color: 'var(--text-bright)' }}>
                    {result.targetPlayer?.name || '-'}
                  </TableCell>
                  <TableCell>
                    {result.automatedResult ? (
                      <Chip
                        label="Automated"
                        size="small"
                        sx={{
                          backgroundColor: 'rgba(78, 201, 176, 0.1)',
                          color: 'var(--success)',
                        }}
                      />
                    ) : (
                      <Chip
                        label="Manual"
                        size="small"
                        sx={{
                          backgroundColor: 'rgba(244, 135, 113, 0.1)',
                          color: 'var(--warning)',
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell sx={{ color: 'var(--text-secondary)' }}>
                    {new Date(result.appliedAt).toLocaleDateString()}
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
