"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Alert,
  SelectChangeEvent,
  Divider,
  TextField,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import { Grid } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import ImageIcon from "@mui/icons-material/Image";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import RefreshIcon from "@mui/icons-material/Refresh";
import { Button } from "@mui/material";
import {
  getDecklists,
  getSessions,
  getPlayers,
  getCardNames,
  updateDecklistName,
  getCurrentUserInfo,
  regenerateDeckImage,
  DecklistWithDetails,
  SessionOption,
  PlayerOption,
  CurrentUserInfo,
} from "./actions";

const getOrdinalSuffix = (num: number): string => {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
};

export default function DecklistsPage() {
  const [decklists, setDecklists] = useState<DecklistWithDetails[]>([]);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [cardNames, setCardNames] = useState<Record<number, string>>({});
  const [currentUser, setCurrentUser] = useState<CurrentUserInfo | null>(null);

  const [selectedSession, setSelectedSession] = useState<number | "" | "all">("all");
  const [selectedPlayer, setSelectedPlayer] = useState<number | "" | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [isCurrentSession, setIsCurrentSession] = useState(false);
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [editingDecklistId, setEditingDecklistId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState<string>("");
  const [mostRecentSessionNumber, setMostRecentSessionNumber] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"image" | "text">("image");
  const [regeneratingDeckId, setRegeneratingDeckId] = useState<number | null>(null);

  // Load sessions and players on mount
  useEffect(() => {
    loadFilters();
  }, []);

  // Load decklists when filters change (but only after filters are loaded)
  useEffect(() => {
    if (filtersLoaded) {
      loadDecklists();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSession, selectedPlayer, filtersLoaded]);

  const loadFilters = async () => {
    const [sessionsRes, playersRes, userRes] = await Promise.all([
      getSessions(),
      getPlayers(),
      getCurrentUserInfo(),
    ]);

    if (sessionsRes.success && sessionsRes.data) {
      setSessions(sessionsRes.data);

      // Set default to current session
      if (sessionsRes.currentSessionId) {
        setSelectedSession(sessionsRes.currentSessionId);
      }

      // Find most recent session number (highest number)
      if (sessionsRes.data.length > 0) {
        const maxSessionNumber = Math.max(...sessionsRes.data.map(s => s.number));
        setMostRecentSessionNumber(maxSessionNumber);
      }
    }

    if (playersRes.success && playersRes.data) {
      setPlayers(playersRes.data);
    }

    if (userRes.success && userRes.data) {
      setCurrentUser(userRes.data);
    }

    setFiltersLoaded(true);
  };

  const loadDecklists = async () => {
    setLoading(true);
    setError("");

    const sessionId = selectedSession === "all" ? undefined : Number(selectedSession);
    const playerId = selectedPlayer === "all" ? undefined : Number(selectedPlayer);

    const result = await getDecklists(sessionId, playerId);

    if (result.success && result.data) {
      setDecklists(result.data);
      setIsCurrentSession(result.isCurrentSession || false);

      // Load card names for all cards in the decklists
      const allCardIds = new Set<number>();
      result.data.forEach(decklist => {
        decklist.maindeck.forEach(id => allCardIds.add(id));
        decklist.sidedeck.forEach(id => allCardIds.add(id));
        decklist.extradeck.forEach(id => allCardIds.add(id));
      });

      if (allCardIds.size > 0) {
        const cardNamesRes = await getCardNames(Array.from(allCardIds));
        if (cardNamesRes.success && cardNamesRes.data) {
          setCardNames(cardNamesRes.data);
        }
      }
    } else {
      setError(result.error || "Failed to load decklists");
    }

    setLoading(false);
  };

  const handleSessionChange = (event: SelectChangeEvent<number | "all">) => {
    setSelectedSession(event.target.value as number | "all");
  };

  const handlePlayerChange = (event: SelectChangeEvent<number | "all">) => {
    setSelectedPlayer(event.target.value as number | "all");
  };

  const getCardName = (cardId: number): string => {
    return cardNames[cardId] || `Card #${cardId}`;
  };

  const formatDeckSection = (cardIds: number[]): string[] => {
    const cardCounts: Record<string, number> = {};

    cardIds.forEach(id => {
      const name = getCardName(id);
      cardCounts[name] = (cardCounts[name] || 0) + 1;
    });

    return Object.entries(cardCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, count]) => (count > 1 ? `${count}x ${name}` : name));
  };

  const handleStartEdit = (decklistId: number, currentName: string | null) => {
    setEditingDecklistId(decklistId);
    setEditingName(currentName || "");
  };

  const handleCancelEdit = () => {
    setEditingDecklistId(null);
    setEditingName("");
  };

  const handleSaveEdit = async (decklistId: number) => {
    const result = await updateDecklistName(decklistId, editingName);
    if (result.success) {
      // Update the local state
      setDecklists(decklists.map(d =>
        d.id === decklistId ? { ...d, name: editingName.trim() || null } : d
      ));
      setEditingDecklistId(null);
      setEditingName("");
    } else {
      setError(result.error || "Failed to update deck name");
    }
  };

  const handleRegenerateDeck = async (decklistId: number) => {
    setRegeneratingDeckId(decklistId);
    try {
      const result = await regenerateDeckImage(decklistId);
      if (result.success) {
        // Force reload the image by updating the timestamp
        window.location.reload();
      } else {
        setError(result.error || "Failed to regenerate image");
      }
    } finally {
      setRegeneratingDeckId(null);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Decklists
      </Typography>

      <Typography variant="body1" sx={{ mb: 3 }}>
        View submitted decklists from all sessions. Current session decklists are hidden until
        standings are finalized.
      </Typography>

      {/* Filters and View Mode Toggle */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap", alignItems: "center" }}>
        <FormControl sx={{ minWidth: 250 }}>
          <InputLabel>Session</InputLabel>
          <Select value={selectedSession} label="Session" onChange={handleSessionChange}>
            <MenuItem value="all">All Sessions</MenuItem>
            {sessions.map(session => (
              <MenuItem key={session.id} value={session.id}>
                Session {session.number} - {session.setName || "Unknown"}
                {session.complete ? "" : " (Ongoing)"}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Player</InputLabel>
          <Select value={selectedPlayer} label="Player" onChange={handlePlayerChange}>
            <MenuItem value="all">All Players</MenuItem>
            {players.map(player => (
              <MenuItem key={player.id} value={player.id}>
                {player.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, newMode) => newMode && setViewMode(newMode)}
          size="small"
          sx={{ ml: "auto" }}
        >
          <ToggleButton value="image" aria-label="image view">
            <ImageIcon sx={{ mr: 1 }} />
            Image
          </ToggleButton>
          <ToggleButton value="text" aria-label="text view">
            <TextFieldsIcon sx={{ mr: 1 }} />
            Text
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Warning for current session */}
      {isCurrentSession && decklists.length > 0 && !decklists[0].standingsFinalized && (
        <Alert severity="info" sx={{ mb: 3 }}>
          You can only view your own decklist for the current session. All decklists will be
          visible once standings are finalized.
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Typography variant="body1">
          Loading decklists...
        </Typography>
      )}

      {/* No Decklists */}
      {!loading && decklists.length === 0 && (
        <Alert severity="info">No decklists found with the selected filters.</Alert>
      )}

      {/* Decklists Grid - Grouped by Session when viewing all sessions */}
      {!loading && decklists.length > 0 && (() => {
        // Group decklists by session
        const groupedDecklists = decklists.reduce((acc, decklist) => {
          const sessionKey = decklist.sessionId;
          if (!acc[sessionKey]) {
            acc[sessionKey] = {
              sessionNumber: decklist.sessionNumber,
              setName: decklist.setName,
              decklists: [],
            };
          }
          acc[sessionKey].decklists.push(decklist);
          return acc;
        }, {} as Record<number, { sessionNumber: number; setName: string | null; decklists: DecklistWithDetails[] }>);

        // Sort sessions by session number descending (newest first)
        const sessions = Object.values(groupedDecklists).sort((a, b) => b.sessionNumber - a.sessionNumber);
        const showSessionDividers = selectedSession === "all" && sessions.length > 1;

        return (
          <>
            {sessions.map((session, sessionIdx) => (
              <Box key={session.sessionNumber}>
                {/* Session Divider - only show when viewing all sessions and there are multiple sessions */}
                {showSessionDividers && (
                  <Box sx={{ mb: 3, mt: sessionIdx > 0 ? 4 : 0 }}>
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="h5" sx={{ fontWeight: "bold", mb: 2 }}>
                      Session {session.sessionNumber}
                      {session.setName && (
                        <Typography component="span" variant="h6" sx={{ ml: 2, color: "text.secondary" }}>
                          {session.setName}
                        </Typography>
                      )}
                    </Typography>
                  </Box>
                )}

                {/* Decklists for this session */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  {session.decklists.map(decklist => (
                    // @ts-expect-error MUI v7 Grid type definitions issue with item prop
                    <Grid
                      item
                      xs={12}
                      sm={12}
                      md={6}
                      lg={4}
                      key={decklist.id}
                      sx={{
                        '@media (min-width: 1280px)': {
                          maxWidth: 'calc(33.333% - 10.67px)',
                          flexBasis: 'calc(33.333% - 10.67px)',
                        }
                      }}
                    >
                      <Card sx={{ height: "100%", minHeight: "600px" }}>
                        <CardContent>
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "start", mb: 2 }}>
                            <Box sx={{ flex: 1 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                                <Typography variant="h6">{decklist.playerName}</Typography>
                                {decklist.matchRecord && (
                                  <Chip
                                    label={decklist.matchRecord}
                                    size="small"
                                    sx={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)" }}
                                  />
                                )}
                                {decklist.placement && (
                                  <Chip
                                    label={`${decklist.placement}${getOrdinalSuffix(decklist.placement)} Place`}
                                    size="small"
                                    color={decklist.placement <= 3 ? "primary" : "default"}
                                  />
                                )}
                              </Box>
                              {!showSessionDividers && (
                                <>
                                  <Typography variant="body2" color="text.secondary">
                                    Session {decklist.sessionNumber}
                                  </Typography>
                                  {decklist.setName && (
                                    <Typography variant="caption" color="text.secondary">
                                      {decklist.setName}
                                    </Typography>
                                  )}
                                </>
                              )}
                            </Box>
                            <Chip
                              label={decklist.sessionComplete ? "Complete" : "Ongoing"}
                              color={decklist.sessionComplete ? "default" : "primary"}
                              size="small"
                            />
                          </Box>

                          {/* Deck Name */}
                          {editingDecklistId === decklist.id ? (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                              <TextField
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                placeholder="Deck Name"
                                size="small"
                                fullWidth
                                inputProps={{ maxLength: 255 }}
                              />
                              <IconButton
                                size="small"
                                onClick={() => handleSaveEdit(decklist.id)}
                                sx={{ color: "var(--success)" }}
                              >
                                <SaveIcon />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={handleCancelEdit}
                                sx={{ color: "var(--text-secondary)" }}
                              >
                                <CancelIcon />
                              </IconButton>
                            </Box>
                          ) : (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                              <Typography
                                variant="body1"
                                sx={{
                                  fontStyle: decklist.name ? "normal" : "italic",
                                  color: decklist.name ? "var(--text-primary)" : "var(--text-secondary)",
                                  flex: 1,
                                }}
                              >
                                {decklist.name || "Unnamed Deck"}
                              </Typography>
                              {decklist.sessionNumber === mostRecentSessionNumber &&
                                currentUser &&
                                (currentUser.isAdmin || decklist.playerId === currentUser.playerId) && (
                                <IconButton
                                  size="small"
                                  onClick={() => handleStartEdit(decklist.id, decklist.name)}
                                  sx={{ color: "var(--accent-primary)" }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              )}
                            </Box>
                          )}

                          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                            Submitted: {new Date(decklist.submittedAt).toLocaleDateString()}
                          </Typography>

                          {/* Image View */}
                          {viewMode === "image" && (
                            <>
                              <Box
                                sx={{
                                  width: "100%",
                                  display: "flex",
                                  justifyContent: "center",
                                  alignItems: "center",
                                  minHeight: "400px",
                                  backgroundColor: "var(--bg-tertiary)",
                                  borderRadius: 1,
                                  overflow: "hidden",
                                }}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={`/deck-images/${decklist.id}.png?t=${Date.now()}`}
                                  alt={`Decklist for ${decklist.playerName}`}
                                  style={{
                                    width: "100%",
                                    height: "auto",
                                    display: "block",
                                  }}
                                  onError={(e) => {
                                    // If image fails to load, show error message
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = "none";
                                    const parent = target.parentElement;
                                    if (parent) {
                                      parent.innerHTML = `<Typography variant="body2" sx={{ color: "var(--text-secondary)", textAlign: "center", p: 2 }}>Image not yet generated. Please finalize standings to generate images.${JSON.stringify(e)}</Typography>`;
                                    }
                                  }}
                                />
                              </Box>
                              {currentUser?.isAdmin && (
                                <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                                  <Button
                                    variant="outlined"
                                    startIcon={<RefreshIcon />}
                                    onClick={() => handleRegenerateDeck(decklist.id)}
                                    disabled={regeneratingDeckId === decklist.id}
                                    sx={{
                                      color: "var(--accent-primary)",
                                      borderColor: "var(--accent-primary)",
                                      "&:hover": {
                                        borderColor: "var(--accent-secondary)",
                                        backgroundColor: "var(--hover-light-grey)",
                                      },
                                    }}
                                  >
                                    {regeneratingDeckId === decklist.id ? "Regenerating..." : "Regenerate Image"}
                                  </Button>
                                </Box>
                              )}
                            </>
                          )}

                          {/* Text View */}
                          {viewMode === "text" && (
                            <>
                              {/* Main Deck */}
                              <Accordion defaultExpanded>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                  <Typography variant="subtitle2">
                                    Main Deck ({decklist.maindeck.length})
                                  </Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                  <Box sx={{ fontSize: "0.875rem" }}>
                                    {formatDeckSection(decklist.maindeck).map((card, idx) => (
                                      <Typography key={idx} variant="body2">
                                        {card}
                                      </Typography>
                                    ))}
                                  </Box>
                                </AccordionDetails>
                              </Accordion>

                              {/* Extra Deck */}
                              {decklist.extradeck.length > 0 && (
                                <Accordion>
                                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Typography variant="subtitle2">
                                      Extra Deck ({decklist.extradeck.length})
                                    </Typography>
                                  </AccordionSummary>
                                  <AccordionDetails>
                                    <Box sx={{ fontSize: "0.875rem" }}>
                                      {formatDeckSection(decklist.extradeck).map((card, idx) => (
                                        <Typography key={idx} variant="body2">
                                          {card}
                                        </Typography>
                                      ))}
                                    </Box>
                                  </AccordionDetails>
                                </Accordion>
                              )}

                              {/* Side Deck */}
                              {decklist.sidedeck.length > 0 && (
                                <Accordion>
                                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Typography variant="subtitle2">
                                      Side Deck ({decklist.sidedeck.length})
                                    </Typography>
                                  </AccordionSummary>
                                  <AccordionDetails>
                                    <Box sx={{ fontSize: "0.875rem" }}>
                                      {formatDeckSection(decklist.sidedeck).map((card, idx) => (
                                        <Typography key={idx} variant="body2">
                                          {card}
                                        </Typography>
                                      ))}
                                    </Box>
                                  </AccordionDetails>
                                </Accordion>
                              )}
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            ))}
          </>
        );
      })()}
    </Box>
  );
}
