// src/app/(padres)/padre/hijos/page.tsx
'use client';

import React, { useState } from 'react';
import { usePadre } from '@/components/padres/PadreContext';
import { UserCircleIcon, CheckmarkCircle01Icon, Alert01Icon, ArrowRight01Icon, PencilEdit02Icon, StarIcon } from 'hugeicons-react';
import { EdicionHijoModal } from '@/components/padres/EdicionHijoModal';
import { HijoResumen } from '@/types/padre';
import HijosMatriculados from '../../../../../feature/padre/vistas/verHijos/hijosMatriculados';

export default function HijosPage() {

  return (
    <>
      <HijosMatriculados />
    </>
  );
}
