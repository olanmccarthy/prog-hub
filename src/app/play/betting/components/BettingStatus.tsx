"use client";

import { Box, Paper, Typography, Chip } from "@mui/material";

interface BettingStatusProps {
  targetPlayerName: string;
  betAmount: number;
  odds: number;
  potentialPayout: number;
  status: "pending" | "won" | "lost" | "void";
  actualPayout?: number;
}

export default function BettingStatus({
  targetPlayerName,
  betAmount,
  odds,
  potentialPayout,
  status,
  actualPayout,
}: BettingStatusProps) {
  const getStatusColor = () => {
    switch (status) {
      case "won":
        return "var(--success)";
      case "lost":
        return "var(--error)";
      case "void":
        return betAmount === 0 ? "var(--text-secondary)" : "var(--warning)";
      default:
        return "var(--info)";
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case "won":
        return "Won";
      case "lost":
        return "Lost";
      case "void":
        return betAmount === 0 ? "Skipped" : "Void";
      default:
        return "Pending";
    }
  };

  const isSkipped = status === "void" && betAmount === 0;

  return (
    <Paper
      sx={{
        p: 3,
        backgroundColor: "var(--bg-elevated)",
        border: `2px solid ${getStatusColor()}`,
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6" sx={{ color: "var(--text-primary)" }}>
          Your Bet
        </Typography>
        <Chip
          label={getStatusLabel()}
          sx={{
            backgroundColor: getStatusColor(),
            color: "var(--text-bright)",
            fontWeight: "bold",
          }}
        />
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {isSkipped ? (
          <Typography sx={{ color: "var(--text-secondary)", textAlign: "center", py: 2 }}>
            You chose to skip betting for this session.
          </Typography>
        ) : (
          <>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography sx={{ color: "var(--text-secondary)" }}>Bet On:</Typography>
              <Typography sx={{ color: "var(--text-primary)", fontWeight: "bold" }}>
                {targetPlayerName}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography sx={{ color: "var(--text-secondary)" }}>Amount:</Typography>
              <Typography sx={{ color: "var(--text-primary)" }}>
                {betAmount} points
              </Typography>
            </Box>

            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography sx={{ color: "var(--text-secondary)" }}>Odds:</Typography>
              <Typography sx={{ color: "var(--text-primary)" }}>
                {odds.toFixed(2)}x
              </Typography>
            </Box>
          </>
        )}

        {!isSkipped && status === "pending" && (
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography sx={{ color: "var(--text-secondary)" }}>
              Potential Payout:
            </Typography>
            <Typography sx={{ color: "var(--info)", fontWeight: "bold" }}>
              {potentialPayout} points
            </Typography>
          </Box>
        )}

        {!isSkipped && status === "won" && actualPayout !== undefined && (
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography sx={{ color: "var(--text-secondary)" }}>
              Payout:
            </Typography>
            <Typography sx={{ color: "var(--success)", fontWeight: "bold", fontSize: "1.2rem" }}>
              +{actualPayout} points
            </Typography>
          </Box>
        )}

        {!isSkipped && status === "lost" && (
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography sx={{ color: "var(--text-secondary)" }}>
              Result:
            </Typography>
            <Typography sx={{ color: "var(--error)", fontWeight: "bold" }}>
              No payout
            </Typography>
          </Box>
        )}
      </Box>

      {!isSkipped && status === "pending" && (
        <Typography
          variant="caption"
          sx={{ color: "var(--text-secondary)", mt: 2, display: "block" }}
        >
          Your bet will be resolved when the session standings are finalized.
        </Typography>
      )}
    </Paper>
  );
}
