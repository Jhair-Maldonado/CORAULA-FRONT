// src/app/login/padre/page.tsx
import { redirect } from 'next/navigation';

export default function LoginPadrePage() {
  redirect('/login?rol=padre');
}
