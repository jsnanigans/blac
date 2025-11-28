import type { ExtractState } from '@blac/core';
import type { RefObject } from 'react';

export interface UseBlocOptions<TBloc, TProps = any> {
  props?: TProps;
  instanceId?: string | number;
  dependencies?: (state: ExtractState<TBloc>, bloc: TBloc) => unknown[];
  autoTrack?: boolean;
  disableGetterCache?: boolean;
  onMount?: (bloc: TBloc) => void;
  onUnmount?: (bloc: TBloc) => void;
}

export interface UseBlocOptionsWithDependencies<TBloc, TProps = any>
  extends UseBlocOptions<TBloc, TProps> {
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
