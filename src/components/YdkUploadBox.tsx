"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Paper,
  Typography,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import WarningIcon from "@mui/icons-material/Warning";
import { parseYdkFromFile, type ParsedDeck } from "@lib/ydkParser";
import {
  validateDeckAgainstBanlist,
  getValidationSummary,
  type BanlistData,
  type DeckValidationResult,
} from "@lib/deckValidator";

interface YdkUploadBoxProps {
  banlist: BanlistData | null;
  sessionNumber?: number;
  onValidationComplete?: (
    deck: ParsedDeck,
    validation: DeckValidationResult
  ) => void;
  showSubmitButton?: boolean;
  onSubmit?: (deck: ParsedDeck) => Promise<void>;
}

export default function YdkUploadBox({
  banlist,
  sessionNumber,
  onValidationComplete,
  showSubmitButton = false,
  onSubmit,
}: YdkUploadBoxProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedDeck, setParsedDeck] = useState<ParsedDeck | null>(null);
  const [validation, setValidation] = useState<DeckValidationResult | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setParsedDeck(null);
    setValidation(null);
    setFileName(null);

    const parseResult = await parseYdkFromFile(file);

    if (!parseResult.success) {
      setError(parseResult.error || "Failed to parse .ydk file");
      return;
    }

    if (parseResult.deck) {
      setParsedDeck(parseResult.deck);
      setFileName(file.name);

      // Validate against banlist if available
      if (banlist) {
        const validationResult = validateDeckAgainstBanlist(
          parseResult.deck.maindeck,
          parseResult.deck.sidedeck,
          parseResult.deck.extradeck,
          banlist
        );
        setValidation(validationResult);

        if (onValidationComplete) {
          onValidationComplete(parseResult.deck, validationResult);
        }
      }
    }
  };

  const handleSubmit = async () => {
    if (!parsedDeck || !onSubmit) return;

    try {
      setSubmitting(true);
      setError(null);
      await onSubmit(parsedDeck);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit deck");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Paper
      sx={{
        p: 3,
        backgroundColor: "var(--bg-secondary)",
        border: "1px solid var(--border-color)",
      }}
    >
      <Typography variant="h6" sx={{ color: "var(--text-bright)", mb: 2 }}>
        Deck Validation
      </Typography>

      {sessionNumber && (
        <Typography
          variant="body2"
          sx={{ color: "var(--text-secondary)", mb: 2 }}
        >
          Checking against Session {sessionNumber} banlist
        </Typography>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
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
          <Chip label={fileName} sx={{ ml: 2, color: "var(--text-primary)" }} />
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
          <Typography
            variant="body2"
            sx={{ color: "var(--text-secondary)", mb: 1 }}
          >
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

      {validation && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            {validation.isLegal ? (
              <CheckCircleIcon sx={{ color: "#4caf50" }} />
            ) : (
              <ErrorIcon sx={{ color: "#f44336" }} />
            )}
            <Typography
              sx={{
                color: validation.isLegal ? "#4caf50" : "#f44336",
                fontWeight: "bold",
              }}
            >
              {getValidationSummary(validation)}
            </Typography>
          </Box>

          {validation.errors.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography
                variant="body2"
                sx={{ color: "#f44336", fontWeight: "bold", mb: 1 }}
              >
                Violations:
              </Typography>
              <List dense>
                {validation.errors.map((err, index) => (
                  <ListItem key={`error-${index}-${err.slice(0, 20)}`} sx={{ py: 0.5 }}>
                    <ErrorIcon
                      sx={{ color: "#f44336", fontSize: 20, mr: 1 }}
                    />
                    <ListItemText
                      primary={err}
                      sx={{ color: "var(--text-primary)" }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {validation.warnings.length > 0 && (
            <Box>
              <Typography
                variant="body2"
                sx={{ color: "#ff9800", fontWeight: "bold", mb: 1 }}
              >
                Notes:
              </Typography>
              <List dense>
                {validation.warnings.map((warning, index) => (
                  <ListItem key={`warning-${index}-${warning.slice(0, 20)}`} sx={{ py: 0.5 }}>
                    <WarningIcon
                      sx={{ color: "#ff9800", fontSize: 20, mr: 1 }}
                    />
                    <ListItemText
                      primary={warning}
                      sx={{ color: "var(--text-primary)" }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Box>
      )}

      {showSubmitButton && onSubmit && parsedDeck && (
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || (validation !== null && !validation.isLegal)}
          sx={{
            backgroundColor:
              validation !== null && !validation.isLegal
                ? "var(--grey-300)"
                : "var(--accent-primary)",
            "&:hover": {
              backgroundColor:
                validation !== null && !validation.isLegal
                  ? "var(--grey-300)"
                  : "var(--accent-hover)",
            },
            "&:disabled": {
              backgroundColor: "var(--grey-300)",
              color: "var(--text-secondary)",
            },
          }}
        >
          {submitting ? "Submitting..." : "Submit Deck"}
        </Button>
      )}
    </Paper>
  );
}
