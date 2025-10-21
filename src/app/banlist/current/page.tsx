'use client';

import { useEffect, useState } from 'react';
import { Container, Typography, Box, Paper, Alert, Chip } from '@mui/material';
import {
  getPreviousBanlist,
  getNewCards,
  getMostRecentBanlistBySession,
  type CurrentBanlist,
  type BanlistCardWithFlag,
} from './actions';

function BanlistCardItem({
  card,
  isNew,
}: {
  card: BanlistCardWithFlag;
  isNew?: boolean;
}) {
  return (
    <Box
      key={card.id}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        mb: 0.5,
      }}
    >
      <Typography variant="body1">{card.name}</Typography>
      {isNew && (
        <Chip
          label="NEW"
          size="small"
          sx={{
            backgroundColor: '#4caf50',
            color: 'white',
            fontWeight: 'bold',
            height: 20,
          }}
        />
      )}
    </Box>
  );
}

function BanlistCategoryItems({
  cards,
  emptyMessage,
}: {
  cards: BanlistCardWithFlag[];
  emptyMessage: string;
}) {
  return (
    <Box sx={{ color: 'var(--text-primary)' }}>
      {cards.length > 0 ? (
        <Box sx={{ pl: 2 }}>
          {cards.map((card) => (
            <BanlistCardItem
              key={card.id}
              card={card}
              isNew={card.isNew || false}
            />
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
  cards: BanlistCardWithFlag[];
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
  const [banlist, setBanlist] = useState<CurrentBanlist | null>(null);
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
    try {
      const result = await getMostRecentBanlistBySession();
      if (
        result.success &&
        result.banlist &&
        result.sessionNumber !== undefined
      ) {
        // Fetch previous banlist for comparison
        const prevResult = await getPreviousBanlist(result.sessionNumber);

        // Get new cards with comparison (passing card IDs, not card objects)
        const banlistWithNewFlags = await getNewCards(
          {
            banned: result.banlist.banned,
            limited: result.banlist.limited,
            semilimited: result.banlist.semilimited,
            unlimited: result.banlist.unlimited,
          },
          prevResult.success ? prevResult.banlist : null,
        );

        setBanlist(banlistWithNewFlags);
        setSessionNumber(result.sessionNumber);
      } else {
        setError(result.error || 'Failed to load banlist');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load banlist');
    } finally {
      setLoading(false);
    }
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
