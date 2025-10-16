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
} from "@mui/material";
import { getPairings, updatePairing, PairingData } from "@/src/app/actions/pairings";

type GroupBy = "round" | "player";

export default function PairingsPage() {
  const [pairings, setPairings] = useState<PairingData[]>([]);
  const [groupBy, setGroupBy] = useState<GroupBy>("round");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);

  useEffect(() => {
    fetchPairings();
  }, []);

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
            <Typography variant="caption" sx={{ color: "#ffffff" }}>
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
              backgroundColor: "var(--grey-100)",
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
                  color: "#ffffff",
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
                inputProps={{ min: 0, max: 2, style: { textAlign: "center", color: "#ffffff" } }}
                sx={{
                  width: "60px",
                  "& .MuiOutlinedInput-root": {
                    color: "#ffffff",
                    "& fieldset": {
                      borderColor: "#ffffff",
                      borderWidth: "1px",
                    },
                    "&:hover fieldset": {
                      borderColor: "var(--accent-blue)",
                      borderWidth: "1px",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "var(--accent-blue)",
                      borderWidth: "2px",
                    },
                  },
                  "& input[type=number]": {
                    MozAppearance: "textfield",
                  },
                  "& input[type=number]::-webkit-outer-spin-button": {
                    WebkitAppearance: "none",
                    margin: 0,
                  },
                  "& input[type=number]::-webkit-inner-spin-button": {
                    WebkitAppearance: "none",
                    margin: 0,
                  },
                }}
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
                inputProps={{ min: 0, max: 2, style: { textAlign: "center", color: "#ffffff" } }}
                sx={{
                  width: "60px",
                  "& .MuiOutlinedInput-root": {
                    color: "#ffffff",
                    "& fieldset": {
                      borderColor: "#ffffff",
                      borderWidth: "1px",
                    },
                    "&:hover fieldset": {
                      borderColor: "var(--accent-blue)",
                      borderWidth: "1px",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "var(--accent-blue)",
                      borderWidth: "2px",
                    },
                  },
                  "& input[type=number]": {
                    MozAppearance: "textfield",
                  },
                  "& input[type=number]::-webkit-outer-spin-button": {
                    WebkitAppearance: "none",
                    margin: 0,
                  },
                  "& input[type=number]::-webkit-inner-spin-button": {
                    WebkitAppearance: "none",
                    margin: 0,
                  },
                }}
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
          backgroundColor: "var(--grey-100)",
        }}
      >
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography
            variant="body1"
            sx={{
              color: "#ffffff",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {pairing.player1.name}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: "#ffffff",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
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
            inputProps={{ min: 0, max: 2, style: { textAlign: "center", color: "#ffffff" } }}
            sx={{
              width: "60px",
              "& .MuiOutlinedInput-root": {
                color: "#ffffff",
                "& fieldset": {
                  borderColor: "#ffffff",
                  borderWidth: "1px",
                },
                "&:hover fieldset": {
                  borderColor: "var(--accent-blue)",
                  borderWidth: "1px",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "var(--accent-blue)",
                  borderWidth: "2px",
                },
              },
              "& input[type=number]": {
                MozAppearance: "textfield",
              },
              "& input[type=number]::-webkit-outer-spin-button": {
                WebkitAppearance: "none",
                margin: 0,
              },
              "& input[type=number]::-webkit-inner-spin-button": {
                WebkitAppearance: "none",
                margin: 0,
              },
            }}
          />
          <TextField
            type="number"
            size="small"
            value={pairing.player2wins}
            onChange={(e) =>
              handleWinsChange(pairing.id, "player2", e.target.value)
            }
            inputProps={{ min: 0, max: 2, style: { textAlign: "center", color: "#ffffff" } }}
            sx={{
              width: "60px",
              "& .MuiOutlinedInput-root": {
                color: "#ffffff",
                "& fieldset": {
                  borderColor: "#ffffff",
                  borderWidth: "1px",
                },
                "&:hover fieldset": {
                  borderColor: "var(--accent-blue)",
                  borderWidth: "1px",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "var(--accent-blue)",
                  borderWidth: "2px",
                },
              },
              "& input[type=number]": {
                MozAppearance: "textfield",
              },
              "& input[type=number]::-webkit-outer-spin-button": {
                WebkitAppearance: "none",
                margin: 0,
              },
              "& input[type=number]::-webkit-inner-spin-button": {
                WebkitAppearance: "none",
                margin: 0,
              },
            }}
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
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h4">
          Pairings
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
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <ToggleButtonGroup
          value={groupBy}
          exclusive
          onChange={(_, newValue) => {
            if (newValue !== null) setGroupBy(newValue);
          }}
          aria-label="group by"
          sx={{
            "& .MuiToggleButton-root": {
              color: "rgba(255, 255, 255, 0.7)",
              borderColor: "rgba(255, 255, 255, 0.23)",
              "&.Mui-selected": {
                backgroundColor: "primary.main",
                color: "primary.contrastText",
                borderColor: "primary.main",
                "&:hover": {
                  backgroundColor: "primary.dark",
                },
              },
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.08)",
              },
            },
          }}
        >
          <ToggleButton value="round" aria-label="group by round">
            Group by Round
          </ToggleButton>
          <ToggleButton value="player" aria-label="group by player">
            Group by Player
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

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
    </Box>
  );
}
