import { Dialog, DialogTitle, DialogContent, DialogActions, DialogProps } from '@mui/material';
import { ReactNode } from 'react';

export interface StyledDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  maxWidth?: DialogProps['maxWidth'];
  fullWidth?: boolean;
}

/**
 * Reusable dialog component with consistent styling
 *
 * @example
 * // Basic usage
 * <StyledDialog
 *   open={open}
 *   onClose={handleClose}
 *   title="Add Player"
 * >
 *   <TextField label="Name" fullWidth />
 * </StyledDialog>
 *
 * @example
 * // With actions
 * <StyledDialog
 *   open={open}
 *   onClose={handleClose}
 *   title="Confirm Delete"
 *   actions={
 *     <>
 *       <SecondaryButton onClick={handleClose}>Cancel</SecondaryButton>
 *       <DangerButton onClick={handleDelete}>Delete</DangerButton>
 *     </>
 *   }
 * >
 *   Are you sure you want to delete this item?
 * </StyledDialog>
 */
export function StyledDialog({
  open,
  onClose,
  title,
  children,
  actions,
  maxWidth = 'sm',
  fullWidth = true,
}: StyledDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      PaperProps={{
        sx: {
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-primary)',
        },
      }}
    >
      <DialogTitle
        sx={{
          color: 'var(--text-bright)',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        {title}
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        {children}
      </DialogContent>
      {actions && (
        <DialogActions
          sx={{
            p: 2,
            borderTop: '1px solid var(--border-color)',
            gap: 1,
          }}
        >
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
}
