'use client';

import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Tooltip
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useEffect, useState } from 'react';
import { getCardSuccessByPlacement, type CardSuccessRate } from '../actions';

interface CardSuccessTableProps {
  minDecks?: number;
  limit?: number;
}

export default function CardSuccessTable({ minDecks = 2, limit = 50 }: CardSuccessTableProps) {
  const [data, setData] = useState<CardSuccessRate[]>([]);
  const [totalTier1, setTotalTier1] = useState(0);
  const [totalTier2, setTotalTier2] = useState(0);
  const [totalTier3, setTotalTier3] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'tier1' | 'tier2' | 'tier3'>('tier1');
  const [displayLimit, setDisplayLimit] = useState(limit);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await getCardSuccessByPlacement(minDecks);
        if (result.success && result.cards) {
          setData(result.cards);
          setTotalTier1(result.totalTier1Decks || 0);
          setTotalTier2(result.totalTier2Decks || 0);
          setTotalTier3(result.totalTier3Decks || 0);
        } else {
          setError(result.error || 'Failed to load data');
        }
      } catch (err) {
        setError('An unexpected error occurred');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [minDecks]);

  const handleSortChange = (event: SelectChangeEvent<'tier1' | 'tier2' | 'tier3'>) => {
    setSortBy(event.target.value as 'tier1' | 'tier2' | 'tier3');
  };

  const handleLimitChange = (event: SelectChangeEvent<number>) => {
    setDisplayLimit(Number(event.target.value));
  };

  // Sort data based on selected tier
  const sortedData = [...data].sort((a, b) => {
    if (sortBy === 'tier1') return b.tier1Usage - a.tier1Usage;
    if (sortBy === 'tier2') return b.tier2Usage - a.tier2Usage;
    return b.tier3Usage - a.tier3Usage;
  }).slice(0, displayLimit);

  if (loading) {
    return (
      <Paper sx={{ p: 3, backgroundColor: 'var(--bg-elevated)' }}>
        <Typography variant="h6" gutterBottom>
          Card Success by Placement
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress size={24} />
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, backgroundColor: 'var(--bg-elevated)' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
        <Typography variant="h6">
          Card Success by Placement
        </Typography>
        <Tooltip
          title={
            <Box sx={{ p: 1 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                What This Shows:
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Analyzes which cards appear more in winning vs. losing decks across all sessions.
              </Typography>

              <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 'bold' }}>
                The Tiers:
              </Typography>
              <Typography variant="body2" sx={{ ml: 1 }}>
                • <strong>Tier 1</strong> (Cyan): 1st-2nd place finishers<br />
                • <strong>Tier 2</strong> (White): 3rd-4th place finishers<br />
                • <strong>Tier 3</strong> (Orange): 5th-6th place finishers
              </Typography>

              <Typography variant="body2" sx={{ mt: 1, mb: 0.5, fontWeight: 'bold' }}>
                Reading Percentages:
              </Typography>
              <Typography variant="body2" sx={{ ml: 1 }}>
                • <strong>200%</strong> = 2 copies per deck on average<br />
                • <strong>100%</strong> = 1 copy per deck on average<br />
                • <strong>50%</strong> = Half the decks use it<br />
                • <strong>0%</strong> = Nobody in that tier used it
              </Typography>

              <Typography variant="body2" sx={{ mt: 1, mb: 0.5, fontWeight: 'bold' }}>
                How To Use:
              </Typography>
              <Typography variant="body2" sx={{ ml: 1 }}>
                • <strong>High Tier 1%</strong> = Cards winning players prefer<br />
                • <strong>Declining %</strong> (200→160→110) = &quot;Winning cards&quot;<br />
                • <strong>Increasing %</strong> (60→70→80) = May underperform<br />
                • <strong>High Tier 3%</strong> = Cards used more by lower placers
              </Typography>
            </Box>
          }
          placement="top"
          arrow
          componentsProps={{
            tooltip: {
              sx: {
                maxWidth: 500,
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                '& .MuiTooltip-arrow': {
                  color: 'var(--bg-secondary)',
                }
              }
            }
          }}
        >
          <HelpOutlineIcon
            sx={{
              fontSize: 20,
              color: 'var(--text-secondary)',
              cursor: 'help',
              '&:hover': { color: 'var(--accent-primary)' }
            }}
          />
        </Tooltip>
      </Box>
      <Typography variant="body2" color="var(--text-secondary)" sx={{ mb: 2 }}>
        Card usage rates across placement tiers (Tier 1: {totalTier1} decks, Tier 2: {totalTier2} decks, Tier 3: {totalTier3} decks)
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Sort By</InputLabel>
          <Select value={sortBy} onChange={handleSortChange} label="Sort By" size="small">
            <MenuItem value="tier1">Tier 1 (1st-2nd)</MenuItem>
            <MenuItem value="tier2">Tier 2 (3rd-4th)</MenuItem>
            <MenuItem value="tier3">Tier 3 (5th-6th)</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Limit</InputLabel>
          <Select value={displayLimit} onChange={handleLimitChange} label="Limit" size="small">
            <MenuItem value={25}>25</MenuItem>
            <MenuItem value={50}>50</MenuItem>
            <MenuItem value={100}>100</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {error ? (
        <Typography color="var(--text-secondary)">{error}</Typography>
      ) : sortedData.length > 0 ? (
        <TableContainer sx={{ maxHeight: '60vh' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <TableCell><strong>Rank</strong></TableCell>
                <TableCell><strong>Card Name</strong></TableCell>
                <TableCell align="right" sx={{ backgroundColor: sortBy === 'tier1' ? 'var(--success)' : 'var(--bg-tertiary)' }}>
                  <strong>Tier 1 (1st-2nd)</strong>
                </TableCell>
                <TableCell align="right" sx={{ backgroundColor: sortBy === 'tier2' ? 'var(--warning)' : 'var(--bg-tertiary)' }}>
                  <strong>Tier 2 (3rd-4th)</strong>
                </TableCell>
                <TableCell align="right" sx={{ backgroundColor: sortBy === 'tier3' ? 'var(--error)' : 'var(--bg-tertiary)' }}>
                  <strong>Tier 3 (5th-6th)</strong>
                </TableCell>
                <TableCell align="right"><strong>Total Decks</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedData.map((card, index) => (
                <TableRow key={card.cardId}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{card.cardName}</TableCell>
                  <TableCell align="right" sx={{ color: 'var(--success)' }}>
                    {card.tier1Usage}%
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'var(--warning)' }}>
                    {card.tier2Usage}%
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'var(--error)' }}>
                    {card.tier3Usage}%
                  </TableCell>
                  <TableCell align="right">{card.totalUsage}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography color="var(--text-secondary)">
          No data available. Need at least {minDecks} deck appearances per card.
        </Typography>
      )}
    </Paper>
  );
}
