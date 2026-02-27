"use client";

import { useState } from "react";
import { Alert, Snackbar } from "@mui/material";
import BettingInterface from "./components/BettingInterface";
import BettingStatus from "./components/BettingStatus";
import { placeBet, skipBetting } from "./actions";

interface Player {
  id: number;
  name: string;
  odds: number;
}

interface CurrentBet {
  targetPlayerId: number;
  targetPlayerName: string;
  betAmount: number;
  odds: number;
  potentialPayout: number;
  status: string;
  actualPayout?: number;
}

interface BettingClientProps {
  initialData: {
    gamblingEnabled: boolean;
    canBet: boolean;
    players?: Player[];
    currentBet?: CurrentBet;
    maxBet?: number;
  };
  currentPlayerId: number;
}

export default function BettingClient({
  initialData,
  currentPlayerId,
}: BettingClientProps) {
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  const handlePlaceBet = async (targetPlayerId: number, betAmount: number) => {
    const result = await placeBet(targetPlayerId, betAmount);

    if (result.success) {
      setSnackbar({
        open: true,
        message: result.message,
        severity: "success",
      });
      // Page will revalidate and show the bet status
      window.location.reload();
    } else {
      setSnackbar({
        open: true,
        message: result.error,
        severity: "error",
      });
    }
  };

  const handleSkipBet = async () => {
    const result = await skipBetting();

    if (result.success) {
      setSnackbar({
        open: true,
        message: result.message,
        severity: "success",
      });
      // Page will revalidate
      window.location.reload();
    } else {
      setSnackbar({
        open: true,
        message: result.error,
        severity: "error",
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Show current bet if exists
  if (initialData.currentBet) {
    return (
      <>
        <BettingStatus
          targetPlayerName={initialData.currentBet.targetPlayerName}
          betAmount={initialData.currentBet.betAmount}
          odds={initialData.currentBet.odds}
          potentialPayout={initialData.currentBet.potentialPayout}
          status={initialData.currentBet.status as "pending" | "won" | "lost" | "void"}
          actualPayout={initialData.currentBet.actualPayout}
        />
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </>
    );
  }

  // Show betting interface if can bet
  if (initialData.canBet && initialData.players && initialData.maxBet) {
    return (
      <>
        <BettingInterface
          players={initialData.players}
          maxBet={initialData.maxBet}
          currentPlayerId={currentPlayerId}
          onPlaceBet={handlePlaceBet}
          onSkipBet={handleSkipBet}
        />
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </>
    );
  }

  return null;
}
