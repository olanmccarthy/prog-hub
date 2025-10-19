'use client';

import { useEffect, useState } from 'react';
import { Container, Typography, Box, Paper, Alert } from '@mui/material';
import { getMostRecentBanlist } from '../../actions';
import { getCardEntriesFromIds } from '@lib/cardLookup';
import { BanlistWithNames } from './actions';

interface CardWithName {
  id: number;
  name: string;
}

function BanlistCardItem({ card }: { card: CardWithName }) {
  return (
    <Typography key={card.id} variant="body1" sx={{ mb: 0.5 }}>
      {card.name}
      {/* Add images and NEW icon here when available*/}
    </Typography>
  );
}

function BanlistCategoryItems({
  cards,
  emptyMessage,
}: {
  cards: CardWithName[];
  emptyMessage: string;
}) {
  return (
    <Box sx={{ color: 'var(--text-primary)' }}>
      {cards.length > 0 ? (
        <Box sx={{ pl: 2 }}>
          {cards.map((card) => (
            <BanlistCardItem key={card.id} card={card} />
          ))}
        </Box>
      ) : (
        <Typography sx={{ color: 'var(--text-secondary)' }}>
          {emptyMessage}
        </Typography>
      )}
    </Box>
  );
}

function BanlistCategory({
  title,
  cards,
  emptyMessage,
}: {
  title: string;
  cards: CardWithName[];
  emptyMessage: string;
}) {
  return (
    <Paper
      sx={{
        p: 3,
        mb: 3,
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
      }}
    >
      <Typography variant="h5" sx={{ color: 'var(--text-bright)', mb: 2 }}>
        {title} ({cards.length})
      </Typography>
      <BanlistCategoryItems cards={cards} emptyMessage={emptyMessage} />
    </Paper>
  );
}

export default function CurrentBanlistPage() {
  const [banlist, setBanlist] = useState<BanlistWithNames | null>(null);
  const [sessionNumber, setSessionNumber] = useState<number | undefined>(
    undefined,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBanlist();
  }, []);

  const fetchBanlist = async () => {
    setLoading(true);
    setError(null);
    const result = await getMostRecentBanlist();
    if (result.success && result.banlist) {
      const [banned, limited, semilimited, unlimited] = await Promise.all([
        getCardEntriesFromIds(result.banlist.banned),
        getCardEntriesFromIds(result.banlist.limited),
        getCardEntriesFromIds(result.banlist.semilimited),
        getCardEntriesFromIds(result.banlist.unlimited),
      ]);

      setBanlist({ banned, limited, semilimited, unlimited });
      setSessionNumber(result.sessionNumber);
    } else {
      setError(result.error || 'Failed to load banlist');
    }
    setLoading(false);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h3"
          component="h1"
          sx={{
            color: 'var(--text-bright)',
            mb: 2,
            fontWeight: 'bold',
          }}
        >
          {sessionNumber !== undefined
            ? `Current Banlist (Session ${sessionNumber})`
            : 'Current Banlist'}
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
          }}
        >
          <Typography sx={{ color: 'var(--text-primary)' }}>
            Loading banlist...
          </Typography>
        </Paper>
      ) : banlist ? (
        <>
          <BanlistCategory
            title="Banned"
            cards={banlist.banned}
            emptyMessage="No banned cards"
          />
          <BanlistCategory
            title="Limited"
            cards={banlist.limited}
            emptyMessage="No limited cards"
          />
          <BanlistCategory
            title="Semi-Limited"
            cards={banlist.semilimited}
            emptyMessage="No semi-limited cards"
          />
          <BanlistCategory
            title="Unlimited"
            cards={banlist.unlimited}
            emptyMessage="No cards moved to unlimited"
          />
        </>
      ) : null}
    </Container>
  );
}
