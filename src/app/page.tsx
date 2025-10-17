"use client";

import { useEffect, useState } from "react";
import { Container, Typography, Box, Paper, Alert } from "@mui/material";
import YdkUploadBox from "@components/YdkUploadBox";
import { getMostRecentBanlist } from "./actions";
import type { BanlistData } from "@lib/deckValidator";

export default function Home() {
  const [banlist, setBanlist] = useState<BanlistData | null>(null);
  const [sessionNumber, setSessionNumber] = useState<number | undefined>(
    undefined
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBanlist() {
      try {
        const result = await getMostRecentBanlist();
        if (result.success && result.banlist) {
          setBanlist(result.banlist);
          setSessionNumber(result.sessionNumber);
        } else {
          setError(result.error || "Failed to load banlist");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchBanlist();
  }, []);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h3"
          component="h1"
          sx={{
            color: "var(--text-bright)",
            mb: 2,
            fontWeight: "bold",
          }}
        >
          Progression Hub
        </Typography>
        <Typography
          variant="h6"
          sx={{ color: "var(--text-secondary)", mb: 4 }}
        >
          Yu-Gi-Oh! Progression Series Tournament Management
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
            backgroundColor: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
          }}
        >
          <Typography sx={{ color: "var(--text-primary)" }}>
            Loading banlist...
          </Typography>
        </Paper>
      ) : (
        <YdkUploadBox banlist={banlist} sessionNumber={sessionNumber} />
      )}

      <Box sx={{ mt: 4 }}>
        <Paper
          sx={{
            p: 3,
            backgroundColor: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
          }}
        >
          <Typography
            variant="h5"
            sx={{ color: "var(--text-bright)", mb: 2 }}
          >
            Welcome to Progression Hub
          </Typography>
          <Typography sx={{ color: "var(--text-primary)", mb: 2 }}>
            This application manages Yu-Gi-Oh! progression series tournaments,
            including:
          </Typography>
          <ul style={{ color: "var(--text-primary)" }}>
            <li>Deck submission and validation</li>
            <li>Banlist management and voting</li>
            <li>Match pairings and results</li>
            <li>Tournament standings and statistics</li>
          </ul>
          <Typography sx={{ color: "var(--text-secondary)", mt: 2 }}>
            Use the deck validator above to check if your deck is legal for the
            current progression format.
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
}
