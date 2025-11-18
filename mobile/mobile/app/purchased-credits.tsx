import { type ReactElement, useEffect } from 'react';
import { PurchasedCreditsTable } from '@/components/purchased-credits-table';
import { useNewUsersNotification } from '@/hooks/use-new-users-notification';

export default function PurchasedCreditsScreen(): ReactElement {
  const { clearNewPaidUsers } = useNewUsersNotification();

  useEffect(() => {
    // Clear new paid users notification when this page is visited
    void clearNewPaidUsers();
  }, [clearNewPaidUsers]);

  return <PurchasedCreditsTable />;
}

