import { Redirect } from 'expo-router';

import { useAuth } from '@/store/auth';

/** "/" has no screen of its own; send people to the right starting point. */
export default function Index() {
  const signedIn = useAuth((state) => state.status === 'signedIn');
  return <Redirect href={signedIn ? '/today' : '/sign-in'} />;
}
