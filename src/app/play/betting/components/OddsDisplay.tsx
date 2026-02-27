"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Tooltip,
  IconButton,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

interface Player {
  id: number;
  name: string;
  odds: number;
}

interface OddsDisplayProps {
  players: Player[];
  selectedPlayerId?: number;
  onPlayerSelect?: (playerId: number) => void;
}

export default function OddsDisplay({
  players,
  selectedPlayerId,
  onPlayerSelect,
}: OddsDisplayProps) {
  // Sort players by odds (ascending - best odds first)
  const sortedPlayers = [...players].sort((a, b) => a.odds - b.odds);

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Typography variant="h6">
          Current Odds
        </Typography>
        <Tooltip
          title={
            <Box sx={{ p: 1, maxWidth: 500 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
                Odds Calculation Formula
              </Typography>

              <Typography variant="body2" sx={{ mb: 1, fontFamily: "monospace", fontSize: "0.85rem" }}>
                Score = Recent Placement × 0.33 +
              </Typography>
              <Typography variant="body2" sx={{ mb: 1, fontFamily: "monospace", fontSize: "0.85rem", pl: 4 }}>
                Match Win Rate × 0.23 +
              </Typography>
              <Typography variant="body2" sx={{ mb: 1, fontFamily: "monospace", fontSize: "0.85rem", pl: 4 }}>
                Spending Pattern × 0.12 +
              </Typography>
              <Typography variant="body2" sx={{ mb: 1, fontFamily: "monospace", fontSize: "0.85rem", pl: 4 }}>
                Deck Adaptation × 0.12 +
              </Typography>
              <Typography variant="body2" sx={{ mb: 1, fontFamily: "monospace", fontSize: "0.85rem", pl: 4 }}>
                Consistency × 0.13 +
              </Typography>
              <Typography variant="body2" sx={{ mb: 1, fontFamily: "monospace", fontSize: "0.85rem", pl: 4 }}>
                2-0 Rate × 0.07
              </Typography>

              <Typography variant="body2" sx={{ mt: 1.5, mb: 0.5, fontStyle: "italic" }}>
                + Moderator Bonus: +5 (if last session&apos;s moderator)
              </Typography>

              <Typography variant="body2" sx={{ mt: 1.5, mb: 1, fontWeight: "bold" }}>
                Then normalized and converted to odds:
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                Odds = 1.2 + (1 - normalized) × 3.8
              </Typography>

              <Typography variant="caption" sx={{ display: "block", mt: 1.5, fontStyle: "italic" }}>
                Higher scores = lower odds (better chance to win)
                <br />
                Range: 1.2x (best) to 5.0x (worst)
              </Typography>
            </Box>
          }
          arrow
          placement="right"
          componentsProps={{
            tooltip: {
              sx: {
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border-color)",
                color: "var(--text-primary)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                "& .MuiTooltip-arrow": {
                  color: "var(--bg-elevated)",
                  "&::before": {
                    border: "1px solid var(--border-color)",
                  },
                },
              },
            },
          }}
        >
          <IconButton
            size="small"
            sx={{
              color: "var(--text-secondary)",
              "&:hover": {
                color: "var(--accent-primary)",
                backgroundColor: "var(--hover-light-grey)",
              },
            }}
          >
            <InfoOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <TableContainer component={Paper} sx={{ backgroundColor: "var(--bg-elevated)" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: "var(--text-primary)", fontWeight: "bold" }}>
                Player
              </TableCell>
              <TableCell align="right" sx={{ color: "var(--text-primary)", fontWeight: "bold" }}>
                Odds
              </TableCell>
              <TableCell align="right" sx={{ color: "var(--text-primary)", fontWeight: "bold" }}>
                Payout (per 1pt)
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedPlayers.map((player) => {
              const isSelected = selectedPlayerId === player.id;
              return (
                <TableRow
                  key={player.id}
                  onClick={() => onPlayerSelect?.(player.id)}
                  sx={{
                    cursor: onPlayerSelect ? "pointer" : "default",
                    backgroundColor: isSelected
                      ? "var(--accent-primary)"
                      : "transparent",
                    "&:hover": onPlayerSelect
                      ? {
                          backgroundColor: isSelected
                            ? "var(--accent-primary)"
                            : "var(--hover-light-grey)",
                        }
                      : {},
                  }}
                >
                  <TableCell
                    sx={{
                      color: isSelected
                        ? "var(--text-bright)"
                        : "var(--text-primary)",
                      fontWeight: isSelected ? "bold" : "normal",
                    }}
                  >
                    {player.name}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color: isSelected
                        ? "var(--text-bright)"
                        : "var(--text-primary)",
                      fontWeight: isSelected ? "bold" : "normal",
                    }}
                  >
                    {player.odds.toFixed(2)}x
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color: isSelected
                        ? "var(--text-bright)"
                        : "var(--text-secondary)",
                    }}
                  >
                    {player.odds.toFixed(2)} pts
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography
        variant="caption"
        sx={{ color: "var(--text-secondary)", mt: 1, display: "block" }}
      >
        Lower odds = higher chance of winning (according to the algorithm)
      </Typography>
    </Box>
  );
}
