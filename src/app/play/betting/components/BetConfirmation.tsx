"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
} from "@mui/material";

interface BetConfirmationProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  playerName: string;
  betAmount: number;
  odds: number;
  potentialPayout: number;
}

export default function BetConfirmation({
  open,
  onClose,
  onConfirm,
  playerName,
  betAmount,
  odds,
  potentialPayout,
}: BetConfirmationProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: "var(--bg-elevated)",
          border: "1px solid var(--border-color)",
        },
      }}
    >
      <DialogTitle sx={{ color: "var(--text-primary)" }}>
        Confirm Your Bet
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <Typography sx={{ color: "var(--text-secondary)" }}>
            Are you sure you want to place this bet?
          </Typography>

          <Divider sx={{ borderColor: "var(--border-color)" }} />

          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography sx={{ color: "var(--text-secondary)" }}>Betting On:</Typography>
            <Typography sx={{ color: "var(--text-primary)", fontWeight: "bold" }}>
              {playerName}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography sx={{ color: "var(--text-secondary)" }}>Amount:</Typography>
            <Typography sx={{ color: "var(--text-primary)", fontWeight: "bold" }}>
              {betAmount} points
            </Typography>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography sx={{ color: "var(--text-secondary)" }}>Odds:</Typography>
            <Typography sx={{ color: "var(--text-primary)", fontWeight: "bold" }}>
              {odds.toFixed(2)}x
            </Typography>
          </Box>

          <Divider sx={{ borderColor: "var(--border-color)" }} />

          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography sx={{ color: "var(--text-secondary)", fontSize: "1.1rem" }}>
              Potential Payout:
            </Typography>
            <Typography
              sx={{
                color: "var(--success)",
                fontWeight: "bold",
                fontSize: "1.3rem",
              }}
            >
              {potentialPayout} points
            </Typography>
          </Box>

          <Typography
            variant="caption"
            sx={{ color: "var(--text-secondary)", fontStyle: "italic" }}
          >
            Note: You can only place one bet per session. This action cannot be undone.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button
          onClick={onClose}
          sx={{
            color: "var(--text-primary)",
            "&:hover": {
              backgroundColor: "var(--hover-light-grey)",
            },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          sx={{
            backgroundColor: "var(--accent-primary)",
            color: "var(--text-bright)",
            "&:hover": {
              backgroundColor: "var(--accent-blue-hover)",
            },
          }}
        >
          Confirm Bet
        </Button>
      </DialogActions>
    </Dialog>
  );
}
