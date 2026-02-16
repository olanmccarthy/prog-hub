import { Box, Typography, Chip, IconButton, Divider } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import { CategoryCard } from '@components/CategoryCard';
import type { BanlistSuggestionForVoting } from '../actions';

interface VotingBanlistCardProps {
  suggestion: BanlistSuggestionForVoting;
  isOwnSuggestion: boolean;
  isSelected: boolean;
  hasSubmitted: boolean;
  isVoted: boolean;
  onToggleVote: (id: number) => void;
  showModeratorControls: boolean;
  isChosen: boolean;
  onSelectWinner: (id: number) => void;
  number: number;
}

/**
 * Reusable card component displaying a single banlist suggestion with card names.
 * Adapts UI based on context: shows thumbs-up icon for voting, crown icon for
 * moderator selection, and chips for status (Your Suggestion, Voted).
 * Card names are provided directly from the suggestion data (pre-fetched server-side).
 */
export function VotingBanlistCard({
  suggestion,
  isOwnSuggestion,
  isSelected,
  hasSubmitted,
  isVoted,
  onToggleVote,
  showModeratorControls,
  isChosen,
  onSelectWinner,
  number,
}: VotingBanlistCardProps) {
  return (
    <>
      <Box sx={{ flex: 1 }}>
        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            mb: 1,
            minHeight: 32,
          }}
        >
          <Typography
            variant="h5"
            sx={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}
          >
            Suggestion {number}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, position: 'absolute', right: 0 }}>
            {isOwnSuggestion && (
              <Chip label="Your Suggestion" color="primary" size="small" />
            )}
            {hasSubmitted && isVoted && (
              <Chip
                icon={<CheckCircleIcon />}
                label="Voted"
                color="success"
                size="small"
              />
            )}
          </Box>
        </Box>
        <Divider
          sx={{
            borderColor: 'var(--border-color)',
            borderBottomWidth: 2,
            my: 2,
          }}
        />

        <CategoryCard title="Banned" cards={suggestion.bannedNames} />
        <CategoryCard title="Limited" cards={suggestion.limitedNames} />
        <CategoryCard
          title="Semi-Limited"
          cards={suggestion.semilimitedNames}
        />
        <CategoryCard title="Unlimited" cards={suggestion.unlimitedNames} />

        {suggestion.comment && (
          <Box
            sx={{
              mt: 2,
              p: 2,
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: 1,
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{ color: 'var(--text-secondary)', mb: 1, fontWeight: 'bold' }}
            >
              Player&apos;s Comment:
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: 'var(--text-primary)',
                fontStyle: 'italic',
                whiteSpace: 'pre-wrap',
              }}
            >
              &quot;{suggestion.comment}&quot;
            </Typography>
          </Box>
        )}
      </Box>

      {!isOwnSuggestion && !hasSubmitted && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            mt: 'auto',
            pt: 2,
          }}
        >
          <IconButton onClick={() => onToggleVote(suggestion.id)}>
            {isSelected ? (
              <ThumbUpIcon sx={{ fontSize: 40, color: '#4caf50' }} />
            ) : (
              <ThumbUpOutlinedIcon sx={{ fontSize: 40 }} />
            )}
          </IconButton>
        </Box>
      )}

      {showModeratorControls && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            mt: 'auto',
            pt: 2,
          }}
        >
          <IconButton onClick={() => onSelectWinner(suggestion.id)}>
            {isChosen ? (
              <CheckCircleIcon sx={{ fontSize: 40, color: '#4caf50' }} />
            ) : (
              <CheckCircleOutlineIcon sx={{ fontSize: 40 }} />
            )}
          </IconButton>
        </Box>
      )}
    </>
  );
}
