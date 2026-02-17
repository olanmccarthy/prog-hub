'use client';

import { useState } from 'react';
import { Box, Typography } from '@mui/material';

interface CardImageProps {
  cardId: number;
  alt?: string;
  width?: number | string;
  height?: number | string;
}

/**
 * Styled overlay shown when a card image fails to load.
 * Displays the card name as fallback text. Positioned absolutely
 * so it fills whatever container it's placed in.
 */
function CardImagePlaceholder({ text }: { text: string }) {
  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        borderRadius: 0.5,
        backgroundColor: 'var(--bg-tertiary)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 1,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: 'var(--text-secondary)',
          textAlign: 'center',
          fontStyle: 'italic',
          wordBreak: 'break-word',
          fontSize: '0.7rem',
        }}
      >
        {text}
      </Typography>
    </Box>
  );
}

// Transparent SVG sized to match actual card images (421x614).
// Used as a fallback src so the <img> retains intrinsic dimensions when the real image fails.
const TRANSPARENT_CARD_SVG = '/card-placeholder.svg';

/**
 * Renders a card image from the public/card-images directory.
 * Falls back to a CardPlaceholder overlay if the image fails to load.
 * The <img> always remains in the DOM to define the container size,
 * so the placeholder exactly matches the dimensions of a real card.
 */
export function CardImage({ cardId, alt = '', width = 110, height = 'auto' }: CardImageProps) {
  const [failed, setFailed] = useState(false);

  return (
    <Box sx={{ position: 'relative', width, height }}>
      <Box
        component="img"
        src={failed ? TRANSPARENT_CARD_SVG : `/card-images/${cardId}.png`}
        alt={alt}
        onError={() => setFailed(true)}
        sx={{
          width: '100%',
          height: '100%',
          borderRadius: 0.5,
          objectFit: 'cover',
        }}
      />
      {failed && <CardImagePlaceholder text={alt} />}
    </Box>
  );
}
