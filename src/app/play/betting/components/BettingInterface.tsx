"use client";

import { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Button,
  Alert,
} from "@mui/material";
import OddsDisplay from "./OddsDisplay";
import BetConfirmation from "./BetConfirmation";

interface Player {
  id: number;
  name: string;
  odds: number;
}

interface BettingInterfaceProps {
  players: Player[];
  maxBet: number;
  currentPlayerId: number;
  onPlaceBet: (targetPlayerId: number, betAmount: number) => Promise<void>;
  onSkipBet: () => Promise<void>;
}

export default function BettingInterface({
  players,
  maxBet,
  currentPlayerId,
  onPlaceBet,
  onSkipBet,
}: BettingInterfaceProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState<number>(1);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId);
  const potentialPayout = selectedPlayer
    ? Math.floor(betAmount * selectedPlayer.odds)
    : 0;

  const isBettingOnSelf = selectedPlayerId === currentPlayerId;

  const handlePlaceBet = async () => {
    if (!selectedPlayerId) return;

    setIsSubmitting(true);
    try {
      await onPlaceBet(selectedPlayerId, betAmount);
      setConfirmOpen(false);
    } catch (error) {
      console.error("Error placing bet:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Odds Display */}
      <OddsDisplay
        players={players}
        selectedPlayerId={selectedPlayerId ?? undefined}
        onPlayerSelect={setSelectedPlayerId}
      />

      {/* Betting Form */}
      <Paper sx={{ p: 3, backgroundColor: "var(--bg-elevated)" }}>
        <Typography variant="h6" gutterBottom sx={{ color: "var(--text-primary)" }}>
          Place Your Bet
        </Typography>

        {/* Player Selection */}
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel
            sx={{
              color: "var(--text-secondary)",
              "&.Mui-focused": { color: "var(--accent-primary)" },
            }}
          >
            Select Player
          </InputLabel>
          <Select
            value={selectedPlayerId ?? ""}
            onChange={(e) => setSelectedPlayerId(Number(e.target.value))}
            label="Select Player"
            sx={{
              color: "var(--text-primary)",
              backgroundColor: "var(--input-bg)",
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "var(--input-border)",
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: "var(--accent-primary)",
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: "var(--accent-primary)",
              },
            }}
          >
            {players.map((player) => (
              <MenuItem key={player.id} value={player.id}>
                {player.name} ({player.odds.toFixed(2)}x)
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {isBettingOnSelf && (
          <Alert severity="info" sx={{ mt: 2 }}>
            You are betting on yourself! 🎯
          </Alert>
        )}

        {/* Bet Amount Slider */}
        {selectedPlayerId && (
          <Box sx={{ mt: 3 }}>
            <Typography gutterBottom sx={{ color: "var(--text-secondary)" }}>
              Bet Amount: {betAmount} points
            </Typography>
            <Slider
              value={betAmount}
              onChange={(_, value) => setBetAmount(value as number)}
              min={1}
              max={maxBet}
              step={1}
              marks={[
                { value: 1, label: "1" },
                { value: Math.floor(maxBet / 2), label: String(Math.floor(maxBet / 2)) },
                { value: maxBet, label: String(maxBet) },
              ]}
              sx={{
                color: "var(--accent-primary)",
                "& .MuiSlider-thumb": {
                  backgroundColor: "var(--accent-primary)",
                },
                "& .MuiSlider-track": {
                  backgroundColor: "var(--accent-primary)",
                },
                "& .MuiSlider-rail": {
                  backgroundColor: "var(--border-color)",
                },
                "& .MuiSlider-mark": {
                  backgroundColor: "var(--border-color)",
                },
                "& .MuiSlider-markLabel": {
                  color: "var(--text-secondary)",
                },
              }}
            />
          </Box>
        )}

        {/* Payout Preview */}
        {selectedPlayer && (
          <Box
            sx={{
              mt: 3,
              p: 2,
              backgroundColor: "var(--bg-secondary)",
              borderRadius: 1,
              border: "1px solid var(--border-color)",
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <Typography sx={{ color: "var(--text-secondary)" }}>
                Betting on:
              </Typography>
              <Typography sx={{ color: "var(--text-primary)", fontWeight: "bold" }}>
                {selectedPlayer.name}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <Typography sx={{ color: "var(--text-secondary)" }}>
                Amount:
              </Typography>
              <Typography sx={{ color: "var(--text-primary)" }}>
                {betAmount} points
              </Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <Typography sx={{ color: "var(--text-secondary)" }}>
                Odds:
              </Typography>
              <Typography sx={{ color: "var(--text-primary)" }}>
                {selectedPlayer.odds.toFixed(2)}x
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mt: 2,
                pt: 2,
                borderTop: "1px solid var(--border-color)",
              }}
            >
              <Typography sx={{ color: "var(--text-primary)", fontWeight: "bold" }}>
                Potential Payout:
              </Typography>
              <Typography
                sx={{
                  color: "var(--success)",
                  fontWeight: "bold",
                  fontSize: "1.2rem",
                }}
              >
                {potentialPayout} points
              </Typography>
            </Box>
          </Box>
        )}

        {/* Place Bet Button */}
        <Button
          fullWidth
          variant="contained"
          disabled={!selectedPlayerId || isSubmitting}
          onClick={() => setConfirmOpen(true)}
          sx={{
            mt: 3,
            py: 1.5,
            backgroundColor: "var(--accent-primary)",
            color: "var(--text-bright)",
            fontWeight: "bold",
            "&:hover": {
              backgroundColor: "var(--accent-blue-hover)",
            },
            "&:disabled": {
              backgroundColor: "var(--grey-300)",
              color: "var(--text-secondary)",
            },
          }}
        >
          {isSubmitting ? "Placing Bet..." : "Place Bet"}
        </Button>

        {/* Skip Betting Button */}
        <Button
          fullWidth
          variant="outlined"
          disabled={isSubmitting}
          onClick={async () => {
            if (confirm("Are you sure you want to skip betting? You won't be able to change this decision.")) {
              await onSkipBet();
            }
          }}
          sx={{
            mt: 2,
            py: 1.5,
            borderColor: "var(--text-secondary)",
            color: "var(--text-secondary)",
            "&:hover": {
              borderColor: "var(--text-primary)",
              backgroundColor: "var(--hover-light-grey)",
            },
            "&:disabled": {
              borderColor: "var(--grey-300)",
              color: "var(--text-secondary)",
            },
          }}
        >
          {isSubmitting ? "Processing..." : "Skip Betting"}
        </Button>

        <Typography
          variant="caption"
          sx={{ color: "var(--text-secondary)", mt: 2, display: "block", textAlign: "center" }}
        >
          You can either place a bet or skip. This decision cannot be changed.
        </Typography>
      </Paper>

      {/* Confirmation Dialog */}
      {selectedPlayer && (
        <BetConfirmation
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={handlePlaceBet}
          playerName={selectedPlayer.name}
          betAmount={betAmount}
          odds={selectedPlayer.odds}
          potentialPayout={potentialPayout}
        />
      )}
    </Box>
  );
}
