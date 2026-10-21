import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { APP_NAME, WELCOME_VIDEO_URL } from '@/lib/branding';

export default function WelcomeOverlay({ user }) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const handleClose = () => setVisible(false);

  const firstName = user?.full_name?.split(' ')[0];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-sky-950 via-sky-900 to-slate-950" />
      {WELCOME_VIDEO_URL && (
        <>
          <video
            src={WELCOME_VIDEO_URL}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50" />
        </>
      )}

      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <h1 className="text-3xl font-bold text-white md:text-4xl">
          {firstName ? `Bem-vindo, ${firstName}!` : 'Bem-vindo!'}
        </h1>
        <p className="mt-3 max-w-md text-sm text-sky-100/80 md:text-base">
          {APP_NAME}
        </p>
        <Button
          onClick={handleClose}
          size="lg"
          className="mt-8 h-11 bg-white text-sky-900 hover:bg-sky-100"
        >
          Entrar
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}