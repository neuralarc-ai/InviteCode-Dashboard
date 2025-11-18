import { type ReactElement, useEffect } from 'react';
import { UsersTable } from '@/components/users-table';
import { useNewUsersNotification } from '@/hooks/use-new-users-notification';

export default function UsersScreen(): ReactElement {
  const { clearNewUsers } = useNewUsersNotification();

  useEffect(() => {
    // Clear new users notification when this page is visited
    void clearNewUsers();
  }, [clearNewUsers]);

  return <UsersTable />;
}

