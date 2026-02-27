'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import { getVoteDetails, type VoteDetail } from '../actions';

/**
 * Admin-only component to view vote details in non-production environments.
 * Shows who voted for each suggestion.
 */
export function VoteDetailsView() {
  const [voteDetails, setVoteDetails] = useState<VoteDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVoteDetails();
  }, []);

  const fetchVoteDetails = async () => {
    setLoading(true);
    setError(null);
    const result = await getVoteDetails();

    if (result.success && result.voteDetails) {
      setVoteDetails(result.voteDetails);
    } else {
      setError(result.error || 'Failed to load vote details');
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  if (voteDetails.length === 0) {
    return (
      <Alert severity="info" sx={{ mb: 3 }}>
        No vote details available yet.
      </Alert>
    );
  }

  return (
    <Paper
      sx={{
        p: 3,
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border-color)',
        mb: 3,
      }}
    >
      <Typography
        variant="h6"
        sx={{ mb: 2, color: 'var(--text-bright)' }}
      >
        Vote Details
      </Typography>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>
                Suggestion ID
              </TableCell>
              <TableCell sx={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>
                Submitted By
              </TableCell>
              <TableCell sx={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>
                Voters ({voteDetails.reduce((sum, detail) => sum + detail.voters.length, 0)} total)
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {voteDetails.map((detail) => (
              <TableRow key={detail.suggestionId}>
                <TableCell sx={{ color: 'var(--text-primary)' }}>
                  #{detail.suggestionId}
                </TableCell>
                <TableCell sx={{ color: 'var(--text-primary)' }}>
                  {detail.submittedBy}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {detail.voters.length > 0 ? (
                      detail.voters.map((voter, index) => (
                        <Chip
                          key={index}
                          label={voter}
                          size="small"
                          sx={{
                            backgroundColor: 'var(--accent-primary)',
                            color: 'var(--text-bright)',
                          }}
                        />
                      ))
                    ) : (
                      <Typography
                        variant="body2"
                        sx={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}
                      >
                        No votes yet
                      </Typography>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Alert severity="info" sx={{ mt: 3 }}>
        This detailed voting information is for administrative and debugging purposes.
      </Alert>
    </Paper>
  );
}
