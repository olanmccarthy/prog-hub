'use client';

import { useEffect, useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  CircularProgress,
  Tooltip,
  FormControlLabel,
  Checkbox,
  FormGroup
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { getSessionDiversity, type SessionDiversityPoint } from '../actions';

export default function SessionDiversityGraph() {
  const [data, setData] = useState<SessionDiversityPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [includeMaindeck, setIncludeMaindeck] = useState(true);
  const [includeExtradeck, setIncludeExtradeck] = useState(true);
  const [includeSidedeck, setIncludeSidedeck] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await getSessionDiversity(includeMaindeck, includeExtradeck, includeSidedeck);
        if (result.success && result.dataPoints) {
          setData(result.dataPoints);
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
  }, [includeMaindeck, includeExtradeck, includeSidedeck]);

  if (loading) {
    return (
      <Paper sx={{ p: 3, backgroundColor: 'var(--bg-elevated)' }}>
        <Typography variant="h6" gutterBottom>
          Meta Diversity Over Time
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress size={24} />
        </Box>
      </Paper>
    );
  }

  if (error || data.length === 0) {
    return (
      <Paper sx={{ p: 3, backgroundColor: 'var(--bg-elevated)' }}>
        <Typography variant="h6" gutterBottom>
          Meta Diversity Over Time
        </Typography>
        <Typography color="var(--text-secondary)">
          {error || 'Not enough data to display'}
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, backgroundColor: 'var(--bg-elevated)' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
        <Typography variant="h6">
          Meta Diversity Over Time
        </Typography>
        <Tooltip
          title={
            <Box sx={{ p: 1 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                What This Shows:
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Tracks how different decks are from each other in each session. Shows whether the meta is diverse (many different strategies) or homogenous (everyone playing similar decks).
              </Typography>

              <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 'bold' }}>
                Reading The Graph:
              </Typography>
              <Typography variant="body2" sx={{ ml: 1 }}>
                • <strong>Higher values</strong> (60-80%+) = Very diverse meta, decks are quite different<br />
                • <strong>Mid values</strong> (40-60%) = Moderate diversity, some shared strategies<br />
                • <strong>Lower values</strong> (0-40%) = Homogenous meta, similar decks
              </Typography>

              <Typography variant="body2" sx={{ mt: 1, mb: 0.5, fontWeight: 'bold' }}>
                How It&apos;s Calculated:
              </Typography>
              <Typography variant="body2" sx={{ ml: 1 }}>
                Uses Jaccard distance to compare every pair of decks in a session. Averages all distances to get a single diversity score. 100% = completely different decks, 0% = identical decks.
              </Typography>

              <Typography variant="body2" sx={{ mt: 1, mb: 0.5, fontWeight: 'bold' }}>
                What To Look For:
              </Typography>
              <Typography variant="body2" sx={{ ml: 1 }}>
                • <strong>Upward trends</strong> = Meta becoming more diverse<br />
                • <strong>Downward trends</strong> = Meta converging to similar strategies<br />
                • <strong>Spikes</strong> = Experimental sessions with varied approaches<br />
                • <strong>Valleys</strong> = Settled meta with established top decks
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
        Average deck difference across all completed sessions
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="var(--text-secondary)" sx={{ mb: 0.5 }}>
          Include in comparison:
        </Typography>
        <FormGroup row>
          <FormControlLabel
            control={
              <Checkbox
                checked={includeMaindeck}
                onChange={(e) => setIncludeMaindeck(e.target.checked)}
                size="small"
              />
            }
            label="Maindeck"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={includeExtradeck}
                onChange={(e) => setIncludeExtradeck(e.target.checked)}
                size="small"
              />
            }
            label="Extra Deck"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={includeSidedeck}
                onChange={(e) => setIncludeSidedeck(e.target.checked)}
                size="small"
              />
            }
            label="Side Deck"
          />
        </FormGroup>
      </Box>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
          <XAxis
            dataKey="sessionNumber"
            stroke="var(--text-secondary)"
            label={{ value: 'Session Number', position: 'insideBottom', offset: -5, fill: 'var(--text-secondary)' }}
          />
          <YAxis
            stroke="var(--text-secondary)"
            label={{ value: 'Diversity Score (%)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)' }}
            domain={[0, 100]}
          />
          <RechartsTooltip
            contentStyle={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              color: 'var(--text-primary)'
            }}
            labelFormatter={(value) => `Session ${value}`}
            formatter={(value: number | undefined) => value !== undefined ? [`${value.toFixed(1)}%`, 'Diversity'] : ['N/A', 'Diversity']}
          />
          <Legend wrapperStyle={{ color: 'var(--text-primary)' }} />
          <Line
            type="monotone"
            dataKey="averageDiversity"
            stroke="var(--accent-primary)"
            strokeWidth={2}
            dot={{ fill: 'var(--accent-primary)', r: 4 }}
            activeDot={{ r: 6 }}
            name="Diversity Score"
          />
        </LineChart>
      </ResponsiveContainer>
    </Paper>
  );
}
