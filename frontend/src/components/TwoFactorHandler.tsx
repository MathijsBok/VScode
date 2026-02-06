import { useEffect, useState } from 'react';
import TwoFactorRequiredModal from './TwoFactorRequiredModal';

export default function TwoFactorHandler() {
  const [showModal, setShowModal] = useState(false);
  const [gracePeriodEnd, setGracePeriodEnd] = useState<string | undefined>();

  useEffect(() => {
    const handleTwoFactorRequired = (event: Event) => {
      const customEvent = event as CustomEvent<{ gracePeriodEnd?: string }>;
      console.log('[TwoFactorHandler] 2FA required event received:', customEvent.detail);
      setGracePeriodEnd(customEvent.detail?.gracePeriodEnd);
      setShowModal(true);
    };

    window.addEventListener('twoFactorRequired', handleTwoFactorRequired);

    return () => {
      window.removeEventListener('twoFactorRequired', handleTwoFactorRequired);
    };
  }, []);

  if (!showModal) {
    return null;
  }

  return <TwoFactorRequiredModal gracePeriodEnd={gracePeriodEnd} />;
}
