import type { ExtractState } from '@blac/core';
import type { RefObject } from 'react';

export interface UseBlocOptions<TBloc> {
  staticProps?: any;
  instanceId?: string | number;
  dependencies?: (state: ExtractState<TBloc>, bloc: TBloc) => unknown[];
  autoTrack?: boolean;
  disableGetterCache?: boolean;
  onMount?: (bloc: TBloc) => void;
  onUnmount?: (bloc: TBloc) => void;
}

export interface UseBlocOptionsWithDependencies<TBloc>
  extends UseBlocOptions<TBloc> {
  dependencies: (state: ExtractState<TBloc>, bloc: TBloc) => unknown[];
  autoTrack?: never;
}

export type UseBlocReturn<TBloc> = [
  ExtractState<TBloc>,
  TBloc,
  RefObject<ComponentRef>,
];

export type ComponentRef = {
  __blocInstanceId?: string;
  __bridge?: any;
};
