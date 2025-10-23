import { Box, CircularProgress } from "@mui/material";

interface LoadingBoxProps {
  minHeight?: string | number;
}

export default function LoadingBox({ minHeight = "400px" }: LoadingBoxProps) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight,
      }}
    >
      <CircularProgress />
    </Box>
  );
}
