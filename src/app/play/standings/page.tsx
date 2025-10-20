"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { getStandings, PlayerStanding, getSessions, SessionInfo, canFinalizeStandings, finalizeStandings, checkIsAdmin, checkIsFinalized } from "./actions";

export default function StandingsPage() {
  const [standings, setStandings] = useState<PlayerStanding[]>([]);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canFinalize, setCanFinalize] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  useEffect(() => {
    checkAdmin();
    fetchSessions();
  }, []);

  useEffect(() => {
    if (selectedSessionId !== null) {
      fetchStandings(selectedSessionId);
      checkCanFinalize(selectedSessionId);
      checkFinalized(selectedSessionId);
    }
  }, [selectedSessionId]);

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

  const fetchSessions = async () => {
    try {
      const result = await getSessions();

      if (result.success && result.sessions) {
        setSessions(result.sessions);
        // Set the most recent session as default
        if (result.sessions.length > 0) {
          setSelectedSessionId(result.sessions[0].id);
        }
        setError(null);
      } else {
        setError(result.error || "Failed to fetch sessions");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const fetchStandings = async (sessionId: number) => {
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

  const handleSessionChange = (event: SelectChangeEvent<number>) => {
    setSelectedSessionId(event.target.value as number);
  };

  const handleFinalizeClick = () => {
    setConfirmDialogOpen(true);
  };

  const handleFinalizeConfirm = async () => {
    if (!selectedSessionId) return;

    try {
      setFinalizing(true);
      setError(null);
      const result = await finalizeStandings(selectedSessionId);

      if (result.success) {
        setConfirmDialogOpen(false);
        setCanFinalize(false);
        setIsFinalized(true);
        // Refresh standings
        await fetchStandings(selectedSessionId);
      } else {
        setError(result.error || 'Failed to finalize standings');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to finalize');
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
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
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
        <Typography variant="h4">Standings</Typography>

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel
            id="session-select-label"
            sx={{
              color: "rgba(255, 255, 255, 0.7)",
              "&.Mui-focused": {
                color: "var(--accent-blue)",
              }
            }}
          >
            Session
          </InputLabel>
          <Select
            labelId="session-select-label"
            id="session-select"
            value={selectedSessionId || ""}
            label="Session"
            onChange={handleSessionChange}
            sx={{
              color: "#ffffff",
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "#ffffff",
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: "var(--accent-blue)",
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: "var(--accent-blue)",
              },
              "& .MuiSvgIcon-root": {
                color: "#ffffff",
              },
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  backgroundColor: "var(--grey-100)",
                  "& .MuiMenuItem-root": {
                    color: "#ffffff",
                    "&:hover": {
                      backgroundColor: "var(--grey-200)",
                    },
                    "&.Mui-selected": {
                      backgroundColor: "var(--grey-300)",
                      "&:hover": {
                        backgroundColor: "var(--grey-200)",
                      },
                    },
                  },
                },
              },
            }}
          >
            {sessions.map((session, index) => (
              <MenuItem key={session.id} value={session.id}>
                {index === 0
                  ? "Current"
                  : `Session ${session.number}${session.date ? ` (${new Date(session.date).toLocaleDateString()})` : ''}`
                }
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {standings.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: "center", backgroundColor: "var(--grey-100)" }}>
          <Typography color="text.secondary">
            No standings found for the current session.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ backgroundColor: "var(--grey-100)" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: "#ffffff", fontWeight: "bold" }}>
                  Rank
                </TableCell>
                <TableCell sx={{ color: "#ffffff", fontWeight: "bold" }}>
                  Player
                </TableCell>
                <TableCell align="center" sx={{ color: "#ffffff", fontWeight: "bold" }}>
                  Match W-L-D
                </TableCell>
                <TableCell align="center" sx={{ color: "#ffffff", fontWeight: "bold" }}>
                  Game W-L
                </TableCell>
                <TableCell
                  align="center"
                  sx={{ color: "#ffffff", fontWeight: "bold" }}
                  title="Game wins in matches you lost"
                >
                  GW in Losses
                </TableCell>
                <TableCell
                  align="center"
                  sx={{ color: "#ffffff", fontWeight: "bold" }}
                  title="Game losses in matches you won"
                >
                  GL in Wins
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {standings.map((standing, index) => (
                <TableRow
                  key={standing.playerId}
                  sx={{
                    "&:hover": {
                      backgroundColor: "var(--grey-200)",
                    },
                    backgroundColor: index === 0
                      ? "rgba(0, 122, 204, 0.1)"
                      : "transparent",
                  }}
                >
                  <TableCell sx={{ color: "#ffffff" }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      {standing.rank === 1 && (
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            backgroundColor: "var(--accent-blue)",
                          }}
                        />
                      )}
                      <Typography sx={{ color: "#ffffff" }}>
                        {standing.rank}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: "#ffffff" }}>
                    <Typography
                      sx={{
                        color: standing.rank === 1 ? "primary.main" : "#ffffff",
                        fontWeight: standing.rank === 1 ? "bold" : "normal",
                      }}
                    >
                      {standing.playerName}
                    </Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ color: "#ffffff" }}>
                    {standing.matchWins}-{standing.matchLosses}-{standing.matchDraws}
                  </TableCell>
                  <TableCell align="center" sx={{ color: "#ffffff" }}>
                    {standing.gameWins}-{standing.gameLosses}
                  </TableCell>
                  <TableCell align="center" sx={{ color: "#ffffff" }}>
                    {standing.gameWinsInLosses}
                  </TableCell>
                  <TableCell align="center" sx={{ color: "#ffffff" }}>
                    {standing.gameLossesInWins}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {isAdmin && standings.length > 0 && (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            startIcon={<CheckCircleIcon />}
            onClick={handleFinalizeClick}
            disabled={isFinalized || !canFinalize || finalizing}
            sx={{
              backgroundColor: isFinalized
                ? '#4caf50'
                : canFinalize
                  ? 'var(--accent-primary)'
                  : 'var(--grey-300)',
              '&:hover': {
                backgroundColor: isFinalized
                  ? '#4caf50'
                  : canFinalize
                    ? 'var(--accent-hover)'
                    : 'var(--grey-300)',
              },
              '&:disabled': {
                backgroundColor: isFinalized ? '#4caf50' : 'var(--grey-300)',
                color: isFinalized ? '#ffffff' : 'var(--text-secondary)',
              },
            }}
          >
            {finalizing ? 'Finalizing...' : isFinalized ? 'Standings Finalized' : 'Finalize Standings'}
          </Button>
        </Box>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={handleCancelFinalize}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
          },
        }}
      >
        <DialogTitle sx={{ color: 'var(--text-bright)' }}>
          Finalize Standings?
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'var(--text-primary)' }}>
            Are you sure you want to finalize these standings? This will record the top 6 placements for this session and cannot be undone.
          </Typography>
          <Box sx={{ mt: 2, p: 2, backgroundColor: 'var(--bg-tertiary)', borderRadius: 1 }}>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 1 }}>
              <strong>Top 6 Placements:</strong>
            </Typography>
            {standings.slice(0, 6).map((standing, index) => (
              <Typography key={standing.playerId} sx={{ color: 'var(--text-primary)' }}>
                {index + 1}. {standing.playerName}
              </Typography>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={handleCancelFinalize}
            disabled={finalizing}
            sx={{
              color: 'var(--text-primary)',
              '&:hover': {
                backgroundColor: 'var(--bg-tertiary)',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleFinalizeConfirm}
            variant="contained"
            disabled={finalizing}
            sx={{
              backgroundColor: 'var(--accent-primary)',
              '&:hover': {
                backgroundColor: 'var(--accent-hover)',
              },
            }}
          >
            {finalizing ? <CircularProgress size={24} /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
