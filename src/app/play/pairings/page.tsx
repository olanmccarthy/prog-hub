"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Alert,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { getPairings, updatePairing, PairingData } from "./actions";
import {
  getStandings,
  PlayerStanding,
  canFinalizeStandings,
  finalizeStandings,
  checkIsAdmin,
  checkIsFinalized
} from "../standings/actions";

type ViewMode = "pairings" | "standings";
type GroupBy = "round" | "player";

export default function PairingsPage() {
  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>("pairings");

  // Pairings state
  const [pairings, setPairings] = useState<PairingData[]>([]);
  const [groupBy, setGroupBy] = useState<GroupBy>("round");

  // Standings state
  const [standings, setStandings] = useState<PlayerStanding[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canFinalize, setCanFinalize] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  // Shared state
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
      console.error('Error checking admin status:', err);
    }
  };

  const checkCanFinalize = async (sessionId: number) => {
    try {
      const result = await canFinalizeStandings(sessionId);
      setCanFinalize(result.canFinalize);
    } catch (err) {
      console.error('Error checking finalize status:', err);
    }
  };

  const checkFinalized = async (sessionId: number) => {
    try {
      const result = await checkIsFinalized(sessionId);
      setIsFinalized(result.isFinalized);
    } catch (err) {
      console.error('Error checking finalized status:', err);
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

  const handleFinalizeClick = () => {
    setConfirmDialogOpen(true);
  };

  const handleConfirmFinalize = async () => {
    if (!sessionId) return;

    setFinalizing(true);
    try {
      const result = await finalizeStandings(sessionId);

      if (result.success) {
        setIsFinalized(true);
        setCanFinalize(false);
        setConfirmDialogOpen(false);
        // Refresh standings to show updated state
        await fetchStandings();
      } else {
        setError(result.error || "Failed to finalize standings");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to finalize");
    } finally {
      setFinalizing(false);
    }
  };

  const handleUpdatePairing = async (
    pairingId: number,
    player1wins: number,
    player2wins: number
  ) => {
    try {
      const result = await updatePairing(pairingId, player1wins, player2wins);

      if (result.success && result.pairing) {
        setPairings((prevPairings) =>
          prevPairings.map((p) =>
            p.id === pairingId ? result.pairing! : p
          )
        );
        setError(null);

        // Refresh standings if in standings view
        if (viewMode === "standings") {
          fetchStandings();
        }
      } else {
        setError(result.error || "Failed to update pairing");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const handleWinsChange = (
    pairingId: number,
    player: "player1" | "player2",
    value: string
  ) => {
    const wins = Math.max(0, Math.min(2, parseInt(value) || 0));
    const pairing = pairings.find((p) => p.id === pairingId);
    if (!pairing) return;

    const player1wins = player === "player1" ? wins : pairing.player1wins;
    const player2wins = player === "player2" ? wins : pairing.player2wins;

    handleUpdatePairing(pairingId, player1wins, player2wins);
  };

  const groupPairings = () => {
    if (groupBy === "round") {
      const grouped: { [round: number]: PairingData[] } = {};
      pairings.forEach((pairing) => {
        if (!grouped[pairing.round]) {
          grouped[pairing.round] = [];
        }
        grouped[pairing.round].push(pairing);
      });
      return grouped;
    } else {
      const grouped: { [playerName: string]: PairingData[] } = {};
      pairings.forEach((pairing) => {
        if (!grouped[pairing.player1.name]) {
          grouped[pairing.player1.name] = [];
        }
        grouped[pairing.player1.name].push(pairing);

        if (!grouped[pairing.player2.name]) {
          grouped[pairing.player2.name] = [];
        }
        grouped[pairing.player2.name].push(pairing);
      });

      Object.keys(grouped).forEach((playerName) => {
        grouped[playerName].sort((a, b) => a.round - b.round);
      });

      return grouped;
    }
  };

  const renderPairingCard = (pairing: PairingData, highlightPlayer?: string) => {
    // For player grouping, show a simpler layout
    if (groupBy === "player") {
      const opponentName = highlightPlayer === pairing.player1.name
        ? pairing.player2.name
        : pairing.player1.name;
      const playerIsPlayer1 = highlightPlayer === pairing.player1.name;
      const playerWins = playerIsPlayer1 ? pairing.player1wins : pairing.player2wins;
      const opponentWins = playerIsPlayer1 ? pairing.player2wins : pairing.player1wins;

      return (
        <Box key={pairing.id} sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Box
            sx={{
              backgroundColor: "var(--grey-badge)",
              px: 2,
              py: 0.5,
              borderRadius: "12px 12px 0 0",
              mb: -0.5,
            }}
          >
            <Typography variant="caption">
              Round {pairing.round}
            </Typography>
          </Box>
          <Paper
            sx={{
              p: 2,
              display: "flex",
              alignItems: "center",
              gap: 2,
              minWidth: 250,
              maxWidth: 400,
              width: "100%",
            }}
          >
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography
                variant="body1"
                sx={{
                  fontWeight: "bold",
                  color: "primary.main",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {highlightPlayer}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {opponentName}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, flexShrink: 0 }}>
              <TextField
                type="number"
                size="small"
                value={playerWins}
                onChange={(e) =>
                  handleWinsChange(
                    pairing.id,
                    playerIsPlayer1 ? "player1" : "player2",
                    e.target.value
                  )
                }
                inputProps={{ min: 0, max: 2, style: { textAlign: "center" } }}
                sx={{ width: "60px" }}
              />
              <TextField
                type="number"
                size="small"
                value={opponentWins}
                onChange={(e) =>
                  handleWinsChange(
                    pairing.id,
                    playerIsPlayer1 ? "player2" : "player1",
                    e.target.value
                  )
                }
                inputProps={{ min: 0, max: 2, style: { textAlign: "center" } }}
                sx={{ width: "60px" }}
              />
            </Box>
          </Paper>
        </Box>
      );
    }

    // Round grouping layout
    return (
      <Paper
        key={pairing.id}
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          gap: 2,
          flex: "1 1 0",
          minWidth: 0,
        }}
      >
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography variant="body1">
            {pairing.player1.name}
          </Typography>
          <Typography variant="body1">
            {pairing.player2.name}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, flexShrink: 0 }}>
          <TextField
            type="number"
            size="small"
            value={pairing.player1wins}
            onChange={(e) =>
              handleWinsChange(pairing.id, "player1", e.target.value)
            }
            inputProps={{ min: 0, max: 2, style: { textAlign: "center" } }}
            sx={{ width: "60px" }}
          />
          <TextField
            type="number"
            size="small"
            value={pairing.player2wins}
            onChange={(e) =>
              handleWinsChange(pairing.id, "player2", e.target.value)
            }
            inputProps={{ min: 0, max: 2, style: { textAlign: "center" } }}
            sx={{ width: "60px" }}
          />
        </Box>
      </Paper>
    );
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  const groupedPairings = groupPairings();

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: "auto" }}>
      {/* Header with View Toggle */}
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        {/* View Mode Toggle - Left Side */}
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, newValue) => {
            if (newValue !== null) setViewMode(newValue);
          }}
          aria-label="view mode"
        >
          <ToggleButton value="pairings" aria-label="pairings view">
            Pairings
          </ToggleButton>
          <ToggleButton value="standings" aria-label="standings view">
            Standings
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Title - Center/Right */}
        <Typography variant="h4" sx={{ flex: 1, textAlign: "center" }}>
          {viewMode === "pairings" ? "Pairings" : "Standings"}
          {sessionId && (
            <Typography
              component="span"
              variant="h5"
              sx={{ ml: 2, color: "primary.main", fontWeight: "normal" }}
            >
              Session {sessionId}
            </Typography>
          )}
        </Typography>

        {/* Pairings Group Toggle - Right Side (only shown in pairings view) */}
        {viewMode === "pairings" && (
          <ToggleButtonGroup
            value={groupBy}
            exclusive
            onChange={(_, newValue) => {
              if (newValue !== null) setGroupBy(newValue);
            }}
            aria-label="group by"
          >
            <ToggleButton value="round" aria-label="group by round">
              By Round
            </ToggleButton>
            <ToggleButton value="player" aria-label="group by player">
              By Player
            </ToggleButton>
          </ToggleButtonGroup>
        )}

        {/* Placeholder for layout balance in standings view */}
        {viewMode === "standings" && <Box sx={{ width: 200 }} />}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Pairings View */}
      {viewMode === "pairings" && (
        <>
          {Object.keys(groupedPairings).length === 0 ? (
            <Paper sx={{ p: 3, textAlign: "center" }}>
              <Typography color="text.secondary">
                No pairings found for the current session.
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={3}>
              {Object.entries(groupedPairings).map(([key, pairings]) => (
                <Box key={key}>
                  <Typography variant="h5" sx={{ mb: 2 }}>
                    {groupBy === "round" ? `Round ${key}` : key}
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 2,
                    }}
                  >
                    {pairings.map((pairing) =>
                      renderPairingCard(
                        pairing,
                        groupBy === "player" ? key : undefined
                      )
                    )}
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </>
      )}

      {/* Standings View */}
      {viewMode === "standings" && (
        <>
          {isFinalized && (
            <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 2 }}>
              Standings have been finalized. Decklists are now public.
            </Alert>
          )}

          {isAdmin && canFinalize && !isFinalized && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>All matches are complete. You can finalize standings.</span>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleFinalizeClick}
                  sx={{ ml: 2 }}
                >
                  Finalize Standings
                </Button>
              </Box>
            </Alert>
          )}

          {standings.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: "center" }}>
              <Typography color="text.secondary">
                No standings available yet.
              </Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Rank</TableCell>
                    <TableCell>Player</TableCell>
                    <TableCell align="center">Match Record</TableCell>
                    <TableCell align="center">Game Record</TableCell>
                    <TableCell align="center">OMW%</TableCell>
                    <TableCell align="center">GW%</TableCell>
                    <TableCell align="center">OGW%</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {standings.map((standing) => (
                    <TableRow key={standing.playerId}>
                      <TableCell>{standing.rank}</TableCell>
                      <TableCell>{standing.playerName}</TableCell>
                      <TableCell align="center">
                        {standing.matchWins}-{standing.matchLosses}-{standing.matchDraws}
                      </TableCell>
                      <TableCell align="center">
                        {standing.gameWins}-{standing.gameLosses}
                      </TableCell>
                      <TableCell align="center">
                        {standing.omw ? `${(standing.omw * 100).toFixed(2)}%` : 'N/A'}
                      </TableCell>
                      <TableCell align="center">
                        {standing.gw ? `${(standing.gw * 100).toFixed(2)}%` : 'N/A'}
                      </TableCell>
                      <TableCell align="center">
                        {standing.ogw ? `${(standing.ogw * 100).toFixed(2)}%` : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {/* Finalize Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>Finalize Standings?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to finalize the standings? This will:
          </Typography>
          <ul>
            <li>Lock the final rankings for this session</li>
            <li>Make all decklists publicly viewable</li>
            <li>Allow Victory Point assignment</li>
          </ul>
          <Typography sx={{ mt: 2, fontWeight: 'bold' }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)} disabled={finalizing}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmFinalize}
            variant="contained"
            disabled={finalizing}
          >
            {finalizing ? 'Finalizing...' : 'Finalize'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
