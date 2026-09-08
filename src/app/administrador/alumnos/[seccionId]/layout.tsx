import React from 'react';
import { GradosSidebar } from '../../components/GradosSidebar';

export default function SeccionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full h-full overflow-hidden">
      <GradosSidebar />
      <div className="flex-1 flex flex-col h-full bg-canvas">
        {children}
      </div>
    </div>
  );
}
