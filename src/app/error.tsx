'use client';

import { useEffect } from 'react';
import { Box, Typography, Button, Container } from '@mui/material';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console or error reporting service
    console.error('Error boundary caught:', error);
  }, [error]);

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          textAlign: 'center',
          py: 4,
        }}
      >
        <Typography variant="h4" component="h2" gutterBottom>
          Something went wrong
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          An error occurred while rendering this page. Please try again.
        </Typography>
        {error.message && (
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'monospace',
              backgroundColor: 'grey.100',
              p: 2,
              borderRadius: 1,
              mb: 3,
              maxWidth: '100%',
              overflow: 'auto',
            }}
          >
            {error.message}
          </Typography>
        )}
        <Button variant="contained" onClick={reset}>
          Try again
        </Button>
      </Box>
    </Container>
  );
}
