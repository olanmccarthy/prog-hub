import { Box, Container } from "@mui/material";
import { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false;
  padding?: number;
}

export default function PageContainer({
  children,
  maxWidth = "lg",
  padding = 3
}: PageContainerProps) {
  return (
    <Container maxWidth={maxWidth}>
      <Box sx={{ p: padding }}>
        {children}
      </Box>
    </Container>
  );
}
