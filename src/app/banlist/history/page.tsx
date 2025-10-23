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
import { getBanlistHistory, type BanlistHistoryItem } from './actions';
import { getCardEntriesFromIds } from '@lib/cardLookup';

interface BanlistWithNames {
  banned: Array<{ id: number; name: string }>;
  limited: Array<{ id: number; name: string }>;
  semilimited: Array<{ id: number; name: string }>;
  unlimited: Array<{ id: number; name: string }>;
}

function BanlistCardList({
  cards,
  emptyMessage,
}: {
  cards: Array<{ id: number; name: string }>;
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
      {cards.map((card) => (
        <Typography
          key={card.id}
          variant="body2"
          sx={{ mb: 0.5, color: 'var(--text-primary)' }}
        >
          {card.name}
        </Typography>
      ))}
    </Box>
  );
}

function BanlistHistoryCard({
  banlist,
  banlistWithNames,
  viewMode,
}: {
  banlist: BanlistHistoryItem;
  banlistWithNames: BanlistWithNames | null;
  viewMode: 'image' | 'text';
}) {
  const isLoading = !banlistWithNames;

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
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : viewMode === 'image' ? (
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
              src={`/banlist-images/${banlist.sessionId}.png`}
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
        ) : banlistWithNames ? (
          <>
            <Typography
              variant="h6"
              sx={{ color: 'var(--text-bright)', mb: 2, fontWeight: 'bold' }}
            >
              Banned ({banlistWithNames.banned.length})
            </Typography>
            <BanlistCardList
              cards={banlistWithNames.banned}
              emptyMessage="No banned cards"
            />

            <Divider sx={{ my: 2, borderColor: 'var(--border-color)' }} />

            <Typography
              variant="h6"
              sx={{ color: 'var(--text-bright)', mb: 2, fontWeight: 'bold' }}
            >
              Limited ({banlistWithNames.limited.length})
            </Typography>
            <BanlistCardList
              cards={banlistWithNames.limited}
              emptyMessage="No limited cards"
            />

            <Divider sx={{ my: 2, borderColor: 'var(--border-color)' }} />

            <Typography
              variant="h6"
              sx={{ color: 'var(--text-bright)', mb: 2, fontWeight: 'bold' }}
            >
              Semi-Limited ({banlistWithNames.semilimited.length})
            </Typography>
            <BanlistCardList
              cards={banlistWithNames.semilimited}
              emptyMessage="No semi-limited cards"
            />

            <Divider sx={{ my: 2, borderColor: 'var(--border-color)' }} />

            <Typography
              variant="h6"
              sx={{ color: 'var(--text-bright)', mb: 2, fontWeight: 'bold' }}
            >
              Unlimited ({banlistWithNames.unlimited.length})
            </Typography>
            <BanlistCardList
              cards={banlistWithNames.unlimited}
              emptyMessage="No cards moved to unlimited"
            />
          </>
        ) : null}
      </AccordionDetails>
    </Accordion>
  );
}

export default function BanlistHistoryPage() {
  const [banlists, setBanlists] = useState<BanlistHistoryItem[]>([]);
  const [banlistsWithNames, setBanlistsWithNames] = useState<
    Map<number, BanlistWithNames>
  >(new Map());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'image' | 'text'>('image');

  useEffect(() => {
    fetchBanlistHistory();
  }, []);

  const fetchBanlistHistory = async () => {
    setLoading(true);
    setError(null);

    const result = await getBanlistHistory();

    if (result.success) {
      setBanlists(result.banlists);

      // Preload card names for all banlists
      const namesMap = new Map<number, BanlistWithNames>();

      for (const banlist of result.banlists) {
        const [banned, limited, semilimited, unlimited] = await Promise.all([
          getCardEntriesFromIds(banlist.banned),
          getCardEntriesFromIds(banlist.limited),
          getCardEntriesFromIds(banlist.semilimited),
          getCardEntriesFromIds(banlist.unlimited),
        ]);

        namesMap.set(banlist.id, { banned, limited, semilimited, unlimited });
      }

      setBanlistsWithNames(namesMap);
    } else {
      setError(result.error || 'Failed to load banlist history');
    }

    setLoading(false);
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
              banlistWithNames={banlistsWithNames.get(banlist.id) || null}
              viewMode={viewMode}
            />
          ))}
        </Box>
      )}
    </Container>
  );
}
