import { redirect } from "next/navigation";
import { getCurrentUser } from "@lib/auth";
import { Container, Typography, Paper, Alert, Box } from "@mui/material";
import BettingClient from "./BettingClient";
import { getBettingStatus } from "./actions";

export default async function BettingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const result = await getBettingStatus();

  if (!result.success) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3, backgroundColor: "var(--bg-elevated)" }}>
          <Alert severity="error">{result.error}</Alert>
        </Paper>
      </Container>
    );
  }

  // Gambling not enabled
  if (!result.gamblingEnabled) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4, backgroundColor: "var(--bg-elevated)", textAlign: "center" }}>
          <Typography variant="h4" gutterBottom sx={{ color: "var(--text-primary)" }}>
            🎰 Gambling
          </Typography>
          <Typography variant="body1" sx={{ color: "var(--text-secondary)" }}>
            Gambling is not enabled for the current session.
          </Typography>
          <Typography variant="body2" sx={{ color: "var(--text-secondary)", mt: 2 }}>
            When the event wheel spins &quot;Gambling Event&quot;, you&apos;ll be able to bet on
            the tournament winner here!
          </Typography>
        </Paper>
      </Container>
    );
  }

  // Betting window closed (no pairings generated yet)
  if (!result.bettingWindowOpen && !result.currentBet) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4, backgroundColor: "var(--bg-elevated)", textAlign: "center" }}>
          <Typography variant="h4" gutterBottom sx={{ color: "var(--text-primary)" }}>
            🎰 Gambling
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            Betting window will open after all players submit their decklists and
            the event wheel is spun.
          </Alert>
        </Paper>
      </Container>
    );
  }

  // Betting window closed after pairings (but user didn't place bet)
  if (!result.bettingWindowOpen && !result.currentBet) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4, backgroundColor: "var(--bg-elevated)", textAlign: "center" }}>
          <Typography variant="h4" gutterBottom sx={{ color: "var(--text-primary)" }}>
            🎰 Gambling
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Betting window is closed. Pairings have been generated.
          </Alert>
          <Typography variant="body2" sx={{ color: "var(--text-secondary)", mt: 2 }}>
            You did not place a bet for this session.
          </Typography>
        </Paper>
      </Container>
    );
  }

  // Insufficient balance
  if (result.canBet && (result.maxBet ?? 0) < 1) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4, backgroundColor: "var(--bg-elevated)", textAlign: "center" }}>
          <Typography variant="h4" gutterBottom sx={{ color: "var(--text-primary)" }}>
            🎰 Gambling
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Insufficient wallet balance. You need at least 1 wallet point to place a bet.
          </Alert>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ color: "var(--text-primary)" }}>
          🎰 Gambling
        </Typography>
        <Typography variant="body1" sx={{ color: "var(--text-secondary)" }}>
          Bet wallet points on who you think will win the tournament!
        </Typography>
      </Box>

      <BettingClient
        initialData={result}
        currentPlayerId={user.playerId}
      />
    </Container>
  );
}
