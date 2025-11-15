import { redirect } from 'next/navigation';

export default function AccountIndex() {
  // Redirect straight to the Profile tab so the account entry point opens the profile UI
  redirect('/account/profile');
}
