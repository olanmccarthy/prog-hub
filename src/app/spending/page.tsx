"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
  ToggleButtonGroup,
  ToggleButton,
  TableRow,
  TableCell,
} from "@mui/material";
import { StyledTable } from "@components/StyledTable";
import { StatusAlert } from "@components/StatusAlert";
import {
  getSpendingHistory,
  getPlayerList,
  type SpendingHistoryItem,
} from "./actions";

export default function SpendingHistoryPage() {
  const [transactions, setTransactions] = useState<SpendingHistoryItem[]>([]);
  const [players, setPlayers] = useState<Array<{ id: number; name: string }>>(
    []
  );
  const [selectedPlayer, setSelectedPlayer] = useState<number | "all">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch player list on mount
  useEffect(() => {
    async function fetchPlayers() {
      const result = await getPlayerList();
      if (result.success && result.data) {
        setPlayers(result.data);
      }
    }
    fetchPlayers();
  }, []);

  // Fetch transactions whenever filters change
  useEffect(() => {
    async function fetchTransactions() {
      setLoading(true);
      setError(null);

      const result = await getSpendingHistory(
        selectedPlayer === "all" ? undefined : selectedPlayer,
        sortOrder
      );

      if (result.success && result.data) {
        setTransactions(result.data);
      } else {
        setError(result.error || "Failed to fetch spending history");
      }

      setLoading(false);
    }

    fetchTransactions();
  }, [selectedPlayer, sortOrder]);

  const handlePlayerChange = (event: SelectChangeEvent<number | "all">) => {
    setSelectedPlayer(event.target.value as number | "all");
  };

  const handleSortChange = (
    _event: React.MouseEvent<HTMLElement>,
    newSort: "newest" | "oldest" | null
  ) => {
    if (newSort !== null) {
      setSortOrder(newSort);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ mb: 3, color: "var(--text-primary)" }}>
        Spending History
      </Typography>

      {error && (
        <StatusAlert
          message={error}
          severity="error"
          onClose={() => setError(null)}
        />
      )}

      {/* Filters */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 3,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {/* Player Filter */}
        <FormControl sx={{ minWidth: 200 }}>
          <Typography
            variant="body2"
            sx={{ mb: 0.5, color: "var(--text-secondary)" }}
          >
            Filter by Player
          </Typography>
          <Select
            value={selectedPlayer}
            onChange={handlePlayerChange}
            sx={{
              backgroundColor: "var(--input-bg)",
              color: "var(--text-primary)",
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "var(--input-border)",
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: "var(--accent-primary)",
              },
            }}
          >
            <MenuItem value="all">All Players</MenuItem>
            {players.map((player) => (
              <MenuItem key={player.id} value={player.id}>
                {player.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Sort Order */}
        <Box>
          <Typography
            variant="body2"
            sx={{ mb: 0.5, color: "var(--text-secondary)" }}
          >
            Sort by Date
          </Typography>
          <ToggleButtonGroup
            value={sortOrder}
            exclusive
            onChange={handleSortChange}
            sx={{
              "& .MuiToggleButton-root": {
                color: "var(--text-primary)",
                borderColor: "var(--border-color)",
                "&.Mui-selected": {
                  backgroundColor: "var(--accent-primary)",
                  color: "var(--text-bright)",
                  "&:hover": {
                    backgroundColor: "var(--accent-secondary)",
                  },
                },
                "&:hover": {
                  backgroundColor: "var(--hover-light-grey)",
                },
              },
            }}
          >
            <ToggleButton value="newest">Newest First</ToggleButton>
            <ToggleButton value="oldest">Oldest First</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* Transactions Table */}
      {loading ? (
        <Typography sx={{ color: "var(--text-secondary)" }}>
          Loading...
        </Typography>
      ) : (
        <StyledTable
          columns={[
            { label: "Date", align: "left" },
            { label: "Player", align: "left" },
            { label: "Set Purchased", align: "left" },
            { label: "Amount", align: "right" },
            { label: "Session", align: "left" },
          ]}
          isEmpty={transactions.length === 0}
          emptyMessage="No transactions found."
        >
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>{formatDate(transaction.date)}</TableCell>
              <TableCell>{transaction.playerName}</TableCell>
              <TableCell>{transaction.setName}</TableCell>
              <TableCell align="right">{transaction.amount}</TableCell>
              <TableCell>
                {transaction.sessionNumber
                  ? `Session ${transaction.sessionNumber}`
                  : "—"}
              </TableCell>
            </TableRow>
          ))}
        </StyledTable>
      )}

      {/* Summary */}
      {!loading && transactions.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography
            variant="body2"
            sx={{ color: "var(--text-secondary)", fontStyle: "italic" }}
          >
            Total transactions: {transactions.length} | Total amount spent:{" "}
            {transactions.reduce((sum, t) => sum + t.amount, 0)}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
