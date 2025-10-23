"use client";

import { createTheme } from "@mui/material/styles";

// Create a custom MUI theme for dark mode with comprehensive component overrides
export const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#007acc", // var(--accent-primary)
      light: "#1a8fd9", // var(--accent-secondary)
      dark: "#005a9e", // var(--accent-blue-dark)
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#1a8fd9",
      contrastText: "#ffffff",
    },
    background: {
      default: "#1e1e1e", // var(--bg-primary)
      paper: "#2d2d2d", // var(--bg-elevated)
    },
    text: {
      primary: "#ffffff", // var(--text-primary)
      secondary: "#ffffff", // var(--text-secondary)
    },
    divider: "#3e3e42", // var(--border-color)
    success: {
      main: "#4caf50", // var(--success-green)
    },
    warning: {
      main: "#ff9800", // var(--warning-orange)
    },
    error: {
      main: "#f44336", // var(--error-red)
      dark: "#cc0000", // var(--error-red-dark)
    },
    info: {
      main: "#75beff", // var(--info)
    },
  },
  typography: {
    allVariants: {
      color: "#ffffff",
    },
    h3: {
      color: "#ffffff",
      fontWeight: "bold",
    },
    h4: {
      color: "#ffffff",
      fontWeight: "bold",
    },
    h5: {
      color: "#ffffff",
      fontWeight: 600,
    },
    h6: {
      color: "#ffffff",
      fontWeight: 600,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#1e1e1e",
          color: "#ffffff",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: "#252526", // var(--bg-secondary)
          color: "#ffffff",
          border: "1px solid #3e3e42", // var(--border-color)
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: "#2d2d2d", // var(--bg-elevated)
          color: "#ffffff",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          color: "#ffffff",
          "&:hover": {
            backgroundColor: "#2d2d30", // var(--bg-tertiary)
          },
        },
        contained: {
          backgroundColor: "#007acc",
          color: "#ffffff",
          "&:hover": {
            backgroundColor: "#1a8fd9",
          },
          "&:disabled": {
            backgroundColor: "#2d2d2d", // var(--grey-300)
            color: "rgba(255, 255, 255, 0.5)",
          },
        },
      },
      variants: [
        {
          props: { variant: "contained", color: "error" },
          style: {
            backgroundColor: "#cc0000", // var(--error-red-dark)
            "&:hover": {
              backgroundColor: "#ff4444",
            },
          },
        },
      ],
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: "#ffffff",
          "&:hover": {
            backgroundColor: "#2d2d30", // var(--bg-tertiary)
            color: "#007acc", // var(--accent-primary)
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: "#ffffff",
          "&.Mui-focused": {
            color: "#007acc",
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiInputLabel-root": {
            color: "#ffffff",
          },
          "& .MuiInputBase-input": {
            color: "#ffffff",
          },
          "& .MuiOutlinedInput-root": {
            "& fieldset": {
              borderColor: "#3e3e42", // var(--border-color)
            },
            "&:hover fieldset": {
              borderColor: "#ffffff",
            },
            "&.Mui-focused fieldset": {
              borderColor: "#007acc", // var(--accent-primary)
            },
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          color: "#ffffff",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "#3e3e42",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "#ffffff",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#007acc",
          },
        },
        input: {
          color: "#ffffff",
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          color: "#ffffff",
        },
        icon: {
          color: "#ffffff",
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          color: "#ffffff",
          "&:hover": {
            backgroundColor: "#2d2d30",
          },
          "&.Mui-selected": {
            backgroundColor: "#2d2d30",
            "&:hover": {
              backgroundColor: "#3e3e42",
            },
          },
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: "#3a3a3a", // var(--grey-100)
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: "#252526", // var(--bg-secondary)
          border: "1px solid #3e3e42", // var(--border-color)
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          color: "#ffffff",
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          color: "#ffffff",
        },
      },
    },
    MuiDialogContentText: {
      styleOverrides: {
        root: {
          color: "#ffffff",
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          backgroundColor: "#252526",
          border: "1px solid #3e3e42",
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          color: "#ffffff",
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: "#252526",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:hover": {
            backgroundColor: "#2d2d30",
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          color: "#ffffff",
          borderColor: "#3e3e42",
        },
        head: {
          color: "#ffffff",
          fontWeight: "bold",
          backgroundColor: "#252526",
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: "#ffffff",
          "&.Mui-checked": {
            color: "#007acc", // var(--accent-primary)
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          color: "#ffffff",
        },
        filled: {
          backgroundColor: "#2d2d2d",
        },
      },
      variants: [
        {
          props: { variant: "filled", color: "primary" },
          style: {
            backgroundColor: "#007acc",
            color: "#ffffff",
            fontWeight: "bold",
          },
        },
      ],
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          color: "rgba(255, 255, 255, 0.7)",
          borderColor: "rgba(255, 255, 255, 0.23)",
          "&:hover": {
            backgroundColor: "rgba(255, 255, 255, 0.08)",
          },
          "&.Mui-selected": {
            backgroundColor: "#007acc",
            color: "#ffffff",
            borderColor: "#007acc",
            "&:hover": {
              backgroundColor: "#005a9e",
            },
          },
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: {
          backgroundColor: "transparent",
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          backgroundColor: "#252526",
          color: "#ffffff",
          "&:before": {
            backgroundColor: "#3e3e42",
          },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          color: "#ffffff",
        },
      },
    },
    MuiAccordionDetails: {
      styleOverrides: {
        root: {
          color: "#ffffff",
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          color: "#ffffff",
        },
        standardSuccess: {
          backgroundColor: "#2d2d2d",
          color: "#4caf50",
        },
        standardError: {
          backgroundColor: "#2d2d2d",
          color: "#f44336",
        },
        standardWarning: {
          backgroundColor: "#2d2d2d",
          color: "#ff9800",
        },
        standardInfo: {
          backgroundColor: "#2d2d2d",
          color: "#75beff",
        },
      },
    },
    MuiCircularProgress: {
      styleOverrides: {
        root: {
          color: "#007acc",
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          backgroundColor: "#3e3e42",
        },
        bar: {
          backgroundColor: "#007acc",
        },
      },
    },
    MuiSvgIcon: {
      styleOverrides: {
        root: {
          color: "#ffffff",
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: "#3e3e42",
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          color: "#ffffff",
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          color: "#ffffff",
        },
        secondary: {
          color: "rgba(255, 255, 255, 0.7)",
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          "&:hover": {
            backgroundColor: "#2d2d30",
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: "#2d2d2d",
          color: "#ffffff",
          border: "1px solid #3e3e42",
        },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: {
          backgroundColor: "#007acc",
          color: "#ffffff",
        },
      },
    },
  },
});
