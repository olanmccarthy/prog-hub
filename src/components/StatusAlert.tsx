import { Alert, AlertProps } from '@mui/material';

export interface StatusAlertProps {
  message: string | null | undefined;
  severity: 'error' | 'success' | 'info' | 'warning';
  onClose?: () => void;
  sx?: AlertProps['sx'];
}

/**
 * Reusable status alert component with consistent styling
 * Automatically hides when message is null/undefined
 *
 * @example
 * // Basic usage
 * <StatusAlert message={error} severity="error" onClose={() => setError(null)} />
 * <StatusAlert message={success} severity="success" onClose={() => setSuccess(null)} />
 *
 * @example
 * // With custom styling
 * <StatusAlert
 *   message="Custom message"
 *   severity="warning"
 *   onClose={handleClose}
 *   sx={{ mt: 2 }}
 * />
 */
export function StatusAlert({ message, severity, onClose, sx }: StatusAlertProps) {
  if (!message) return null;

  return (
    <Alert
      severity={severity}
      onClose={onClose}
      sx={{
        mb: 2,
        ...sx
      }}
    >
      {message}
    </Alert>
  );
}

/**
 * Convenience wrapper for error alerts
 */
export function ErrorAlert({ message, onClose, sx }: Omit<StatusAlertProps, 'severity'>) {
  return <StatusAlert message={message} severity="error" onClose={onClose} sx={sx} />;
}

/**
 * Convenience wrapper for success alerts
 */
export function SuccessAlert({ message, onClose, sx }: Omit<StatusAlertProps, 'severity'>) {
  return <StatusAlert message={message} severity="success" onClose={onClose} sx={sx} />;
}

/**
 * Convenience wrapper for info alerts
 */
export function InfoAlert({ message, onClose, sx }: Omit<StatusAlertProps, 'severity'>) {
  return <StatusAlert message={message} severity="info" onClose={onClose} sx={sx} />;
}

/**
 * Convenience wrapper for warning alerts
 */
export function WarningAlert({ message, onClose, sx }: Omit<StatusAlertProps, 'severity'>) {
  return <StatusAlert message={message} severity="warning" onClose={onClose} sx={sx} />;
}
