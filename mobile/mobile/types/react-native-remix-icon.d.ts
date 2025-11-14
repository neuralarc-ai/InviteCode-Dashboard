declare module 'react-native-remix-icon' {
  import type { FC, ReactElement } from 'react';

  export type IconName = string;

  export interface RemixIconProps {
    readonly name: IconName;
    readonly size?: number | string;
    readonly color?: string;
    readonly fallback?: ReactElement | null;
    readonly [key: string]: unknown;
  }

  const RemixIcon: FC<RemixIconProps>;
  export default RemixIcon;
}

