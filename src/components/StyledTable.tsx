import {
  Table,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  TableCellProps,
} from '@mui/material';
import { ReactNode } from 'react';

export interface StyledTableColumn {
  label: string;
  align?: TableCellProps['align'];
  width?: string | number;
}

export interface StyledTableProps {
  columns: StyledTableColumn[];
  children: ReactNode;
  emptyMessage?: string;
  isEmpty?: boolean;
}

/**
 * Reusable table component with consistent styling
 *
 * @example
 * // Basic usage
 * <StyledTable
 *   columns={[
 *     { label: 'Name', align: 'left' },
 *     { label: 'Email', align: 'left' },
 *     { label: 'Actions', align: 'right' },
 *   ]}
 * >
 *   {players.map(player => (
 *     <TableRow key={player.id}>
 *       <TableCell>{player.name}</TableCell>
 *       <TableCell>{player.email}</TableCell>
 *       <TableCell align="right">
 *         <Button>Edit</Button>
 *       </TableCell>
 *     </TableRow>
 *   ))}
 * </StyledTable>
 *
 * @example
 * // With empty state
 * <StyledTable
 *   columns={columns}
 *   isEmpty={players.length === 0}
 *   emptyMessage="No players found"
 * >
 *   {players.map(player => (...))}
 * </StyledTable>
 */
export function StyledTable({
  columns,
  children,
  emptyMessage = 'No items found',
  isEmpty = false,
}: StyledTableProps) {
  return (
    <TableContainer
      component={Paper}
      sx={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
      }}
    >
      <Table>
        <TableHead>
          <TableRow
            sx={{
              backgroundColor: 'var(--bg-tertiary)',
            }}
          >
            {columns.map((col, idx) => (
              <TableCell
                key={idx}
                align={col.align || 'left'}
                sx={{
                  color: 'var(--text-bright)',
                  fontWeight: 'bold',
                  width: col.width,
                }}
              >
                {col.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {isEmpty ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                align="center"
                sx={{
                  color: 'var(--text-secondary)',
                  py: 4,
                }}
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            children
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
