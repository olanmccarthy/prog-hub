'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';

interface Player {
  id: number;
  name: string;
}

interface UploadDecklistSectionProps {
  players: Player[];
  onUpload: (playerId: number, file: File) => Promise<{ success: boolean; error?: string }>;
}

export function UploadDecklistSection({ players, onUpload }: UploadDecklistSectionProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | ''>('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.ydk')) {
        setError('Please select a .ydk file');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
      setSuccess(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedPlayerId || !file) {
      setError('Please select a player and a deck file');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setSuccess(null);

      const result = await onUpload(selectedPlayerId as number, file);

      if (result.success) {
        setSuccess(`Deck uploaded successfully for ${players.find(p => p.id === selectedPlayerId)?.name}!`);
        setFile(null);
        setSelectedPlayerId('');
        // Reset file input
        const fileInput = document.getElementById('deck-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        setError(result.error || 'Failed to upload deck');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload deck');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Paper
      sx={{
        p: 3,
        mb: 3,
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
      }}
    >
      <Typography variant="h6" sx={{ color: 'var(--text-bright)', mb: 2 }}>
        Upload Player Decklist
      </Typography>

      <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 3 }}>
        Upload a .ydk file to replace a player&apos;s decklist for the active session.
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

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <FormControl fullWidth>
          <InputLabel sx={{ color: 'var(--text-secondary)' }}>Select Player</InputLabel>
          <Select
            value={selectedPlayerId}
            onChange={(e) => setSelectedPlayerId(e.target.value as number)}
            label="Select Player"
            sx={{
              color: 'var(--text-bright)',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'var(--border-color)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'var(--text-secondary)',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: 'var(--accent-primary)',
              },
            }}
          >
            {players.map((player) => (
              <MenuItem key={player.id} value={player.id}>
                {player.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box>
          <input
            id="deck-file-input"
            type="file"
            accept=".ydk"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <label htmlFor="deck-file-input">
            <Button
              component="span"
              variant="outlined"
              startIcon={<UploadFileIcon />}
              fullWidth
              sx={{
                color: 'var(--text-bright)',
                borderColor: 'var(--border-color)',
                '&:hover': {
                  borderColor: 'var(--accent-primary)',
                  backgroundColor: 'var(--bg-tertiary)',
                },
              }}
            >
              {file ? file.name : 'Choose .ydk File'}
            </Button>
          </label>
        </Box>

        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={!selectedPlayerId || !file || uploading}
          startIcon={uploading ? <CircularProgress size={20} /> : <UploadFileIcon />}
          sx={{
            backgroundColor: 'primary.main',
            '&:hover': {
              backgroundColor: 'primary.dark',
            },
            '&:disabled': {
              backgroundColor: 'var(--grey-300)',
              color: 'var(--text-secondary)',
            },
          }}
        >
          {uploading ? 'Uploading...' : 'Upload Deck'}
        </Button>
      </Box>
    </Paper>
  );
}
