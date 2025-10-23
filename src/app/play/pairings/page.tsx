"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  getPairings,
  updatePairing,
  PairingData,
  getStandings,
  PlayerStanding,
  canFinalizeStandings,
  finalizeStandings,
  checkIsAdmin,
  checkIsFinalized,
} from "./actions";
import { PairingsView } from "./components/PairingsView";
import { StandingsView } from "./components/StandingsView";

type ViewMode = "pairings" | "standings";
type GroupBy = "round" | "player";

export default function PairingsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("pairings");
  const [pairings, setPairings] = useState<PairingData[]>([]);
  const [groupBy, setGroupBy] = useState<GroupBy>("round");
  const [standings, setStandings] = useState<PlayerStanding[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canFinalize, setCanFinalize] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);

  useEffect(() => {
    checkAdmin();
    fetchPairings();
  }, []);

  useEffect(() => {
    if (viewMode === "standings" && sessionId) {
      fetchStandings();
      checkCanFinalize(sessionId);
      checkFinalized(sessionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, sessionId]);

  const checkAdmin = async () => {
    try {
      const result = await checkIsAdmin();
      setIsAdmin(result.isAdmin);
    } catch (err) {
      console.error("Error checking admin status:", err);
    }
  };

  const checkCanFinalize = async (sessionId: number) => {
    try {
      const result = await canFinalizeStandings(sessionId);
      setCanFinalize(result.canFinalize);
    } catch (err) {
      console.error("Error checking finalize status:", err);
    }
  };

  const checkFinalized = async (sessionId: number) => {
    try {
      const result = await checkIsFinalized(sessionId);
      setIsFinalized(result.isFinalized);
    } catch (err) {
      console.error("Error checking finalized status:", err);
    }
  };

  const fetchPairings = async () => {
    try {
      setLoading(true);
      const result = await getPairings();

      if (result.success && result.pairings) {
        setPairings(result.pairings);
        setSessionId(result.sessionId || null);
        setError(null);
      } else {
        setError(result.error || "Failed to fetch pairings");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchStandings = async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      const result = await getStandings(sessionId);

      if (result.success && result.standings) {
        setStandings(result.standings);
        setError(null);
      } else {
        setError(result.error || "Failed to fetch standings");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateWins = async (
    pairingId: number,
    player: "player1" | "player2",
    wins: number
  ) => {
    const clampedWins = Math.max(0, Math.min(2, wins));

    // Find current pairing to get both win counts
    const currentPairing = pairings.find((p) => p.id === pairingId);
    if (!currentPairing) return;

    const player1wins = player === "player1" ? clampedWins : currentPairing.player1wins;
    const player2wins = player === "player2" ? clampedWins : currentPairing.player2wins;

    // Optimistic update
    setPairings((prev) =>
      prev.map((p) =>
        p.id === pairingId
          ? {
              ...p,
              player1wins,
              player2wins,
            }
          : p
      )
    );

    try {
      const result = await updatePairing(pairingId, player1wins, player2wins);
      if (!result.success) {
        setError(result.error || "Failed to update pairing");
        fetchPairings();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update pairing");
      fetchPairings();
    }
  };

  const handleFinalizeClick = () => {
    setConfirmDialogOpen(true);
  };

  const handleConfirmFinalize = async () => {
    if (!sessionId) return;

    setFinalizing(true);
    try {
      const result = await finalizeStandings(sessionId);

      if (result.success) {
        setConfirmDialogOpen(false);
        await fetchStandings();
        await checkFinalized(sessionId);
        setError(null);
      } else {
        setError(result.error || "Failed to finalize standings");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to finalize standings"
      );
    } finally {
      setFinalizing(false);
    }
  };

  const handleCancelFinalize = () => {
    setConfirmDialogOpen(false);
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
      <Typography variant="h4" sx={{ mb: 3, color: "var(--text-bright)" }}>
        Pairings & Standings
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3, display: "flex", justifyContent: "center" }}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, value) => value && setViewMode(value)}
          sx={{
            "& .MuiToggleButton-root": {
              color: "var(--text-secondary)",
              borderColor: "var(--border-color)",
              "&.Mui-selected": {
                backgroundColor: "var(--accent-primary)",
                color: "var(--text-bright)",
                "&:hover": {
                  backgroundColor: "var(--accent-blue-hover)",
                },
              },
            },
          }}
        >
          <ToggleButton value="pairings">Pairings</ToggleButton>
          <ToggleButton value="standings">Standings</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {viewMode === "pairings" ? (
        <PairingsView
          pairings={pairings}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          onUpdateWins={handleUpdateWins}
        />
      ) : (
        <StandingsView
          standings={standings}
          isAdmin={isAdmin}
          canFinalize={canFinalize}
          isFinalized={isFinalized}
          confirmDialogOpen={confirmDialogOpen}
          finalizing={finalizing}
          onFinalizeClick={handleFinalizeClick}
          onConfirmFinalize={handleConfirmFinalize}
          onCancelFinalize={handleCancelFinalize}
        />
      )}
    </Box>
  );
}
