"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Chip,
  TextField,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { submitDecklist, getCurrentSession, getMyDecklist } from "./actions";
import { parseYdkFromFile, type ParsedDeck } from "@lib/ydkParser";

export default function DecklistSubmissionPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sessionNumber, setSessionNumber] = useState<number | null>(null);
  const [hasExistingDecklist, setHasExistingDecklist] = useState(false);
  const [existingDecklistDate, setExistingDecklistDate] = useState<Date | null>(null);
  const [parsedDeck, setParsedDeck] = useState<ParsedDeck | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [deckName, setDeckName] = useState<string>("");

  useEffect(() => {
    fetchSessionInfo();
  }, []);

  const fetchSessionInfo = async () => {
    try {
      setLoading(true);
      const sessionResult = await getCurrentSession();

      if (sessionResult.success && sessionResult.sessionNumber) {
        setSessionNumber(sessionResult.sessionNumber);

        // Check if user has already submitted a decklist
        const decklistResult = await getMyDecklist();
        if (decklistResult.success && decklistResult.decklist) {
          setHasExistingDecklist(true);
          setExistingDecklistDate(decklistResult.decklist.submittedAt);
        }
      } else {
        setError(sessionResult.error || "No active session found");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load session");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);
    setParsedDeck(null);
    setFileName(null);

    const parseResult = await parseYdkFromFile(file);

    if (!parseResult.success) {
      setError(parseResult.error || "Failed to parse .ydk file");
      return;
    }

    if (parseResult.deck) {
      setParsedDeck(parseResult.deck);
      setFileName(file.name);
      setSuccess("Deck file loaded successfully! Click submit to upload.");
    }
  };

  const handleSubmit = async () => {
    if (!parsedDeck) {
      setError("Please select a .ydk file first");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const result = await submitDecklist(
        parsedDeck.maindeck,
        parsedDeck.sidedeck,
        parsedDeck.extradeck,
        deckName.trim() || undefined
      );

      if (result.success) {
        setSuccess(
          hasExistingDecklist
            ? "Decklist updated successfully!"
            : "Decklist submitted successfully!"
        );
        setParsedDeck(null);
        setFileName(null);
        // Refresh to check if decklist now exists
        await fetchSessionInfo();
      } else {
        setError(result.error || "Failed to submit decklist");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit decklist");
    } finally {
      setSubmitting(false);
    }
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
    <Box sx={{ p: 3, maxWidth: 800, mx: "auto" }}>
      <Typography variant="h4" sx={{ mb: 3, color: "var(--text-bright)" }}>
        Decklist Submission
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Paper
        sx={{
          p: 3,
          backgroundColor: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
        }}
      >
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ color: "var(--text-bright)", mb: 1 }}>
            Session {sessionNumber}
          </Typography>

          {hasExistingDecklist && existingDecklistDate && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <CheckCircleIcon sx={{ color: "#4caf50" }} />
              <Typography sx={{ color: "#4caf50" }}>
                Decklist already submitted on{" "}
                {new Date(existingDecklistDate).toLocaleString()}
              </Typography>
            </Box>
          )}

          <Typography
            variant="body2"
            sx={{ color: "var(--text-secondary)", mb: 2 }}
          >
            {hasExistingDecklist
              ? "You can update your decklist by uploading a new .ydk file."
              : "Upload your final decklist for the current session as a .ydk file."}
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <TextField
            label="Deck Name (Optional)"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            fullWidth
            placeholder="e.g., Blue-Eyes Deck, Tearlaments, etc."
            sx={{ mb: 2 }}
            inputProps={{ maxLength: 255 }}
          />

          <Button
            variant="contained"
            component="label"
            startIcon={<UploadFileIcon />}
            sx={{
              backgroundColor: "var(--accent-primary)",
              "&:hover": {
                backgroundColor: "var(--accent-hover)",
              },
            }}
          >
            Select .ydk File
            <input
              type="file"
              hidden
              accept=".ydk"
              onChange={handleFileChange}
            />
          </Button>

          {fileName && (
            <Chip
              label={fileName}
              sx={{ ml: 2, color: "var(--text-primary)" }}
            />
          )}
        </Box>

        {parsedDeck && (
          <Box
            sx={{
              mb: 3,
              p: 2,
              backgroundColor: "var(--bg-tertiary)",
              borderRadius: 1,
            }}
          >
            <Typography variant="body2" sx={{ color: "var(--text-secondary)", mb: 1 }}>
              <strong>Deck Summary:</strong>
            </Typography>
            <Typography sx={{ color: "var(--text-primary)" }}>
              Main Deck: {parsedDeck.maindeck.length} cards
            </Typography>
            <Typography sx={{ color: "var(--text-primary)" }}>
              Extra Deck: {parsedDeck.extradeck.length} cards
            </Typography>
            <Typography sx={{ color: "var(--text-primary)" }}>
              Side Deck: {parsedDeck.sidedeck.length} cards
            </Typography>
          </Box>
        )}

        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!parsedDeck || submitting}
          sx={{
            backgroundColor: parsedDeck
              ? "var(--accent-primary)"
              : "var(--grey-300)",
            "&:hover": {
              backgroundColor: parsedDeck
                ? "var(--accent-hover)"
                : "var(--grey-300)",
            },
            "&:disabled": {
              backgroundColor: "var(--grey-300)",
              color: "var(--text-secondary)",
            },
          }}
        >
          {submitting ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Submitting...
            </>
          ) : hasExistingDecklist ? (
            "Update Decklist"
          ) : (
            "Submit Decklist"
          )}
        </Button>

        <Box sx={{ mt: 3, pt: 2, borderTop: "1px solid var(--border-color)" }}>
          <Typography
            variant="body2"
            sx={{ color: "var(--text-secondary)", mb: 1 }}
          >
            <strong>Requirements:</strong>
          </Typography>
          <Typography variant="body2" sx={{ color: "var(--text-secondary)" }}>
            • Main Deck: 40-60 cards
          </Typography>
          <Typography variant="body2" sx={{ color: "var(--text-secondary)" }}>
            • Extra Deck: 0-15 cards
          </Typography>
          <Typography variant="body2" sx={{ color: "var(--text-secondary)" }}>
            • Side Deck: 0-15 cards
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
