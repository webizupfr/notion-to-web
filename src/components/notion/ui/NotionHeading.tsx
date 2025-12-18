import type { ReactNode } from "react";

import { Heading } from "@/components/ui/Heading";

interface NotionHeadingProps {
  id?: string;
  level: 1 | 2 | 3;
  children: ReactNode;
}

export function NotionHeading({ id, level, children }: NotionHeadingProps) {
  return (
    <div className="notion-heading">
      <Heading id={id} level={level}>
        {children}
      </Heading>
    </div>
  );
}
