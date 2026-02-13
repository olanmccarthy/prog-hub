import { Button, ButtonProps } from '@mui/material';

/**
 * Primary action button with consistent styling
 * Use for main actions like "Submit", "Save", "Create"
 */
export function PrimaryButton(props: ButtonProps) {
  return (
    <Button
      {...props}
      variant="contained"
      sx={{
        backgroundColor: 'var(--accent-primary)',
        color: 'var(--text-bright)',
        '&:hover': {
          backgroundColor: 'var(--accent-secondary)',
        },
        '&:disabled': {
          backgroundColor: 'var(--grey-300)',
          color: 'var(--text-secondary)',
        },
        ...props.sx,
      }}
    />
  );
}

/**
 * Secondary action button with consistent styling
 * Use for secondary actions like "Cancel", "Back", "Close"
 */
export function SecondaryButton(props: ButtonProps) {
  return (
    <Button
      {...props}
      variant="outlined"
      sx={{
        color: 'var(--text-primary)',
        borderColor: 'var(--border-color)',
        '&:hover': {
          backgroundColor: 'var(--bg-tertiary)',
          borderColor: 'var(--accent-primary)',
        },
        ...props.sx,
      }}
    />
  );
}

/**
 * Danger/destructive action button with consistent styling
 * Use for destructive actions like "Delete", "Remove", "Clear"
 */
export function DangerButton(props: ButtonProps) {
  return (
    <Button
      {...props}
      variant="contained"
      sx={{
        backgroundColor: 'var(--error)',
        color: 'var(--text-bright)',
        '&:hover': {
          backgroundColor: '#d63f3f',
        },
        '&:disabled': {
          backgroundColor: 'var(--grey-300)',
          color: 'var(--text-secondary)',
        },
        ...props.sx,
      }}
    />
  );
}

/**
 * Text button with consistent styling
 * Use for tertiary actions or inline links
 */
export function TextButton(props: ButtonProps) {
  return (
    <Button
      {...props}
      variant="text"
      sx={{
        color: 'var(--accent-primary)',
        '&:hover': {
          backgroundColor: 'var(--hover-light-grey)',
        },
        ...props.sx,
      }}
    />
  );
}
