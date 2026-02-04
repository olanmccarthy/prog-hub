'use client';

import { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ImageIcon from '@mui/icons-material/Image';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import { getBanlistHistory, regenerateBanlistImage, type BanlistHistoryItem } from './actions';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Button } from '@mui/material';

function BanlistCardList({
  cards,
  emptyMessage,
}: {
  cards: string[];
  emptyMessage: string;
}) {
  if (cards.length === 0) {
    return (
      <Typography sx={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
        {emptyMessage}
      </Typography>
    );
  }

  return (
    <Box sx={{ pl: 2 }}>
      {cards.map((cardName, index) => (
        <Typography
          key={index}
          variant="body2"
          sx={{ mb: 0.5, color: 'var(--text-primary)' }}
        >
          {cardName}
        </Typography>
      ))}
    </Box>
  );
}

function BanlistHistoryCard({
  banlist,
  viewMode,
  isAdmin,
  onRegenerate,
}: {
  banlist: BanlistHistoryItem;
  viewMode: 'image' | 'text';
  isAdmin?: boolean;
  onRegenerate?: (sessionNumber: number) => Promise<void>;
}) {
  const [regenerating, setRegenerating] = useState(false);

  const handleRegenerate = async () => {
    if (!onRegenerate) return;
    setRegenerating(true);
    try {
      await onRegenerate(banlist.sessionId);
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <Accordion
      defaultExpanded={false}
      sx={{
        mb: 2,
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        '&:before': {
          display: 'none',
        },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          backgroundColor: 'var(--bg-tertiary)',
          '&:hover': {
            backgroundColor: 'var(--hover-light-grey)',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
          <Typography
            variant="h6"
            sx={{
              color: 'var(--text-bright)',
              fontWeight: 'bold',
              minWidth: 150,
            }}
          >
            Session {banlist.sessionId}
          </Typography>
        </Box>
      </AccordionSummary>

      <AccordionDetails sx={{ backgroundColor: 'var(--bg-secondary)', pt: 3 }}>
        {viewMode === 'image' ? (
          <>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '400px',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/banlist-images/session-${banlist.sessionId}.png?t=${Date.now()}`}
                alt={`Banlist for Session ${banlist.sessionId}`}
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  display: 'block',
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = `<div style="color: var(--text-secondary); text-align: center; padding: 2rem;">Banlist image not yet generated. Please view in text mode.</div>`;
                  }
                }}
              />
            </Box>
            {isAdmin && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  sx={{
                    color: 'var(--accent-primary)',
                    borderColor: 'var(--accent-primary)',
                    '&:hover': {
                      borderColor: 'var(--accent-secondary)',
                      backgroundColor: 'var(--hover-light-grey)',
                    },
                  }}
                >
                  {regenerating ? 'Regenerating...' : 'Regenerate Image'}
                </Button>
              </Box>
            )}
          </>
        ) : (
          <>
            <Typography
              variant="h6"
              sx={{ color: 'var(--text-bright)', mb: 2, fontWeight: 'bold' }}
            >
              Banned ({banlist.bannedNames.length})
            </Typography>
            <BanlistCardList
              cards={banlist.bannedNames}
              emptyMessage="No banned cards"
            />

            <Divider sx={{ my: 2, borderColor: 'var(--border-color)' }} />

            <Typography
              variant="h6"
              sx={{ color: 'var(--text-bright)', mb: 2, fontWeight: 'bold' }}
            >
              Limited ({banlist.limitedNames.length})
            </Typography>
            <BanlistCardList
              cards={banlist.limitedNames}
              emptyMessage="No limited cards"
            />

            <Divider sx={{ my: 2, borderColor: 'var(--border-color)' }} />

            <Typography
              variant="h6"
              sx={{ color: 'var(--text-bright)', mb: 2, fontWeight: 'bold' }}
            >
              Semi-Limited ({banlist.semilimitedNames.length})
            </Typography>
            <BanlistCardList
              cards={banlist.semilimitedNames}
              emptyMessage="No semi-limited cards"
            />

            <Divider sx={{ my: 2, borderColor: 'var(--border-color)' }} />

            <Typography
              variant="h6"
              sx={{ color: 'var(--text-bright)', mb: 2, fontWeight: 'bold' }}
            >
              Unlimited ({banlist.unlimitedNames.length})
            </Typography>
            <BanlistCardList
              cards={banlist.unlimitedNames}
              emptyMessage="No cards moved to unlimited"
            />
          </>
        )}
      </AccordionDetails>
    </Accordion>
  );
}

export default function BanlistHistoryPage() {
  const [banlists, setBanlists] = useState<BanlistHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'image' | 'text'>('image');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check if user is admin from cookie/auth
    const checkAdmin = async () => {
      try {
        const response = await fetch('/api/auth/me');
        const data = await response.json();
        setIsAdmin(data.isAdmin || false);
      } catch {
        setIsAdmin(false);
      }
    };
    checkAdmin();
    fetchBanlistHistory();
  }, []);

  const fetchBanlistHistory = async () => {
    setLoading(true);
    setError(null);

    const result = await getBanlistHistory();

    if (result.success) {
      setBanlists(result.banlists);
    } else {
      setError(result.error || 'Failed to load banlist history');
    }

    setLoading(false);
  };

  const handleRegenerateBanlist = async (sessionNumber: number) => {
    const result = await regenerateBanlistImage(sessionNumber);
    if (result.success) {
      // Force reload the image by updating the timestamp
      window.location.reload();
    } else {
      setError(result.error || 'Failed to regenerate image');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              color: 'var(--text-bright)',
              fontWeight: 'bold',
            }}
          >
            Banlist History
          </Typography>

          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, newMode) => newMode && setViewMode(newMode)}
            size="small"
          >
            <ToggleButton value="image" aria-label="image view">
              <ImageIcon sx={{ mr: 1 }} />
              Image
            </ToggleButton>
            <ToggleButton value="text" aria-label="text view">
              <TextFieldsIcon sx={{ mr: 1 }} />
              Text
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Typography variant="body1" sx={{ color: 'var(--text-secondary)' }}>
          Browse all historical banlists in descending order (most recent
          first).
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Paper
          sx={{
            p: 3,
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 200,
          }}
        >
          <CircularProgress />
        </Paper>
      ) : banlists.length === 0 ? (
        <Paper
          sx={{
            p: 3,
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
          }}
        >
          <Typography sx={{ color: 'var(--text-secondary)' }}>
            No banlists found.
          </Typography>
        </Paper>
      ) : (
        <Box>
          <Typography
            variant="body2"
            sx={{ color: 'var(--text-secondary)', mb: 2 }}
          >
            Showing {banlists.length}{' '}
            {banlists.length === 1 ? 'banlist' : 'banlists'}
          </Typography>
          {banlists.map((banlist) => (
            <BanlistHistoryCard
              key={banlist.id}
              banlist={banlist}
              viewMode={viewMode}
              isAdmin={isAdmin}
              onRegenerate={handleRegenerateBanlist}
            />
          ))}
        </Box>
      )}
    </Container>
  );
}
