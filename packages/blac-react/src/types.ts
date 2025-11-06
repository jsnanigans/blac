import type { StateContainer, ExtractState } from '@blac/core';
import type { RefObject } from 'react';

export interface UseBlocOptions<TBloc extends StateContainer<any>> {
  staticProps?: any;
  instanceId?: string | number;
  dependencies?: (state: ExtractState<TBloc>, bloc: TBloc) => unknown[];
  autoTrack?: boolean;
  onMount?: (bloc: TBloc) => void;
  onUnmount?: (bloc: TBloc) => void;
}

export interface UseBlocOptionsWithDependencies<
  TBloc extends StateContainer<any>,
> extends UseBlocOptions<TBloc> {
  dependencies: (state: ExtractState<TBloc>, bloc: TBloc) => unknown[];
  autoTrack?: never;
}

export type UseBlocReturn<TBloc extends StateContainer<any>> = [
  ExtractState<TBloc>,
  TBloc,
  RefObject<ComponentRef>,
];

export type ComponentRef = {
  __blocInstanceId?: string;
  __bridge?: any;
};
